import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ValidationResult } from "../modules/validation/XmlValidatorService";
import { runWorkerValidation } from "../modules/validation/WorkerClient";
import { StorageService } from "../modules/data/StorageService";
import { AppSettings, DEFAULT_SETTINGS } from "../types";
import "./index.css";

const translateErrorMessage = (
  code: string,
  fallbackMessage: string,
): string => {
  switch (code) {
    case "RuleRegistroANSConfirmacao":
      return "O Registro da ANS da operadora está ausente no cabeçalho do arquivo.";
    case "RuleCarteiraBeneficiarioCardinalidade":
      return "A guia possui um paciente sem o número da carteirinha preenchido.";
    case "RuleCarteiraMaxLengthRestricao":
      return "A carteirinha do paciente possui mais de 20 dígitos. Corrija no cadastro do paciente.";
    case "RuleGuiaPrestadorMaxLengthRestricao":
      return "O número da guia gerada pelo seu sistema excedeu o limite máximo de 20 caracteres.";
    case "RuleAtendimentoRNDominioEnum":
      return "O campo 'Recém-Nascido' está inválido. Verifique o cadastro da guia, ele deve conter apenas 'S' (Sim) ou 'N' (Não).";
    case "FUTURE_DATE":
      return "A data do atendimento não pode ser no futuro.";
    default:
      return fallbackMessage;
  }
};

const Popup = () => {
  const [activeTab, setActiveTab] = useState<"verify" | "settings">("verify");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false); // Enterprise Loading State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isHoveringFile, setIsHoveringFile] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    StorageService.getSettings().then((s) => {
      setSettings(s);
    });
  };

  const handleSettingChange = (key: keyof AppSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key as keyof AppSettings],
    };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const toggleTheme = () => {
    const newTheme: "light" | "dark" =
      settings.theme === "dark" ? "light" : "dark";
    const newSettings = { ...settings, theme: newTheme };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    // Enterprise V2.1: Stream Mode (Vision Item 11)
    // We no longer read the file in Main Thread. We pass the File handle to Worker.
    try {
      const validation = await runWorkerValidation(file, settings);
      setResult(validation);

      await StorageService.incrementUsage();
      loadSettings();
    } catch (error) {
      console.error("Worker Error:", error);
      setResult({
        isValid: false,
        errors: [
          { code: "WORKER_FAIL", message: "Falha no Validador (Thread)" },
        ],
        message: "Erro Interno",
      });
    } finally {
      setLoading(false);
    }
  };

  // Feature: Download Report (Priority 10)
  const downloadReport = () => {
    if (!result) return;
    const reportContent = `
RELATÓRIO DE VALIDAÇÃO TISS GUARD
------------------------------------------------
Data: ${new Date().toLocaleString()}
Status: ${result.isValid ? "APROVADO" : "REPROVADO"}
Mensagem: ${result.message}

DETALHAMENTO:
${result.errors.map((e) => `[${e.code}] ${e.message} ${e.location ? `(Local: ${e.location})` : ""}`).join("\n")}
------------------------------------------------
Gerado por TISS Guard Enterprise
        `;
    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-tiss-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isDark = settings.theme === "dark";

  return (
    <div
      className={`w-[400px] h-[600px] flex flex-col font-sans transition-colors duration-500 overflow-hidden relative
            ${isDark ? "bg-[#0B1121] text-slate-100" : "bg-[#F1F5F9] text-slate-800"}`}
    >
      {/* Background Gradients - Static & Subtle */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div
          className={`absolute -top-20 -left-20 w-80 h-80 rounded-full mix-blend-multiply filter blur-[80px] opacity-25
                    ${isDark ? "bg-indigo-900/60" : "bg-blue-300/60"}`}
        ></div>
        <div
          className={`absolute top-0 -right-20 w-80 h-80 rounded-full mix-blend-multiply filter blur-[80px] opacity-25
                    ${isDark ? "bg-violet-900/60" : "bg-purple-300/60"}`}
        ></div>
      </div>

      {/* Header */}
      <header
        className={`px-6 py-5 z-20 relative transition-all duration-300 backdrop-blur-xl border-b shadow-sm
                ${isDark ? "bg-[#1e293b]/70 border-slate-700/60 shadow-black/20" : "bg-white/80 border-slate-200/80 shadow-slate-200/50"}`}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <img
                src="/icons/icon48.png"
                alt="Logo"
                className="relative w-10 h-10 rounded-xl shadow-md"
              />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                TISS Guard
              </h1>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 border backdrop-blur-sm shadow-sm
                            ${
                              isDark
                                ? "bg-slate-800/80 border-slate-600 text-amber-400 hover:bg-slate-700 hover:text-amber-300 shadow-black/30"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 shadow-slate-200"
                            }`}
            title={isDark ? "Modo Claro" : "Modo Escuro"}
          >
            {isDark ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div
          className={`flex p-1.5 rounded-xl relative transition-all border
                    ${isDark ? "bg-[#0f172a] border-slate-700/80" : "bg-slate-100 border-slate-200/80 shadow-inner"}`}
        >
          <div
            className={`absolute top-1.5 bottom-1.5 rounded-lg transition-all duration-300 ease-out z-0 shadow
                        ${
                          isDark
                            ? "bg-slate-700 border border-slate-600 shadow-black/40"
                            : "bg-white border border-slate-200/60 shadow-slate-200"
                        }`}
            style={{
              left: activeTab === "verify" ? "6px" : "50%",
              width: "calc(50% - 9px)",
              transform:
                activeTab === "settings" ? "translateX(3px)" : "translateX(0)",
            }}
          />
          <button
            onClick={() => setActiveTab("verify")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors duration-200 z-10 relative
                            ${
                              activeTab === "verify"
                                ? isDark
                                  ? "text-white"
                                  : "text-blue-700"
                                : isDark
                                  ? "text-slate-400 hover:text-slate-300"
                                  : "text-slate-500 hover:text-slate-700"
                            }`}
          >
            Verificar
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors duration-200 z-10 relative
                            ${
                              activeTab === "settings"
                                ? isDark
                                  ? "text-white"
                                  : "text-blue-700"
                                : isDark
                                  ? "text-slate-400 hover:text-slate-300"
                                  : "text-slate-500 hover:text-slate-700"
                            }`}
          >
            Opções
          </button>
        </div>
      </header>

      <main className="flex-grow p-6 overflow-y-auto custom-scrollbar relative z-10">
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
            <p className="text-indigo-900 text-xs font-bold animate-pulse">
              Processando XML...
            </p>
          </div>
        )}
        {activeTab === "verify" && (
          <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div
              className="relative group cursor-pointer"
              onMouseEnter={() => setIsHoveringFile(true)}
              onMouseLeave={() => setIsHoveringFile(false)}
            >
              <input
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
              />

              {/* Hover Border Highlight */}
              <div
                className={`absolute -inset-[1px] bg-blue-500/30 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-300`}
              ></div>

              <div
                className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300
                                ${
                                  isHoveringFile
                                    ? isDark
                                      ? "border-transparent bg-[#1e293b] scale-[1.01] shadow-2xl"
                                      : "border-transparent bg-white scale-[1.01] shadow-xl"
                                    : isDark
                                      ? "border-slate-700/60 bg-[#1e293b]/50 hover:bg-[#1e293b]"
                                      : "border-slate-300/80 bg-white/60 hover:bg-white shadow-sm"
                                }
                                `}
              >
                <div
                  className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 text-3xl transition-transform duration-300
                                    ${
                                      isDark
                                        ? "bg-gradient-to-br from-slate-700 to-slate-800 text-white border border-slate-600 shadow-black/40"
                                        : "bg-gradient-to-br from-blue-50 to-white text-blue-600 border border-blue-100 shadow-blue-100"
                                    }`}
                >
                  📂
                </div>
                <h3
                  className={`font-bold text-lg mb-1 transition-colors ${isHoveringFile ? "text-blue-600" : isDark ? "text-slate-200" : "text-slate-700"}`}
                >
                  Arraste seu XML
                </h3>
                <p
                  className={`text-xs font-medium tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  ou clique para selecionar
                </p>
              </div>
            </div>

            {result && (
              <div
                className={`mt-6 rounded-2xl p-0.5 relative animate-in zoom-in-95 duration-500 shadow-xl
                                ${
                                  result.isValid
                                    ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/20"
                                    : "bg-gradient-to-br from-red-400 to-rose-500 shadow-red-500/20"
                                }`}
              >
                <div
                  className={`rounded-[14px] p-5 h-full backdrop-blur-3xl
                                    ${isDark ? "bg-[#0f172a]" : "bg-white"}`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg shrink-0
                                            ${
                                              result.isValid
                                                ? isDark
                                                  ? "bg-emerald-500/10 text-emerald-400 shadow-emerald-900/20"
                                                  : "bg-emerald-50 text-emerald-600 shadow-emerald-100"
                                                : isDark
                                                  ? "bg-red-500/10 text-red-400 shadow-red-900/20"
                                                  : "bg-red-50 text-red-600 shadow-red-100"
                                            }`}
                    >
                      {result.isValid ? "✓" : "!"}
                    </div>
                    <div>
                      <h3
                        className={`font-bold text-lg leading-tight mb-0.5 ${
                          result.isValid
                            ? isDark
                              ? "text-emerald-400"
                              : "text-slate-800"
                            : isDark
                              ? "text-red-400"
                              : "text-slate-800"
                        }`}
                      >
                        {result.message}
                      </h3>
                      {result.isValid && (
                        <p
                          className={`text-xs font-semibold uppercase tracking-wider opacity-80 ${isDark ? "text-emerald-500" : "text-emerald-600"}`}
                        >
                          Estrutura TISS Válida
                        </p>
                      )}
                    </div>
                  </div>

                  {!result.isValid && (
                    <div
                      className={`rounded-xl p-3 max-h-[220px] overflow-y-auto custom-scrollbar border
                                            ${isDark ? "bg-slate-950/50 border-red-900/30" : "bg-slate-50 border-red-100"}`}
                    >
                      <ul className="space-y-2.5">
                        {result.errors.map((error, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span className="mt-0.5 shrink-0 select-none">
                              ❌
                            </span>
                            <span
                              className={`${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed`}
                            >
                              <strong className="block text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                                Ação Necessária:
                              </strong>
                              {translateErrorMessage(error.code, error.message)}
                              {error.location && (
                                <span className="block mt-0.5 text-[9px] font-mono opacity-50">
                                  {error.location}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Download Report Button */}
                  <button
                    onClick={downloadReport}
                    className={`w-full mt-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
                                            ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
                  >
                    📄 Baixar Relatório
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
            <h2
              className={`text-[10px] font-extrabold uppercase tracking-[0.2em] pl-1 mb-2 opacity-60 ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              Regras de Validação
            </h2>

            {[
              {
                key: "checkFutureDates",
                label: "Datas Futuras",
                desc: "Bloquear procedimentos com data maior que hoje",
              },
              {
                key: "checkNegativeValues",
                label: "Valores Negativos",
                desc: "Alertar se houver valores totais abaixo de zero",
              },
            ].map((item) => (
              <div
                key={item.key}
                className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] 
                                ${
                                  isDark
                                    ? "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600 hover:shadow-lg hover:shadow-black/20"
                                    : "bg-white/60 border-white/60 hover:bg-white/90 hover:shadow-lg hover:shadow-indigo-100/50 backdrop-blur-sm"
                                }`}
              >
                <div className="pr-4">
                  <span
                    className={`font-bold block text-sm mb-0.5 ${isDark ? "text-slate-200 group-hover:text-white" : "text-slate-700 group-hover:text-indigo-900"}`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`text-[11px] leading-relaxed block font-medium ${isDark ? "text-slate-400 group-hover:text-slate-300" : "text-slate-500 group-hover:text-slate-600"}`}
                  >
                    {item.desc}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings[item.key as keyof AppSettings] as boolean}
                    onChange={() =>
                      handleSettingChange(item.key as keyof AppSettings)
                    }
                  />
                  <div
                    className={`w-10 h-6 rounded-full peer transition-all duration-300 border
                                        ${
                                          isDark
                                            ? "bg-slate-700/50 border-slate-600 peer-focus:ring-2 peer-focus:ring-indigo-500/50 peer-checked:bg-indigo-600 peer-checked:border-indigo-500"
                                            : "bg-slate-200 border-slate-300 peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:bg-indigo-500 peer-checked:border-indigo-400"
                                        }`}
                  ></div>
                  <div className="absolute top-1 left-1 bg-white rounded-full h-4 w-4 transition-all duration-300 peer-checked:translate-x-full shadow-sm"></div>
                </label>
              </div>
            ))}

            <div className={`mt-6 text-center opacity-80`}>
              <p
                className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? "text-slate-600" : "text-slate-400"}`}
              >
                Versão 1.0.1 (Stable)
              </p>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  chrome.tabs.create({ url: "mailto:t.precivalli@gmail.com" });
                }}
                className={`block mt-2 text-xs font-semibold hover:underline ${isDark ? "text-indigo-400" : "text-blue-600"}`}
              >
                Precisa de integração customizada?
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Privacy Assurance Footer */}
      <div
        className={`text-[9px] text-center py-2.5 border-t backdrop-blur-sm z-20 relative
                ${isDark ? "border-slate-800/50 text-slate-500 bg-slate-900/30" : "border-slate-200/50 text-slate-400 bg-white/30"}`}
      >
        <p
          className="flex items-center justify-center gap-1.5"
          title="Seus dados nunca saem deste computador"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
          Processamento 100% Offline (LGPD)
        </p>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
