import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Copy, Check, Building2, X, FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface ExtratorAnsModalProps {
  onFechar: () => void;
  onAplicarRazaoSocial?: (razaoSocial: string) => void;
}

interface OperadoraResult {
  razao_social: string | null;
  cnpj: string | null;
  registro_ans: string | null;
}

const EXEMPLO_TEXTO = `Prezados, enviamos os dados de cadastro da nossa empresa para atualização no sistema.
A AD SALUTE ADMINISTRADORA DE BENEFÍCIOS LTDA está com o seu registro na ANS sob o número 418901 regularizado.
O nosso C.N.P.J. é 10.458.298/0001-31.
Qualquer dúvida, entrar em contato.`;

export const ExtratorAnsModal: React.FC<ExtratorAnsModalProps> = ({
  onFechar,
  onAplicarRazaoSocial,
}) => {
  const [textoInput, setTextoInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<OperadoraResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [aplicado, setAplicado] = useState(false);

  const handleExtrair = async () => {
    if (!textoInput.trim()) return;
    setCarregando(true);
    setErro(null);
    setResultado(null);
    setAplicado(false);

    try {
      const resp = await fetch('/api/extrair-operadora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoInput }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Falha ao conectar ao serviço de IA.');
      }

      setResultado(data.data);
    } catch (err: any) {
      console.error(err);
      setErro(err?.message || 'Ocorreu um erro ao extrair os dados com Gemini.');
    } finally {
      setCarregando(false);
    }
  };

  const handleCopiarTexto = (texto: string, chave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(chave);
    setTimeout(() => setCopiado(null), 2000);
  };

  const handleAplicarNome = (nome: string) => {
    if (onAplicarRazaoSocial) {
      onAplicarRazaoSocial(nome.toUpperCase());
      setAplicado(true);
      setTimeout(() => setAplicado(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d1e] border border-[#2d3235] rounded-xl p-6 w-full max-w-2xl space-y-5 text-gray-200 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00b4d8] via-[#e63946] to-[#e9c46a]" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#2d3235] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00b4d8]/10 text-[#00b4d8]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Extrator de Dados ANS com Gemini IA</span>
              </h3>
              <p className="text-xs text-gray-400">
                Extraia Razão Social, CNPJ e Registro ANS de e-mails, contratos e documentos brutos.
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#2d3235] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text Input Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#00b4d8]" />
              <span>Texto Bruto ou Documento</span>
            </label>
            <button
              onClick={() => setTextoInput(EXEMPLO_TEXTO)}
              className="text-[11px] text-[#00b4d8] hover:underline flex items-center gap-1"
            >
              Carregar Texto Exemplo
            </button>
          </div>

          <textarea
            value={textoInput}
            onChange={(e) => setTextoInput(e.target.value)}
            rows={4}
            placeholder="Cole aqui o texto com dados da operadora (ex: e-mail de cadastro, contrato, rodapé de relatório, etc)..."
            className="w-full bg-[#0e1111] border border-[#2d3235] rounded-lg p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#00b4d8] resize-none"
          />
        </div>

        {/* Submit button */}
        <div className="flex justify-end gap-2">
          <motion.button
            whileHover={!carregando && textoInput.trim() ? { scale: 1.04, boxShadow: "0px 0px 12px rgba(0, 180, 216, 0.4)" } : undefined}
            whileTap={!carregando && textoInput.trim() ? { scale: 0.95 } : undefined}
            onClick={handleExtrair}
            disabled={carregando || !textoInput.trim()}
            className="px-5 py-2.5 text-xs font-bold bg-[#00b4d8] hover:bg-[#0096c7] text-black rounded-lg flex items-center gap-2 disabled:opacity-40 transition-all shadow-lg cursor-pointer disabled:cursor-not-allowed"
          >
            {carregando ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Processando com Gemini IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black text-black" />
                <span>Extrair Dados da Operadora</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Error message */}
        {erro && (
          <div className="bg-red-950/50 border border-red-800/80 rounded-lg p-3 flex items-start gap-2.5 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Falha na Extração IA</strong>
              <span>{erro}</span>
            </div>
          </div>
        )}

        {/* Results Card */}
        {resultado && (
          <div className="bg-[#0e1111] border border-[#2d3235] rounded-lg p-4 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#2d3235] pb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Dados Extraídos da ANS com Sucesso</span>
              </span>
              <button
                onClick={() => handleCopiarTexto(JSON.stringify(resultado, null, 2), 'json')}
                className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 bg-[#1a1d1e] px-2 py-1 rounded border border-[#2d3235]"
              >
                {copiado === 'json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiado === 'json' ? 'Copiado!' : 'Copiar JSON'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Razão Social */}
              <div className="bg-[#16191a] border border-[#2d3235] p-3 rounded-md space-y-1 md:col-span-3">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Razão Social / Nome Operadora
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-white truncate">
                    {resultado.razao_social || <span className="text-gray-500 italic">Não identificado</span>}
                  </span>
                  {resultado.razao_social && onAplicarRazaoSocial && (
                    <button
                      onClick={() => handleAplicarNome(resultado.razao_social!)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded transition-colors flex items-center gap-1 shrink-0 ${
                        aplicado
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#2a9d8f] hover:bg-[#21867a] text-white'
                      }`}
                    >
                      <Building2 className="w-3 h-3" />
                      <span>{aplicado ? 'Aplicado!' : 'Usar no Faturamento'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CNPJ */}
              <div className="bg-[#16191a] border border-[#2d3235] p-3 rounded-md space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  CNPJ (14 dígitos)
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#e9c46a]">
                    {resultado.cnpj || <span className="text-gray-500 italic">Não encontrado</span>}
                  </span>
                  {resultado.cnpj && (
                    <button
                      onClick={() => handleCopiarTexto(resultado.cnpj!, 'cnpj')}
                      className="text-gray-400 hover:text-white p-1"
                      title="Copiar CNPJ"
                    >
                      {copiado === 'cnpj' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Registro ANS */}
              <div className="bg-[#16191a] border border-[#2d3235] p-3 rounded-md space-y-1 md:col-span-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Registro ANS (6 dígitos)
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#00b4d8]">
                    {resultado.registro_ans || <span className="text-gray-500 italic">Não encontrado</span>}
                  </span>
                  {resultado.registro_ans && (
                    <button
                      onClick={() => handleCopiarTexto(resultado.registro_ans!, 'ans')}
                      className="text-gray-400 hover:text-white p-1"
                      title="Copiar Registro ANS"
                    >
                      {copiado === 'ans' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
