import { GutterMarker, gutterLineClass } from '@codemirror/view';
import { lineNumbers } from '@codemirror/view';
import { RangeSetBuilder, StateField } from '@codemirror/state';

import { Decoration } from '@codemirror/view';
import { search, SearchQuery, setSearchQuery, findNext, findPrevious } from '@codemirror/search';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  Download,
  FileCode2,
  FileUp,
  Info,
  Moon,
  Play,
  Search,
  ChevronUp,
  ChevronDown,
  Sun,
} from "lucide-react";
import { cn } from "./lib/utils";
import { LoadedFile, AuditResult, Inconsistency, GuideItem, ProcedimentoItem } from "./types/tiss";
import {
  executarAuditoriaDinamica,
  aplicarCorrecoesSegurasRecursivo,
} from "./utils/tissAuditor";
import { SAMPLE_TISS_WITH_ERRORS, SAMPLE_TISS_4_SADT } from "./utils/sampleXmls";
import { HospitalModal } from "./components/HospitalModal";
import { ExtratorAnsModal } from "./components/ExtratorAnsModal";
import { SaveAsModal } from "./components/SaveAsModal";
import { HashReaderModal } from "./components/HashReaderModal";
import { CriticalAuditPopup } from "./components/CriticalAuditPopup";
import { exportarXmlValidadoComHash, sincronizarDadosGuia, sincronizarProcedimento, aplicarCorrecaoIndividual, formatXmlBruto } from "./utils/tissAuditor";
import { GuidesTable } from "./components/GuidesTable";

type Severity = "crit" | "warn" | "info";

const sevToken: Record<Severity | "ok", { text: string; bg: string; border: string; dot: string }> = {
  crit: { text: "text-crit", bg: "bg-crit-surface", border: "border-crit/40", dot: "bg-crit" },
  warn: { text: "text-warn", bg: "bg-warn-surface", border: "border-warn/40", dot: "bg-warn" },
  info: { text: "text-info", bg: "bg-info-surface", border: "border-info/40", dot: "bg-info" },
  ok: { text: "text-ok", bg: "bg-ok-surface", border: "border-ok/40", dot: "bg-ok" },
};

export default function App() {
  const [dark, setDark] = useState(true);
  const [avancado, setAvancado] = useState(true);
  const [aba, setAba] = useState("split");
  const [linhaDestaque, setLinhaDestaque] = useState<number | null>(null);

  const [nomeHospital, setNomeHospital] = useState("HOSPITAL H OLHOS");
  const [modalHospitalAberto, setModalHospitalAberto] = useState(false);
  const [modalExtratorAnsAberto, setModalExtratorAnsAberto] = useState(false);
  const [modalSaveAsAberto, setModalSaveAsAberto] = useState(false);
  const [modalHashReaderAberto, setModalHashReaderAberto] = useState(false);
  const [modalCriticalAberto, setModalCriticalAberto] = useState(false);
  const [criticalErrors, setCriticalErrors] = useState<Inconsistency[]>([]);
  const shownCriticalForFile = useRef<Set<string>>(new Set());

  const [arquivos, setArquivos] = useState<LoadedFile[]>([]);
  const [arquivoAtivoId, setArquivoAtivoId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const initialFile: LoadedFile = {
      id: "lote-exemplo-1",
      nome: "lote_tiss_305_exemplo.xml",
      conteudo: SAMPLE_TISS_WITH_ERRORS,
      tamanhoBytes: new Blob([SAMPLE_TISS_WITH_ERRORS]).size,
      dataCarregamento: new Date(),
      ultimaAtualizacao: new Date(),
    };
    setArquivos([initialFile]);
    setArquivoAtivoId(initialFile.id);
  }, []);

  const arquivoAtivo = arquivos.find((a) => a.id === arquivoAtivoId);
  const audit = useMemo(() => {
    if (!arquivoAtivo) return null;
    return executarAuditoriaDinamica(arquivoAtivo.conteudo);
  }, [arquivoAtivo]);

  useEffect(() => {
    if (audit && arquivoAtivo) {
      const crits = audit.inconsistencias.filter(i => i.tipo.toLowerCase().includes("erro") || i.tipo.toLowerCase().includes("xsd"));
      if (crits.length > 0 && !shownCriticalForFile.current.has(arquivoAtivo.id)) {
        setCriticalErrors(crits);
        setModalCriticalAberto(true);
        shownCriticalForFile.current.add(arquivoAtivo.id);
      }
    }
  }, [audit, arquivoAtivo]);

  const loadExample = (id: string, name: string, content: string) => {
    const newFile: LoadedFile = {
      id,
      nome: name,
      conteudo: content,
      tamanhoBytes: new Blob([content]).size,
      dataCarregamento: new Date(),
      ultimaAtualizacao: new Date(),
    };
    setArquivos((prev) => [...prev, newFile]);
    setArquivoAtivoId(newFile.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files as Iterable<File>).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target && typeof evt.target.result === 'string') {
          const newFile: LoadedFile = {
            id: crypto.randomUUID(),
            nome: file.name,
            conteudo: evt.target.result,
            tamanhoBytes: file.size,
            dataCarregamento: new Date(),
            ultimaAtualizacao: new Date(),
          };
          setArquivos((prev) => [...prev, newFile]);
          setArquivoAtivoId(newFile.id);
        }
      };
      reader.readAsText(file, 'utf-8'); // TISS defaults to utf-8 or ISO-8859-1
    });
    e.target.value = '';
  };

  const handleExcluirLote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setArquivos((prev) => prev.filter((a) => a.id !== id));
    if (arquivoAtivoId === id) {
      const remaining = arquivos.filter((a) => a.id !== id);
      setArquivoAtivoId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleExport = () => {
    if (!arquivoAtivo) return;
    const exportResult = exportarXmlValidadoComHash(arquivoAtivo.conteudo);
    if (!exportResult.sucesso) { alert(exportResult.erroMsg || "Erro ao exportar"); return; }
    const blob = new Blob([exportResult.novoConteudo], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = arquivoAtivo.nome.replace('.xml', '_validado.xml');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSincronizarGuia = (
    guide: GuideItem,
    novosDados: { carteira: string; guia: string; senha: string; guiaPrestador: string }
  ) => {
    if (!arquivoAtivo) return;
    const { novoConteudo, alterado } = sincronizarDadosGuia(arquivoAtivo.conteudo, guide, novosDados);

    if (alterado) {
      setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoConteudo, ultimaAtualizacao: new Date() } : a));
    }
  };

  const handleSincronizarProcedimento = (
    proc: ProcedimentoItem,
    novoCodigo: string,
    novoValor: string,
    novaQuantidade: string,
    novoValorUnitario: string,
    novaReducaoAcrescimo?: string,
    novaDataExecucao?: string
  ) => {
    if (!arquivoAtivo) return;
    const { novoConteudo, alterado } = sincronizarProcedimento(
      arquivoAtivo.conteudo,
      proc,
      { codigo: novoCodigo, valor: novoValor, quantidade: novaQuantidade, valorUnitario: novoValorUnitario, reducaoAcrescimo: novaReducaoAcrescimo, dataExecucao: novaDataExecucao }
    );

    if (alterado) {
      setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoConteudo, ultimaAtualizacao: new Date() } : a));
    }
  };

  const handleExcluirGuia = (guide: GuideItem) => {
    if (!arquivoAtivo) return;
    const split = arquivoAtivo.conteudo.split('\n');
    split.splice(guide.startIdx - 1, guide.endIdx - guide.startIdx + 1);
    setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: split.join('\n'), ultimaAtualizacao: new Date() } : a));
  };

  const handleApplyCorrection = (inc: Inconsistency) => {
    if (!arquivoAtivo) return;
    const { novoConteudo, sucesso } = aplicarCorrecaoIndividual(arquivoAtivo.conteudo, inc);
    if (sucesso) {
      setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoConteudo, ultimaAtualizacao: new Date() } : a));
    } else {
      alert("Não foi possível aplicar esta correção isoladamente.");
    }
  };

  const handleApplySafeCorrections = () => {
    if (!arquivoAtivo) return;
    const { novoConteudo } = aplicarCorrecoesSegurasRecursivo(arquivoAtivo.conteudo);
    setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoConteudo, ultimaAtualizacao: new Date() } : a));
  };

  const abas = avancado
    ? [
        { id: "split", label: "Split View · Editor + Correções" },
        { id: "raw", label: "XML bruto" },
        { id: "corr", label: "Painel de Correções" },
        { id: "guias", label: "Guias do Lote" },
      ]
    : [
        { id: "split", label: "Resumo do lote" },
        { id: "guias", label: "Guias do Lote" },
      ];

  const totalValue = audit ? (audit.valorConsulta + audit.valorSadt).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00";

  return (
    <div className="flex h-screen min-h-0 w-full flex-col bg-background text-foreground">
      {modalHospitalAberto && (
        <HospitalModal
          nomeAtual={nomeHospital}
          onSalvar={(novo) => setNomeHospital(novo)}
          onFechar={() => setModalHospitalAberto(false)}
        />
      )}
      {modalExtratorAnsAberto && (
        <ExtratorAnsModal
          onFechar={() => setModalExtratorAnsAberto(false)}
          onAplicarRazaoSocial={(novoNome) => setNomeHospital(novoNome)}
        />
      )}
      <SaveAsModal
        isOpen={modalSaveAsAberto}
        nomeAtual={arquivoAtivo?.nome || 'lote_tiss.xml'}
        conteudoAtual={arquivoAtivo?.conteudo || ''}
        onClose={() => setModalSaveAsAberto(false)}
        onSalvarComoSucesso={(nome, conteudo) => {
           loadExample(crypto.randomUUID(), nome, conteudo);
           setModalSaveAsAberto(false);
        }}
      />
      <HashReaderModal
        isOpen={modalHashReaderAberto}
        onClose={() => setModalHashReaderAberto(false)}
        conteudoXmlAtivo={arquivoAtivo?.conteudo || ''}
        nomeArquivoAtivo={arquivoAtivo?.nome || ''}
        onAtualizarXml={(novoXml, _novoHash) => {
          if (arquivoAtivo) {
            setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoXml, ultimaAtualizacao: new Date() } : a));
          }
        }}
      />
      <CriticalAuditPopup
        isOpen={modalCriticalAberto}
        onClose={() => setModalCriticalAberto(false)}
        errors={criticalErrors}
      />
      <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-surface px-4">
        <div className="flex min-w-0 items-center gap-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary font-display text-[15px] font-bold text-primary-foreground">
              A
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-[15px] font-semibold tracking-tight">
                Auditor TISS Pro
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                ANS · Saúde Suplementar
              </div>
            </div>
          </div>
          
          <div className="hidden items-center gap-2 xl:flex">
            <button onClick={() => setModalHospitalAberto(true)} className="flex items-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-surface active:scale-[0.97]">
              {nomeHospital}
            </button>
            <button onClick={() => setModalHashReaderAberto(true)} className="flex items-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-surface active:scale-[0.97]">
              # Validador HASH
            </button>
            <button onClick={() => setModalExtratorAnsAberto(true)} className="flex items-center gap-1.5 rounded border border-info/40 bg-info-surface/20 px-2 py-1 text-[11px] text-info transition-all duration-200 hover:bg-info-surface hover:shadow-sm active:scale-[0.97]">
              Extrator ANS IA
            </button>
          </div>

          {audit && (
            <div className="hidden items-center gap-3 text-[11px] text-muted-foreground xl:flex ml-4">
              <span>Padrão: <span className="text-foreground font-mono font-medium">{audit.versaoTiss}</span></span>
              <span className="w-px h-3 bg-border"></span>
              <span>CNPJ: <span className="text-foreground font-mono font-medium">{audit.cnpjBase}</span></span>
              <span className="w-px h-3 bg-border"></span>
              <span>Total Lote: <span className="text-warn font-medium bg-warn-surface px-1.5 py-0.5 rounded border border-warn/40">{totalValue}</span></span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5 text-[11px]">
            <button
              onClick={() => setAvancado(false)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                !avancado ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground",
              )}
            >
              Simples
            </button>
            <button
              onClick={() => setAvancado(true)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                avancado ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground",
              )}
            >
              Avançado
            </button>
          </div>
          <button
            aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
            onClick={() => setDark((v) => !v)}
            className="grid size-8 place-items-center rounded-lg border border-border bg-surface-2 text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.97]"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <div className="grid size-8 place-items-center rounded-full border border-border-strong bg-surface-2 font-display text-xs font-semibold">
            RS
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-surface md:flex">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Lotes carregados
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">{arquivos.length}</span>
          </div>

          <div className="px-3 pb-2 space-y-2">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm">
              <FileUp className="size-3.5" /> Adicionar XML
              <input type="file" accept=".xml" multiple className="hidden" onChange={handleFileUpload} />
            </label>
            <div className="flex gap-2">
              <button 
                onClick={() => loadExample(crypto.randomUUID(), 'exemplo_tiss3.xml', SAMPLE_TISS_WITH_ERRORS)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Exemplo TISS 3
              </button>
              <button 
                onClick={() => loadExample(crypto.randomUUID(), 'exemplo_tiss4.xml', SAMPLE_TISS_4_SADT)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Exemplo TISS 4
              </button>
            </div>
            <button 
              onClick={() => setModalExtratorAnsAberto(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-info/40 bg-info-surface/20 px-2 py-1.5 text-[11px] text-info hover:bg-info-surface transition-colors"
            >
              Extrator Operadoras (IA)
            </button>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
            {arquivos.map((a) => {
              const ativo = a.id === arquivoAtivoId;
              const aAudit = arquivoAtivo?.id === a.id ? audit : null;
              const hasErrors = aAudit && aAudit.inconsistencias.length > 0;
              const isCrit = aAudit && aAudit.inconsistencias.some(i => i.tipo.toLowerCase().includes('erro'));
              const tone = !hasErrors ? "ok" : isCrit ? "crit" : "warn";
              const badge = !hasErrors ? "limpo" : `\${aAudit.inconsistencias.length} erros`;
              
              return (
                <div key={a.id} className="relative group block w-full">
                  <button
                    onClick={() => setArquivoAtivoId(a.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                      ativo
                        ? "border-primary/50 bg-primary/15"
                        : "border-transparent hover:border-border hover:bg-surface-2",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 pr-6">
                      <span className="truncate font-mono text-xs">{a.nome}</span>
                      {aAudit && (
                        <span
                          className={cn(
                            "shrink-0 rounded border px-1.5 py-0.5 text-[10px]",
                            sevToken[tone].text,
                            sevToken[tone].border,
                            sevToken[tone].bg,
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                    {aAudit && (
                      <div className="mt-1.5 truncate text-[11px] text-muted-foreground pr-6">
                        {aAudit.guias.length} guias · {(aAudit.valorConsulta + aAudit.valorSadt).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleExcluirLote(a.id, e)}
                    title="Excluir Lote"
                    className="absolute right-2 top-2 p-1.5 text-muted-foreground opacity-0 transition-all duration-200 hover:text-destructive hover:bg-destructive/10 rounded-md group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
            <div className="flex min-w-0 items-end gap-1 overflow-x-auto text-[12px]">
              {abas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAba(t.id)}
                  className={cn(
                    "shrink-0 rounded-t-md px-3 py-2 transition-colors",
                    aba === t.id
                      ? "border border-b-transparent border-border bg-surface font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.97]">
                Relatório
              </button>
              <button className="flex items-center gap-1.5 rounded-md bg-info text-info-surface px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm">
                <Play className="size-3.5" /> Processar Lote
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 rounded-md bg-ok text-ok-surface px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm">
                <Download className="size-3.5" /> Exportar Validado
              </button>
            </div>
          </div>

          {!arquivoAtivo ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-muted-foreground">
              <FileUp className="mb-4 size-10 opacity-50" />
              <p className="text-sm font-medium text-foreground">Nenhum lote XML ativo</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm text-center">
                Selecione um arquivo na barra lateral ou importe um novo arquivo XML para iniciar a auditoria.
              </p>
            </div>
          ) : (
            <>
              <div className={cn("min-h-0 flex-1 flex-col", aba === "guias" ? "flex" : "hidden")}>
                <GuidesTable 
                  guias={audit?.guias || []} 
                  onSincronizarGuia={handleSincronizarGuia}
                  onSincronizarProcedimento={handleSincronizarProcedimento}
                  onExcluirGuia={handleExcluirGuia}
                />
              </div>
              <div className={cn("min-h-0 flex-1 flex-col lg:flex-row", aba !== "guias" ? "flex" : "hidden")}>
                <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                  {avancado ? <Editor arquivo={arquivoAtivo} inconsistencias={audit?.inconsistencias || []} linhaDestaque={linhaDestaque} onOpenHash={() => setModalHashReaderAberto(true)} onOpenSaveAs={() => setModalSaveAsAberto(true)} onUpdateConteudo={(c) => { setArquivos(prev => prev.map(a => a.id === arquivoAtivo!.id ? { ...a, conteudo: c, ultimaAtualizacao: new Date() } : a)) }} /> : <ResumoSimples audit={audit} />}
                </section>
                <PainelAuditoria 
                  avancado={avancado} 
                  inconsistencias={audit?.inconsistencias || []} 
                  onApplySafe={handleApplySafeCorrections}
                  onApplyCorrection={handleApplyCorrection}
                  onViewInXml={(linha) => {
                    setLinhaDestaque(linha);
                    setAba('split');
                  }}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "ok" | "info" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1",
        tone === "ok" && "border-ok/40 bg-ok-surface font-medium text-ok",
        tone === "info" && "border-info/40 bg-info-surface font-medium text-info",
        !tone && "border-border bg-surface-2 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}


const highlightTheme = EditorView.theme({
  ".cm-gutters": { backgroundColor: "#000000 !important", color: "#ffffff !important", borderRight: "1px solid #2d3235 !important" },
  ".cm-lineNumbers .cm-gutterElement": { color: "#ffffff !important" },
  ".cm-activeLineGutter": { backgroundColor: "#1a1a1a !important", color: "#ffffff !important" },
  ".cm-error-gutter": { color: "#fca5a5 !important", backgroundColor: "rgba(239, 68, 68, 0.15) !important" },
  ".cm-warn-gutter": { color: "#fde047 !important", backgroundColor: "rgba(234, 179, 8, 0.15) !important" },
  ".cm-active-gutter": { color: "#93c5fd !important", backgroundColor: "rgba(59, 130, 246, 0.3) !important" },
  ".cm-error-line": { backgroundColor: "rgba(239, 68, 68, 0.15) !important", borderLeft: "4px solid #ef4444", color: "#fca5a5 !important" },
  ".cm-error-line *": { color: "#fca5a5 !important" },
  ".cm-warn-line": { backgroundColor: "rgba(234, 179, 8, 0.15) !important", borderLeft: "4px solid #eab308", color: "#fde047 !important" },
  ".cm-warn-line *": { color: "#fde047 !important" },
  ".cm-active-line": { backgroundColor: "rgba(59, 130, 246, 0.3) !important", borderLeft: "4px solid #3b82f6", color: "#93c5fd !important" },
  ".cm-active-line *": { color: "#93c5fd !important" }
});


class CritGutterMarker extends GutterMarker {
  elementClass: string;
  constructor(className: string) { super(); this.elementClass = className; }
}

const errorGutter = new CritGutterMarker("cm-error-gutter");
const warnGutter = new CritGutterMarker("cm-warn-gutter");
const activeGutter = new CritGutterMarker("cm-active-gutter");

function getGutterExtension(inconsistencias: Inconsistency[], linhaDestaque: number | null) {
  const field = StateField.define({
    create(state) {
      const builder = new RangeSetBuilder<GutterMarker>();
      const lineMap = new Map();
      inconsistencias.forEach(inc => {
        const isError = inc.tipo.toLowerCase().includes('erro');
        const current = lineMap.get(inc.linha) || { crit: false, warn: false };
        if (isError) current.crit = true;
        else current.warn = true;
        lineMap.set(inc.linha, current);
      });

      for (let i = 1; i <= state.doc.lines; i++) {
        const lineStatus = lineMap.get(i);
        const isHighlighted = (i === linhaDestaque);
        
        if (lineStatus || isHighlighted) {
          try {
            const line = state.doc.line(i);
            let marker = null;
            if (isHighlighted) marker = activeGutter;
            else if (lineStatus?.crit) marker = errorGutter;
            else if (lineStatus?.warn) marker = warnGutter;
            
            if (marker) {
              builder.add(line.from, line.from, marker);
            }
          } catch(e) {}
        }
      }
      return builder.finish();
    },
    update(gutters, tr) {
      // In a real app we'd map gutters, but since we recreate the state field
      // we'll just return the same (this is a simple static implementation)
      return gutters.map(tr.changes); // Track edits, but we handle recomputation by recreating the extension array
    }
  });

  return [field, gutterLineClass.compute([field], state => state.field(field))];
}

function getHighlightExtension(inconsistencias: Inconsistency[], linhaDestaque: number | null) {
  return [
    highlightTheme,
    EditorView.decorations.of((view) => {
      const builder = new RangeSetBuilder<Decoration>();
      const lineMap = new Map();
      inconsistencias.forEach(inc => {
        const isError = inc.tipo.toLowerCase().includes('erro');
        const current = lineMap.get(inc.linha) || { crit: false, warn: false };
        if (isError) current.crit = true;
        else current.warn = true;
        lineMap.set(inc.linha, current);
      });

      for (let i = 1; i <= view.state.doc.lines; i++) {
        const lineStatus = lineMap.get(i);
        const isHighlighted = (i === linhaDestaque);

        if (lineStatus || isHighlighted) {
          try {
            const line = view.state.doc.line(i);
            let className = "";
            if (isHighlighted) {
              className += " cm-active-line";
            } else if (lineStatus?.crit) {
              className += " cm-error-line";
            } else if (lineStatus?.warn) {
              className += " cm-warn-line";
            }
            if (className) {
              builder.add(line.from, line.from, Decoration.line({
                attributes: { class: className.trim() }
              }));
            }
          } catch(e) {}
        }
      }
      return builder.finish();
    })
  ];
}

function Editor({ arquivo, inconsistencias, linhaDestaque, onOpenHash, onOpenSaveAs, onUpdateConteudo }: { arquivo?: LoadedFile, inconsistencias: Inconsistency[], linhaDestaque: number | null, onOpenHash: () => void, onOpenSaveAs: () => void, onUpdateConteudo: (c: string) => void }) {
  const viewRef = useRef<any>(null);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  
  useEffect(() => {
    if (viewRef.current && viewRef.current.view) {
      const view = viewRef.current.view;
      view.dispatch({
        effects: setSearchQuery.of(new SearchQuery({ search: findText }))
      });
    }
  }, [findText]);

  
  const matchCount = useMemo(() => {
    if (!findText || !arquivo) return 0;
    try {
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\const handleReplaceAll = () => {'), 'gi');
      return (arquivo.conteudo.match(regex) || []).length;
    } catch(e) { return 0; }
  }, [findText, arquivo?.conteudo]);

  const handleNext = () => {
    if (viewRef.current?.view) {
      findNext(viewRef.current.view);
    }
  };

  const handlePrev = () => {
    if (viewRef.current?.view) {
      findPrevious(viewRef.current.view);
    }
  };

  const handleReplaceAll = () => {
    if (!findText || !arquivo) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newContent = arquivo.conteudo.replace(regex, replaceText);
    onUpdateConteudo(newContent);
  };


  useEffect(() => {
    if (linhaDestaque && viewRef.current) {
      const view = viewRef.current.view;
      if (view) {
        try {
          const line = view.state.doc.line(Math.min(linhaDestaque, view.state.doc.lines));
          view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'center' }) });
          // Optional: we can add a cursor selection to highlight the line
          view.dispatch({ selection: { anchor: line.from, head: line.to } });
        } catch(e) {}
      }
    }
  }, [linhaDestaque]);

  if (!arquivo) return null;
  const linhas = arquivo.conteudo.split('\n');

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-2 text-[11px] bg-surface">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono">{arquivo.nome}</span>
            <span className="shrink-0 rounded border border-crit/40 bg-crit-surface px-1.5 py-0.5 font-medium text-crit">
              {inconsistencias.length} inconsistências
            </span>
          </div>
        </div>
                <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            
            <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded px-2 py-1 flex-1 max-w-[250px]">
              <Search className="size-3 text-muted-foreground shrink-0" />
              <input type="text" value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="Localizar..." className="bg-transparent outline-none w-full placeholder:text-muted-foreground" />
              {findText && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="mr-1">{matchCount}</span>
                  <button onClick={handlePrev} className="p-0.5 hover:bg-surface rounded text-muted-foreground hover:text-foreground">
                    <ChevronUp className="size-3" />
                  </button>
                  <button onClick={handleNext} className="p-0.5 hover:bg-surface rounded text-muted-foreground hover:text-foreground">
                    <ChevronDown className="size-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded px-2 py-1 flex-1 max-w-[200px]">
              <input type="text" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Substituir por..." className="bg-transparent outline-none w-full placeholder:text-muted-foreground" />
            </div>
            <button onClick={handleReplaceAll} disabled={!findText} className="rounded bg-primary/20 text-primary border border-primary/30 px-2 py-1 font-medium hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Substituir Tudo
            </button>
            <div className="flex items-center gap-1.5 text-muted-foreground ml-2">
              <span>Linhas: <span className="text-foreground">{linhas.length}</span></span>
              <span className="w-px h-2 bg-border"></span>
              <span>Chars: <span className="text-foreground">{arquivo.conteudo.length}</span></span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={onOpenHash} className="rounded border border-info/40 bg-info-surface/20 px-2 py-1 text-info hover:bg-info-surface transition-colors">
                # Gerar Hash
              </button>
              <button onClick={() => onUpdateConteudo(formatXmlBruto(arquivo.conteudo))} className="rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors">
                Formatar
              </button>
              <button className="rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigator.clipboard.writeText(arquivo.conteudo)}>
                Copiar
              </button>
              <button onClick={onOpenSaveAs} className="rounded border border-primary/40 text-primary px-2 py-1 font-medium hover:bg-primary/10 transition-colors">
                Salvar Como...
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-background flex flex-col">
        <CodeMirror
          ref={viewRef}
          value={arquivo.conteudo}
          height="100%"
          extensions={[xml(), search({ top: true }), lineNumbers(), getHighlightExtension(inconsistencias, linhaDestaque), getGutterExtension(inconsistencias, linhaDestaque)]}
                    onChange={(value) => {
            onUpdateConteudo(value);
          }}
          className="flex-1 text-[13px] leading-relaxed"
          theme="dark"
        />
      </div>
    </>
  );
}

function ResumoSimples({ audit }: { audit?: AuditResult | null }) {
  if (!audit) return null;
  const numCrit = audit.inconsistencias.filter(i => i.tipo.toLowerCase().includes('erro')).length;
  const numWarn = audit.inconsistencias.length - numCrit;
  
  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <h1 className="font-display text-xl font-semibold tracking-tight">
        Lote atual — revisão necessária
      </h1>
      <p className="mt-2 max-w-[62ch] text-[13px] text-muted-foreground">
        Encontramos {audit.inconsistencias.length} pontos para revisar. Comece
        pelos {numCrit} itens críticos: eles impedem o envio.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <CartaoResumo valor={numCrit.toString()} rotulo="Impedem o envio" tone="crit" />
        <CartaoResumo valor={numWarn.toString()} rotulo="Recomendamos revisar" tone="warn" />
        <CartaoResumo valor={audit.guias.length.toString()} rotulo="Total de Guias" tone="info" />
      </div>
    </div>
  );
}

function CartaoResumo({
  valor,
  rotulo,
  tone,
}: {
  valor: string;
  rotulo: string;
  tone: Severity | "ok";
}) {
  const t = sevToken[tone];
  return (
    <div className={cn("rounded-lg border p-4", t.border, t.bg)}>
      <div className={cn("font-display text-2xl font-semibold", t.text)}>{valor}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{rotulo}</div>
    </div>
  );
}

function PainelAuditoria({ 
  avancado, 
  inconsistencias,
  onApplySafe,
  onApplyCorrection,
  onViewInXml
}: { 
  avancado: boolean, 
  inconsistencias: Inconsistency[],
  onApplySafe: () => void,
  onApplyCorrection: (inc: Inconsistency) => void,
  onViewInXml: (linha: number) => void
}) {
  const icones = { crit: CircleAlert, warn: AlertTriangle, info: Info };
  const isCrit = (i: Inconsistency) => {
    const t = i.tipo.toLowerCase();
    return t.includes('erro') || t.includes('xsd') || t.includes('crítico') || t.includes('inválido');
  };
  const numCrit = inconsistencias.filter(isCrit).length;
  const numWarn = inconsistencias.length - numCrit;
  const safeCount = inconsistencias.filter(i => i.seguro).length;

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-border bg-surface lg:w-96 lg:border-l lg:border-t-0">
      <div className="border-b border-border px-4 py-3">
        <div className="font-display text-[15px] font-semibold tracking-tight">
          {avancado ? "Inconsistências & Auditoria" : "O que precisa da sua atenção"}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{inconsistencias.length} itens no lote · {numCrit} críticos</div>
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-border bg-border text-center">
        {[
          { v: numCrit.toString(), l: "Críticos", c: "text-crit" },
          { v: numWarn.toString(), l: "Alertas", c: "text-warn" },
          { v: "0", l: "Infos", c: "text-info" },
        ].map((s) => (
          <div key={s.l} className="bg-surface py-2">
            <div className={cn("font-display text-lg font-semibold", s.c)}>{s.v}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {inconsistencias.map((inc) => {
          const sev: Severity = isCrit(inc) ? "crit" : "warn";
          const t = sevToken[sev];
          const Icone = icones[sev];
          
          return (
            <div key={inc.id} className={cn("rounded-lg border p-3", t.border, t.bg)}>
              <div className="flex items-center gap-2">
                <Icone className={cn("size-3.5 shrink-0", t.text)} />
                <span className={cn("text-[11px] font-medium", t.text)}>{inc.tipo}</span>
                {avancado && (
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    linha {inc.linha}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[12px] text-foreground/90">
                {inc.desc}
              </p>
              {avancado && inc.original && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">De:</div>
                  <code className="block p-1.5 rounded bg-background/50 border border-border text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                    {inc.original.trim()}
                  </code>
                </div>
              )}
              {avancado && inc.sugestao && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] text-ok uppercase tracking-wide">Para (sugestão):</div>
                  <code className="block p-1.5 rounded bg-ok-surface/50 border border-ok/30 text-[11px] font-mono text-ok whitespace-pre-wrap">
                    {inc.sugestao.trim()}
                  </code>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {inc.seguro && (
                  <button onClick={() => onApplyCorrection(inc)} className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm">
                    Corrigir
                  </button>
                )}
                {avancado && (
                  <button 
                    onClick={() => onViewInXml(inc.linha)}
                    className="rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.97]"
                  >
                    Ver no XML
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3">
        <button 
          onClick={onApplySafe}
          disabled={safeCount === 0}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-ok/40 bg-ok-surface px-3 py-2 text-[12px] font-medium text-ok transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:opacity-90 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none active:scale-[0.98] disabled:active:scale-100"
        >
          <Check className="size-3.5" /> Aplicar correções seguras ({safeCount})
        </button>
      </div>
    </aside>
  );
}

