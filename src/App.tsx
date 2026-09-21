import { GutterMarker, gutterLineClass, keymap, lineNumbers, Decoration, EditorView, highlightActiveLine } from '@codemirror/view';
import { RangeSetBuilder, StateField } from '@codemirror/state';
import { search, SearchQuery, setSearchQuery } from '@codemirror/search';
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
  Loader2,
} from "lucide-react";
import { cn } from "./lib/utils";
import { LoadedFile, AuditResult, Inconsistency, GuideItem, ProcedimentoItem } from "./types/tiss";
import {
  executarAuditoriaDinamica,
  aplicarCorrecoesSegurasRecursivo,
} from "./utils/tissAuditor";
import { contarPorSeveridade, isCritico } from "./utils/severidade";
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

  const [isScanning, setIsScanning] = useState(false);
  const [scanTrigger, setScanTrigger] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arquivoAtivo?.conteudo, scanTrigger]);

  useEffect(() => {
    if (audit && arquivoAtivo) {
      // Antes usava um filtro textual próprio (divergente do resto do app);
      // agora usa a mesma fonte única de verdade (severidade.ts).
      const crits = audit.inconsistencias.filter(isCritico);
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

  const handleProcessarLote = () => {
    if (!arquivoAtivo) return;
    setIsScanning(true);
    // Simular o tempo de processamento para reforçar que é uma nova varredura
    setTimeout(() => {
      setScanTrigger(prev => prev + 1);
      setIsScanning(false);
      
      // Permitir que o alerta crítico apareça novamente nesta varredura se necessário
      shownCriticalForFile.current.delete(arquivoAtivo.id);
    }, 600);
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
    const novoConteudo = arquivoAtivo.conteudo.substring(0, guide.startIdx) + arquivoAtivo.conteudo.substring(guide.endIdx);
    setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoConteudo, ultimaAtualizacao: new Date() } : a));
  };

  const handleExcluirProcedimento = (proc: ProcedimentoItem) => {
    if (!arquivoAtivo) return;
    const novoConteudo = arquivoAtivo.conteudo.substring(0, proc.startIdx) + arquivoAtivo.conteudo.substring(proc.endIdx);
    setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoConteudo, ultimaAtualizacao: new Date() } : a));
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
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background px-6">
        <div className="flex min-w-0 items-center gap-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded bg-foreground font-display text-[16px] font-bold text-background shadow-sm">
              T
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground">
                Auditor TISS Pro
              </div>
              <div className="text-[11px] font-medium tracking-wide text-muted-foreground/80">
                Saúde Suplementar
              </div>
            </div>
          </div>
          
          <div className="hidden items-center gap-2.5 xl:flex">
            <button onClick={() => setModalHospitalAberto(true)} className="flex items-center gap-1.5 rounded-md border border-border/50 bg-surface px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:text-foreground active:scale-[0.98]">
              {nomeHospital}
            </button>
            <button onClick={() => setModalHashReaderAberto(true)} className="flex items-center gap-1.5 rounded-md border border-border/50 bg-surface px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:text-foreground active:scale-[0.98]">
              # Validador HASH
            </button>
            <button onClick={() => setModalExtratorAnsAberto(true)} className="flex items-center gap-1.5 rounded-md border border-info/30 bg-info/5 px-2.5 py-1.5 text-[12px] font-medium text-info transition-all duration-200 hover:bg-info/10 active:scale-[0.98]">
              Extrator ANS IA
            </button>
          </div>
          {audit && (
            <div className="hidden items-center gap-4 text-[12px] text-muted-foreground xl:flex ml-4">
              <span className="flex items-center gap-1.5">Padrão: <span className="text-foreground font-mono font-medium bg-surface px-1.5 py-0.5 rounded border border-border/50">{audit.versaoTiss}</span></span>
              <span className="w-px h-3.5 bg-border/60"></span>
              <span className="flex items-center gap-1.5">CNPJ: <span className="text-foreground font-mono font-medium bg-surface px-1.5 py-0.5 rounded border border-border/50">{audit.cnpjBase}</span></span>
              <span className="w-px h-3.5 bg-border/60"></span>
              <span className="flex items-center gap-1.5">Lote: <span className="text-warn font-mono font-medium bg-warn/10 px-1.5 py-0.5 rounded border border-warn/20">{totalValue}</span></span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center rounded-md border border-border/60 bg-surface p-0.5 text-[12px]">
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
            className="grid size-8 place-items-center rounded-md border border-transparent text-muted-foreground transition-all duration-200 hover:bg-surface hover:text-foreground active:scale-[0.96]"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <div className="grid size-9 place-items-center rounded-full border border-border/60 bg-surface font-display text-[13px] font-semibold text-foreground">
            RS
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[300px] shrink-0 flex-col border-r border-border/60 bg-background md:flex">
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              Lotes carregados
            </span>
            <span className="flex h-5 items-center rounded-full bg-surface px-2 text-[11px] font-medium text-foreground border border-border/50">{arquivos.length}</span>
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
              const isCrit = aAudit && aAudit.inconsistencias.some(isCritico);
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
              <button 
                onClick={handleProcessarLote}
                disabled={isScanning || !arquivoAtivo}
                className="flex items-center gap-1.5 rounded-md bg-info text-info-surface px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isScanning ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                Processar Lote
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
                  onExcluirProcedimento={handleExcluirProcedimento}
                />
              </div>
              <div className={cn("min-h-0 flex-1 flex-col lg:flex-row", aba !== "guias" ? "flex" : "hidden")}>
                <section className={cn("flex min-h-0 min-w-0 flex-1 flex-col", (aba === "split" || aba === "raw") ? "flex" : "hidden")}>
                  {avancado ? <Editor arquivo={arquivoAtivo} inconsistencias={audit?.inconsistencias || []} linhaDestaque={linhaDestaque} onOpenHash={() => setModalHashReaderAberto(true)} onOpenSaveAs={() => setModalSaveAsAberto(true)} onUpdateConteudo={(c) => { setArquivos(prev => prev.map(a => a.id === arquivoAtivo!.id ? { ...a, conteudo: c, ultimaAtualizacao: new Date() } : a)) }} /> : <ResumoSimples audit={audit} />}
                </section>
                <PainelAuditoria 
                  className={cn(
                    (aba === "split" || aba === "corr") ? "flex" : "hidden",
                    aba === "corr" ? "lg:w-full lg:border-l-0" : ""
                  )}
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


const highlightTheme = EditorView.theme({
  ".cm-gutters": { backgroundColor: "#000000 !important", color: "#ffffff !important", borderRight: "1px solid #2d3235 !important" },
  ".cm-lineNumbers .cm-gutterElement": { color: "#ffffff !important" },
  ".cm-activeLineGutter": { backgroundColor: "#1a1a1a !important", color: "#ffffff !important" },
  ".cm-error-gutter": { color: "#fca5a5 !important", backgroundColor: "rgba(239, 68, 68, 0.15) !important" },
  ".cm-warn-gutter": { color: "#fde047 !important", backgroundColor: "rgba(234, 179, 8, 0.15) !important" },
  ".cm-active-gutter": { color: "#ffffff !important", backgroundColor: "rgba(255, 255, 255, 0.15) !important" },
  ".cm-error-line": { backgroundColor: "rgba(239, 68, 68, 0.15) !important", borderLeft: "4px solid #ef4444", color: "#fca5a5 !important" },
  ".cm-error-line *": { color: "#fca5a5 !important" },
  ".cm-warn-line": { backgroundColor: "rgba(234, 179, 8, 0.15) !important", borderLeft: "4px solid #eab308", color: "#fde047 !important" },
  ".cm-warn-line *": { color: "#fde047 !important" },
  ".cm-active-line": { backgroundColor: "rgba(255, 255, 255, 0.15) !important", borderLeft: "4px solid #ffffff" },
  ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.10) !important" },
  ".cm-content": { caretColor: "#ffffff !important" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#ffffff !important" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "rgba(255, 255, 255, 0.25) !important" },
  ".cm-searchMatch": { backgroundColor: "rgba(234, 179, 8, 0.35) !important", outline: "1px solid rgba(234, 179, 8, 0.6) !important" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "rgba(59, 130, 246, 0.65) !important", outline: "2px solid #3b82f6 !important" }
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
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);

  // Compute all matches with exact character offsets and line numbers
  const matches = useMemo(() => {
    if (!findText.trim() || !arquivo?.conteudo) return [];
    const text = arquivo.conteudo;
    const lowerText = text.toLowerCase();
    const query = findText.toLowerCase();
    const results: { from: number; to: number; line: number }[] = [];
    
    let pos = 0;
    let currentLine = 1;
    let lastNewlinePos = -1;

    while (pos < lowerText.length) {
      const idx = lowerText.indexOf(query, pos);
      if (idx === -1) break;

      // Count lines accurately
      for (let i = Math.max(0, lastNewlinePos); i < idx; i++) {
        if (text[i] === '\n') {
          currentLine++;
          lastNewlinePos = i;
        }
      }

      results.push({
        from: idx,
        to: idx + findText.length,
        line: currentLine
      });

      pos = idx + Math.max(1, findText.length);
    }
    return results;
  }, [findText, arquivo?.conteudo]);

  // Jump to a specific match and center it on screen
  const jumpToMatch = (match: { from: number; to: number; line: number }, queryText = findText) => {
    if (!viewRef.current?.view) return;
    const view = viewRef.current.view;
    try {
      view.dispatch({
        selection: { anchor: match.from, head: match.to },
        effects: [
          EditorView.scrollIntoView(match.from, { y: 'center' }),
          setSearchQuery.of(new SearchQuery({ search: queryText, caseSensitive: false }))
        ]
      });
    } catch (e) {}
  };

  // When search query changes or matches are calculated, automatically focus and scroll to first match
  useEffect(() => {
    if (!findText.trim()) {
      setCurrentMatchIndex(-1);
      if (viewRef.current?.view) {
        try {
          viewRef.current.view.dispatch({
            effects: setSearchQuery.of(new SearchQuery({ search: "" }))
          });
        } catch (e) {}
      }
      return;
    }

    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      jumpToMatch(matches[0], findText);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [findText, matches.length]);

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    jumpToMatch(matches[nextIdx]);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    jumpToMatch(matches[prevIdx]);
  };

  const handleReplaceAll = () => {
    if (!findText || !arquivo) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
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
            
            <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded px-2 py-1 flex-1 max-w-[280px]">
              <Search className="size-3 text-muted-foreground shrink-0" />
              <input 
                type="text" 
                value={findText} 
                onChange={(e) => setFindText(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) handlePrev();
                    else handleNext();
                  }
                }}
                placeholder="Localizar no XML..." 
                className="bg-transparent outline-none w-full placeholder:text-muted-foreground font-mono text-[11px]" 
              />
              {findText && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                  <span className="px-1 py-0.5 font-mono text-[10px] bg-background/80 rounded border border-border text-foreground font-medium">
                    {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : '0'}
                  </span>
                  {matches.length > 0 && currentMatchIndex >= 0 && (
                    <span className="text-[9px] text-muted-foreground mr-0.5">
                      L{matches[currentMatchIndex]?.line}
                    </span>
                  )}
                  <button 
                    onClick={handlePrev} 
                    disabled={matches.length === 0} 
                    title="Ocorrência anterior (Shift+Enter)" 
                    className="p-1 hover:bg-surface rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button 
                    onClick={handleNext} 
                    disabled={matches.length === 0} 
                    title="Próxima ocorrência (Enter)" 
                    className="p-1 hover:bg-surface rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded px-2 py-1 flex-1 max-w-[200px]">
              <input type="text" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Substituir por..." className="bg-transparent outline-none w-full placeholder:text-muted-foreground font-mono text-[11px]" />
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
          extensions={[
            xml(), 
            search({ top: true }), 
            lineNumbers(), 
            highlightActiveLine(),
            getHighlightExtension(inconsistencias, linhaDestaque), 
            getGutterExtension(inconsistencias, linhaDestaque),
            keymap.of([
              { 
                key: "Mod-s", 
                preventDefault: true, 
                run: () => {
                  // O conteúdo já é atualizado no onChange.
                  // Aqui apenas interceptamos o atalho para não abrir a janela do navegador.
                  return true; 
                } 
              }
            ])
          ]}
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
  const { criticos: numCrit, avisos: numWarn } = contarPorSeveridade(audit.inconsistencias);
  
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-[26px] font-semibold tracking-tight text-foreground">
          Revisão do Lote
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground max-w-[65ch]">
          O motor de auditoria identificou <span className="font-medium text-foreground">{audit.inconsistencias.length} pontos de atenção</span> estruturais e de negócio no XML. Dentre eles, existem <strong className="font-medium text-crit">{numCrit} erros críticos</strong> que causarão rejeição imediata no webservice da operadora.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <CartaoResumo 
            valor={numCrit.toString()} 
            rotulo="Itens Críticos (Impedem Envio)" 
            desc="Problemas estruturais, hash divergente ou tags obrigatórias ausentes."
            tone="crit" 
            icone={CircleAlert}
          />
          <CartaoResumo 
            valor={numWarn.toString()} 
            rotulo="Alertas e Avisos" 
            desc="Avisos sobre regras de negócio que não impedem a transmissão do lote."
            tone="warn" 
            icone={AlertTriangle}
          />
          <CartaoResumo 
            valor={audit.guias.length.toString()} 
            rotulo="Guias Processadas" 
            desc="Guias SPSADT validadas no escopo deste lote."
            tone="info" 
            icone={FileCode2}
          />
        </div>
      </div>
    </div>
  );
}

function CartaoResumo({
  valor,
  rotulo,
  desc,
  tone,
  icone: Icone,
}: {
  valor: string;
  rotulo: string;
  desc: string;
  tone: Severity | "ok";
  icone: React.ElementType;
}) {
  const t = sevToken[tone];
  return (
    <div className={cn("flex items-center gap-5 rounded-xl border p-5 transition-all duration-300", t.border, t.bg)}>
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background border shadow-sm", t.border, t.text)}>
        <Icone className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn("font-display text-[15px] font-semibold", t.text)}>{rotulo}</span>
        </div>
        <div className="mt-0.5 text-[13px] text-muted-foreground/80 leading-relaxed">{desc}</div>
      </div>
      <div className={cn("font-display text-[28px] font-semibold tracking-tight shrink-0 px-2", t.text)}>
        {valor}
      </div>
    </div>
  );
}

function PainelAuditoria({ 
  avancado, 
  inconsistencias,
  onApplySafe,
  onApplyCorrection,
  onViewInXml,
  className
}: { 
  avancado: boolean, 
  inconsistencias: Inconsistency[],
  onApplySafe: () => void,
  onApplyCorrection: (inc: Inconsistency) => void,
  onViewInXml: (linha: number) => void,
  className?: string
}) {
  const icones = { crit: CircleAlert, warn: AlertTriangle, info: Info };
  const { criticos: numCrit } = contarPorSeveridade(inconsistencias);
  const safeCount = inconsistencias.filter(i => i.seguro).length;

  return (
    <aside className={cn("flex w-full shrink-0 flex-col border-t border-border/60 bg-background lg:w-[400px] lg:border-l lg:border-t-0", className)}>
      <div className="flex flex-col gap-3 border-b border-border/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-[16px] font-semibold tracking-tight text-foreground">
              {avancado ? "Registro de Auditoria" : "Atenção Necessária"}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
              <span>{inconsistencias.length} itens detectados</span>
            </div>
          </div>
          {numCrit > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-crit/30 bg-crit/10 px-2.5 py-1 text-[11px] font-medium text-crit">
              <CircleAlert className="size-3.5" />
              {numCrit} críticos
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 bg-surface/30">
        {inconsistencias.map((inc) => {
          const sev: Severity = isCritico(inc) ? "crit" : "warn";
          const t = sevToken[sev];
          const Icone = icones[sev];
          
          return (
            <div key={inc.id} className={cn("rounded-xl border p-4 shadow-sm transition-all duration-200", t.border, t.bg)}>
              <div className="flex items-start gap-3">
                <Icone className={cn("mt-0.5 size-4 shrink-0", t.text)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-[12px] font-semibold tracking-wide", t.text)}>{inc.tipo}</span>
                    {avancado && (
                      <span className="font-mono text-[10px] text-muted-foreground/70 bg-background/50 px-1.5 py-0.5 rounded border border-border/40">
                        L{inc.linha}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
                    {inc.desc}
                  </p>

                  {avancado && inc.original && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Original:</div>
                      <code className="block p-2 rounded-md bg-background/60 border border-border/60 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
                        {inc.original.trim()}
                      </code>
                    </div>
                  )}
                  {avancado && inc.sugestao && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[10px] font-medium text-ok uppercase tracking-wider">Sugestão (Correção Segura):</div>
                      <code className="block p-2 rounded-md bg-ok/10 border border-ok/20 text-[11px] font-mono text-ok whitespace-pre-wrap break-all">
                        {inc.sugestao.trim()}
                      </code>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inc.seguro && (
                      <button onClick={() => onApplyCorrection(inc)} className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-all duration-200 ease-out hover:opacity-90 hover:shadow-md active:scale-[0.97]">
                        Aplicar Correção
                      </button>
                    )}
                    {avancado && (
                      <button 
                        onClick={() => onViewInXml(inc.linha)}
                        className="rounded-md border border-border/60 bg-surface px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:text-foreground active:scale-[0.97]"
                      >
                        Localizar no XML
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border/60 bg-background p-5">
        <button 
          onClick={onApplySafe}
          disabled={safeCount === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-ok/40 bg-ok/10 px-4 py-2.5 text-[13px] font-semibold tracking-wide text-ok transition-all duration-200 hover:bg-ok/20 hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none active:scale-[0.98]"
        >
          <Check className="size-4" /> Aplicar correções seguras ({safeCount})
        </button>
      </div>
    </aside>
  );
}

