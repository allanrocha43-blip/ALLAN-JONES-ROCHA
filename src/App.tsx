import { GutterMarker, gutterLineClass, keymap, lineNumbers, Decoration, EditorView, highlightActiveLine } from '@codemirror/view';
import { RangeSetBuilder, StateField } from '@codemirror/state';
import { search, SearchQuery, setSearchQuery } from '@codemirror/search';
import { undo, redo } from '@codemirror/commands';
import { startCompletion } from '@codemirror/autocomplete';
import CodeMirror from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileUp,
  Hash,
  Info,
  Moon,
  Play,
  Redo2,
  Save,
  Search,
  ChevronUp,
  ChevronDown,
  Sun,
  Loader2,
  ShieldCheck,
  Tags,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "./lib/utils";
import { LoadedFile, AuditResult, Inconsistency, GuideItem, ProcedimentoItem } from "./types/tiss";
import {
  executarAuditoriaDinamica,
  aplicarCorrecoesSegurasRecursivo,
  exportarXmlValidadoComHash,
  sincronizarDadosGuia,
  sincronizarProcedimento,
  aplicarCorrecaoIndividual,
  formatXmlBruto,
  prepararParaExportacaoEHash,
} from "./utils/tissAuditor";
import { getTissAutocompleteExtension } from "./utils/tiss/tissAutocomplete";
import { contarPorSeveridade, isCritico } from "./utils/severidade";
import { SAMPLE_TISS_WITH_ERRORS, SAMPLE_TISS_4_SADT } from "./utils/sampleXmls";
import { HospitalModal } from "./components/HospitalModal";
import { ExtratorAnsModal } from "./components/ExtratorAnsModal";
import { SaveAsModal } from "./components/SaveAsModal";
import { HashReaderModal } from "./components/HashReaderModal";
import { CriticalAuditPopup } from "./components/CriticalAuditPopup";
import { AssistenteEnvioAnsModal } from "./components/AssistenteEnvioAnsModal";
import { GuidesTable } from "./components/GuidesTable";
import { startKeepAlive } from "./utils/keepAlive";
import {
  loadWorkspaceFiles,
  loadWorkspaceMeta,
  saveWorkspaceFiles,
  saveWorkspaceMeta,
} from "./utils/workspaceStorage";

type Severity = "crit" | "warn" | "info";
type ToastTone = "ok" | "warn" | "crit" | "info";

interface ToastNotification {
  id: number;
  mensagem: string;
  tone: ToastTone;
}

const sevToken: Record<Severity | "ok", { text: string; bg: string; border: string; dot: string }> = {
  crit: { text: "text-crit", bg: "bg-crit-surface", border: "border-crit/40", dot: "bg-crit" },
  warn: { text: "text-warn", bg: "bg-warn-surface", border: "border-warn/40", dot: "bg-warn" },
  info: { text: "text-info", bg: "bg-info-surface", border: "border-info/40", dot: "bg-info" },
  ok: { text: "text-ok", bg: "bg-ok-surface", border: "border-ok/40", dot: "bg-ok" },
};

async function readXmlFileWithEncoding(file: File): Promise<{ text: string; eolOriginal: '\r\n' | '\n' }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const headerSample = new TextDecoder('iso-8859-1').decode(bytes.slice(0, 256));
  const declaresUtf8 = /encoding\s*=\s*["']utf-8["']/i.test(headerSample);
  const decoder = new TextDecoder(hasUtf8Bom || declaresUtf8 ? 'utf-8' : 'iso-8859-1');
  const rawText = decoder.decode(bytes);
  const eolOriginal: '\r\n' | '\n' = rawText.includes('\r\n') ? '\r\n' : '\n';
  const text = rawText
    .replace(/^\uFEFF/, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\r\n/g, '\n');
  return { text, eolOriginal };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const initialMeta = useMemo(() => loadWorkspaceMeta(), []);

  const [dark, setDark] = useState(initialMeta.dark ?? true);
  const [avancado, setAvancado] = useState(initialMeta.avancado ?? true);
  const [aba, setAba] = useState(initialMeta.aba ?? "split");
  const [linhaDestaque, setLinhaDestaque] = useState<number | null>(null);

  const [nomeHospital, setNomeHospital] = useState(initialMeta.nomeHospital ?? "HOSPITAL H OLHOS");
  const [modalHospitalAberto, setModalHospitalAberto] = useState(false);
  const [modalExtratorAnsAberto, setModalExtratorAnsAberto] = useState(false);
  const [modalSaveAsAberto, setModalSaveAsAberto] = useState(false);
  const [modalHashReaderAberto, setModalHashReaderAberto] = useState(false);
  const [modalCriticalAberto, setModalCriticalAberto] = useState(false);
  const [modalAssistenteAberto, setModalAssistenteAberto] = useState(false);
  const [modalPasteAberto, setModalPasteAberto] = useState(false);
  const [nomePasteXml, setNomePasteXml] = useState("novo_lote_tiss.xml");
  const [conteudoPasteXml, setConteudoPasteXml] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [criticalErrors, setCriticalErrors] = useState<Inconsistency[]>([]);
  const shownCriticalForFile = useRef<Set<string>>(new Set());

  const [arquivos, setArquivos] = useState<LoadedFile[]>([]);
  const [arquivoAtivoId, setArquivoAtivoId] = useState<string | null>(initialMeta.arquivoAtivoId ?? null);
  const workspaceHydrated = useRef(false);

  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  const [ignoredByFileId, setIgnoredByFileId] = useState<Record<string, string[]>>({});
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanTrigger, setScanTrigger] = useState(0);

  const mostrarToast = useCallback((mensagem: string, tone: ToastTone = "info", tempo = 4000) => {
    const id = Date.now();
    setToast({ id, mensagem, tone });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, tempo);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Mantém o servidor aquecido silenciosamente enquanto o app estiver aberto
  useEffect(() => {
    return startKeepAlive();
  }, []);

  // Restaura lotes salvos localmente (IndexedDB) ou carrega o exemplo inicial
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const savedFiles = await loadWorkspaceFiles();
      if (cancelled) return;
      if (savedFiles && savedFiles.length > 0) {
        savedFiles.forEach((f) => shownCriticalForFile.current.add(f.id));
        setArquivos(savedFiles);
        setArquivoAtivoId((prev) =>
          prev && savedFiles.some((f) => f.id === prev) ? prev : savedFiles[0].id
        );
      } else {
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
      }
      workspaceHydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Salva preferências e guia ativa automaticamente
  useEffect(() => {
    saveWorkspaceMeta({
      arquivoAtivoId,
      nomeHospital,
      aba,
      avancado,
      dark,
    });
  }, [arquivoAtivoId, nomeHospital, aba, avancado, dark]);

  // Persiste os arquivos XML e edições em IndexedDB com debounce suave (1000ms)
  useEffect(() => {
    if (!workspaceHydrated.current) return;
    const timer = window.setTimeout(() => {
      void saveWorkspaceFiles(arquivos);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [arquivos]);

  // Garante gravação imediata caso o navegador suspenda a aba
  useEffect(() => {
    const flushSave = () => {
      if (workspaceHydrated.current) {
        void saveWorkspaceFiles(arquivos);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushSave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [arquivos]);

  const arquivoAtivo = arquivos.find((a) => a.id === arquivoAtivoId);
  const [debouncedConteudo, setDebouncedConteudo] = useState<string>(arquivoAtivo?.conteudo || '');

  useEffect(() => {
    if (!arquivoAtivo) {
      setDebouncedConteudo('');
      return;
    }
    // Para lotes pequenos (<50KB), atualização instantânea; para lotes maiores, debounce suave de 200ms
    const isSmall = arquivoAtivo.conteudo.length < 50_000;
    if (isSmall) {
      setDebouncedConteudo(arquivoAtivo.conteudo);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedConteudo(arquivoAtivo.conteudo);
    }, 200);
    return () => clearTimeout(timer);
  }, [arquivoAtivo?.conteudo, arquivoAtivo?.id]);

  const audit = useMemo(() => {
    if (!arquivoAtivo) return null;
    const xmlToAudit = debouncedConteudo || arquivoAtivo.conteudo;
    return executarAuditoriaDinamica(xmlToAudit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedConteudo, scanTrigger, arquivoAtivo?.id]);

  // Inconsistências visíveis para o arquivo ativo (respeitando itens ignorados)
  const ignoredIdsAtivos = useMemo(() => {
    if (!arquivoAtivoId) return new Set<string>();
    return new Set(ignoredByFileId[arquivoAtivoId] || []);
  }, [arquivoAtivoId, ignoredByFileId]);

  const inconsistenciasVisiveis = useMemo(() => {
    if (!audit) return [];
    if (ignoredIdsAtivos.size === 0) return audit.inconsistencias;
    return audit.inconsistencias.filter((inc) => !ignoredIdsAtivos.has(inc.id));
  }, [audit, ignoredIdsAtivos]);

  // Cache de auditoria para todos os lotes listados na barra lateral
  const sidebarCacheRef = useRef<
    Record<string, { conteudo: string; totalErros: number; criticos: number; totalGuias: number; valorTotal: number }>
  >({});

  const sidebarSummaries = useMemo(() => {
    const map: Record<string, { totalErros: number; criticos: number; totalGuias: number; valorTotal: number }> = {};
    arquivos.forEach((f) => {
      const ignoredSet = new Set(ignoredByFileId[f.id] || []);
      if (f.id === arquivoAtivoId && audit && (debouncedConteudo === f.conteudo || f.conteudo.length >= 50_000)) {
        const visiveis = audit.inconsistencias.filter((i) => !ignoredSet.has(i.id));
        const crits = visiveis.filter(isCritico).length;
        const summary = {
          totalErros: visiveis.length,
          criticos: crits,
          totalGuias: audit.guias.length,
          valorTotal: audit.valorConsulta + audit.valorSadt,
        };
        sidebarCacheRef.current[f.id] = { conteudo: f.conteudo, ...summary };
        map[f.id] = summary;
        return;
      }

      const cached = sidebarCacheRef.current[f.id];
      if (cached && cached.conteudo === f.conteudo) {
        map[f.id] = {
          totalErros: cached.totalErros,
          criticos: cached.criticos,
          totalGuias: cached.totalGuias,
          valorTotal: cached.valorTotal,
        };
        return;
      }

      const res = executarAuditoriaDinamica(f.conteudo);
      const visiveis = res.inconsistencias.filter((i) => !ignoredSet.has(i.id));
      const summary = {
        totalErros: visiveis.length,
        criticos: visiveis.filter(isCritico).length,
        totalGuias: res.guias.length,
        valorTotal: res.valorConsulta + res.valorSadt,
      };
      sidebarCacheRef.current[f.id] = { conteudo: f.conteudo, ...summary };
      map[f.id] = summary;
    });
    return map;
  }, [arquivos, arquivoAtivoId, audit, debouncedConteudo, ignoredByFileId]);

  useEffect(() => {
    if (audit && arquivoAtivo) {
      const crits = audit.inconsistencias.filter(isCritico);
      if (crits.length > 0 && !shownCriticalForFile.current.has(arquivoAtivo.id)) {
        setCriticalErrors(crits);
        setModalCriticalAberto(true);
        shownCriticalForFile.current.add(arquivoAtivo.id);
      }
    }
  }, [audit, arquivoAtivo]);

  // Limpa seleções de guias que não pertencem ao arquivo ativo
  useEffect(() => {
    setSelectedGuideIds([]);
    setLinhaDestaque(null);
  }, [arquivoAtivoId]);

  const loadExample = useCallback((id: string, name: string, content: string) => {
    const newFile: LoadedFile = {
      id,
      nome: name,
      conteudo: content,
      tamanhoBytes: new Blob([content]).size,
      dataCarregamento: new Date(),
      ultimaAtualizacao: new Date(),
      precisaGerarHash: false,
    };
    setArquivos((prev) => [newFile, ...prev.filter((a) => a.nome !== name)]);
    setArquivoAtivoId(newFile.id);
    mostrarToast(`Lote "${name}" carregado.`, "info");
  }, [mostrarToast]);

  const adicionarArquivosLista = useCallback(async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith('.xml') || f.type.includes('xml') || f.type === 'text/plain'
    );
    if (filesArray.length === 0) {
      mostrarToast("Selecione arquivos no formato .xml.", "warn");
      return;
    }

    const loaded: LoadedFile[] = [];
    for (const file of filesArray) {
      try {
        const { text, eolOriginal } = await readXmlFileWithEncoding(file);
        loaded.push({
          id: crypto.randomUUID(),
          nome: file.name,
          conteudo: text,
          tamanhoBytes: file.size,
          dataCarregamento: new Date(),
          ultimaAtualizacao: new Date(),
          eolOriginal,
          precisaGerarHash: false,
        });
      } catch (err) {
        console.error("Erro ao ler XML:", err);
        mostrarToast(`Falha ao ler "${file.name}".`, "crit");
      }
    }

    if (loaded.length > 0) {
      const names = new Set(loaded.map((l) => l.nome));
      setArquivos((prev) => [...prev.filter((f) => !names.has(f.nome)), ...loaded]);
      setArquivoAtivoId(loaded[loaded.length - 1].id);
      mostrarToast(`${loaded.length} arquivo(s) XML carregado(s) com sucesso.`, "ok");
    }
  }, [mostrarToast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    void adicionarArquivosLista(files);
    e.target.value = '';
  };

  const handleConfirmPasteXml = () => {
    if (!conteudoPasteXml.trim()) return;
    const nomeTrim = nomePasteXml.trim() || 'novo_lote_tiss.xml';
    const nomeFinal = nomeTrim.toLowerCase().endsWith('.xml') ? nomeTrim : `${nomeTrim}.xml`;
    const eolOriginal: '\r\n' | '\n' = conteudoPasteXml.includes('\r\n') ? '\r\n' : '\n';
    const conteudoLimpo = conteudoPasteXml
      .replace(/^\uFEFF/, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/\r\n/g, '\n');

    const newFile: LoadedFile = {
      id: crypto.randomUUID(),
      nome: nomeFinal,
      conteudo: conteudoLimpo,
      tamanhoBytes: new Blob([conteudoLimpo]).size,
      dataCarregamento: new Date(),
      ultimaAtualizacao: new Date(),
      eolOriginal,
      precisaGerarHash: true,
    };
    setArquivos((prev) => [newFile, ...prev]);
    setArquivoAtivoId(newFile.id);
    setConteudoPasteXml("");
    setModalPasteAberto(false);
    mostrarToast(`"${nomeFinal}" criado a partir do texto colado.`, "ok");
  };

  const atualizarConteudoArquivoAtivo = useCallback((novoConteudo: string, precisaGerarHash = true) => {
    if (!arquivoAtivoId) return;
    setArquivos((prev) =>
      prev.map((a) =>
        a.id === arquivoAtivoId
          ? {
              ...a,
              conteudo: novoConteudo,
              tamanhoBytes: new Blob([novoConteudo]).size,
              precisaGerarHash,
              ultimaAtualizacao: new Date(),
            }
          : a
      )
    );
  }, [arquivoAtivoId]);

  const handleProcessarLote = useCallback(() => {
    if (!arquivoAtivo) return;
    setIsScanning(true);
    setDebouncedConteudo(arquivoAtivo.conteudo);
    window.setTimeout(() => {
      const res = executarAuditoriaDinamica(arquivoAtivo.conteudo);
      setScanTrigger((prev) => prev + 1);
      setIsScanning(false);
      shownCriticalForFile.current.delete(arquivoAtivo.id);
      if (res.inconsistencias.length > 0) {
        mostrarToast(`Auditoria concluída: ${res.inconsistencias.length} inconsistência(s) encontrada(s).`, "warn");
      } else {
        mostrarToast("Validação concluída: Lote 100% no padrão ANS!", "ok");
      }
    }, 250);
  }, [arquivoAtivo, mostrarToast]);

  const handleExcluirLote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = arquivos.filter((a) => a.id !== id);
    setArquivos(remaining);
    if (arquivoAtivoId === id) {
      setArquivoAtivoId(remaining.length > 0 ? remaining[0].id : null);
    }
    mostrarToast("Lote removido da barra lateral.", "info", 2500);
  };

  const handleGerarHash = useCallback(() => {
    if (!arquivoAtivo) return;
    const auditInicial = executarAuditoriaDinamica(arquivoAtivo.conteudo);
    let conteudoParaHash = arquivoAtivo.conteudo;
    let totalCorrigidos = 0;

    if (auditInicial.inconsistencias.length > 0) {
      const resCorrecao = aplicarCorrecoesSegurasRecursivo(arquivoAtivo.conteudo);
      conteudoParaHash = resCorrecao.novoConteudo;
      totalCorrigidos = resCorrecao.totalCorrigidos;
    }

    const { novoConteudo, hashCalculado, sucesso, erroMsg } = exportarXmlValidadoComHash(conteudoParaHash);
    if (sucesso) {
      atualizarConteudoArquivoAtivo(novoConteudo, false);
      if (totalCorrigidos > 0) {
        mostrarToast(`${totalCorrigidos} ajuste(s) seguro(s) e nova Hash MD5: ${hashCalculado}`, "ok", 5000);
      } else {
        mostrarToast(`Hash MD5 TISS atualizada: ${hashCalculado}`, "ok", 4500);
      }
    } else {
      mostrarToast(erroMsg || "Não foi possível gerar o Hash MD5.", "crit", 5000);
    }
  }, [arquivoAtivo, atualizarConteudoArquivoAtivo, mostrarToast]);

  const handleSalvarAtualizar = useCallback(async () => {
    if (!arquivoAtivo) return;

    const { novoConteudo, hashCalculado, sucesso, erroMsg } = exportarXmlValidadoComHash(arquivoAtivo.conteudo);
    const finalContent = sucesso ? novoConteudo : arquivoAtivo.conteudo;

    let updatedFileHandle = arquivoAtivo.fileHandle;
    if (!updatedFileHandle && 'showSaveFilePicker' in window) {
      try {
        updatedFileHandle = await (window as unknown as {
          showSaveFilePicker: (opts: unknown) => Promise<any>;
        }).showSaveFilePicker({
          suggestedName: arquivoAtivo.nome,
          types: [{ description: 'Arquivo XML TISS', accept: { 'application/xml': ['.xml'] } }],
        });
        setArquivos((prev) =>
          prev.map((f) => (f.id === arquivoAtivo.id ? { ...f, fileHandle: updatedFileHandle } : f))
        );
      } catch {
        // Usuário cancelou seletor nativo ou ambiente iframe bloqueou; segue salvamento local no workspace
      }
    }

    atualizarConteudoArquivoAtivo(finalContent, !sucesso);

    let salvoNoDisco = false;
    if (updatedFileHandle) {
      try {
        const uint8Array = prepararParaExportacaoEHash(finalContent, arquivoAtivo.eolOriginal);
        const writable = await updatedFileHandle.createWritable();
        await writable.write(uint8Array);
        await writable.close();
        salvoNoDisco = true;
      } catch (err) {
        console.warn('Salvamento no disco falhou, mantendo persistência local:', err);
      }
    }

    if (sucesso) {
      mostrarToast(
        salvoNoDisco
          ? `Arquivo salvo no disco com Hash MD5: ${hashCalculado?.slice(0, 12)}...`
          : `Lote salvo localmente com Hash MD5: ${hashCalculado?.slice(0, 12)}...`,
        "ok"
      );
    } else {
      mostrarToast(
        salvoNoDisco
          ? `Arquivo salvo no disco (aviso Hash: ${erroMsg})`
          : `Lote salvo localmente (aviso Hash: ${erroMsg})`,
        "warn"
      );
    }
  }, [arquivoAtivo, atualizarConteudoArquivoAtivo, mostrarToast]);

  const handleAbrirSalvarComo = useCallback(() => {
    if (!arquivoAtivo) {
      mostrarToast('Nenhum lote XML ativo para "Salvar Como".', "warn");
      return;
    }
    setModalSaveAsAberto(true);
  }, [arquivoAtivo, mostrarToast]);

  // Atalhos de teclado globais: Ctrl+S (Salvar), Ctrl+Shift+S (Salvar Como), Ctrl+P (Processar Lote)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          handleAbrirSalvarComo();
        } else {
          void handleSalvarAtualizar();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleProcessarLote();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [handleSalvarAtualizar, handleAbrirSalvarComo, handleProcessarLote]);

  const handleExport = () => {
    if (!arquivoAtivo) return;
    const exportResult = exportarXmlValidadoComHash(arquivoAtivo.conteudo);
    if (!exportResult.sucesso) {
      mostrarToast(exportResult.erroMsg || "Erro ao exportar XML validado.", "crit", 5000);
      return;
    }

    atualizarConteudoArquivoAtivo(exportResult.novoConteudo, false);

    const bytesISO = prepararParaExportacaoEHash(exportResult.novoConteudo, arquivoAtivo.eolOriginal);
    const blob = new Blob([bytesISO as unknown as BlobPart], { type: "application/xml;charset=iso-8859-1" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nomeValidado = arquivoAtivo.nome.match(/\.xml$/i)
      ? arquivoAtivo.nome.replace(/\.xml$/i, '_VALIDADO.xml')
      : `${arquivoAtivo.nome}_VALIDADO.xml`;
    a.download = nomeValidado;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarToast(
      `XML ISO-8859-1 exportado (${nomeValidado}) · Hash MD5: ${exportResult.hashCalculado?.slice(0, 10)}...`,
      "ok",
      5000
    );
  };

  const handleExportarRelatorioCsv = () => {
    if (!audit || inconsistenciasVisiveis.length === 0) {
      mostrarToast("Nenhuma inconsistência para exportar no relatório CSV.", "warn");
      return;
    }

    const headers = 'Linha;Tipo;Descrição;Original;Sugestao;Seguro\n';
    const rows = inconsistenciasVisiveis
      .map(
        (i) =>
          `${i.linha};"${i.tipo}";"${i.desc.replace(/"/g, '""')}";"${i.original.replace(/"/g, '""')}";"${i.sugestao.replace(/"/g, '""')}";${i.seguro ? 'SIM' : 'NAO'}`
      )
      .join('\n');

    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_auditoria_${arquivoAtivo?.nome.replace(/\.xml$/i, '') || 'tiss'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    mostrarToast(`Relatório CSV exportado (${inconsistenciasVisiveis.length} ocorrências).`, "ok");
  };

  const handleSincronizarGuia = (
    guide: GuideItem,
    novosDados: { carteira: string; guia: string; senha: string; guiaPrestador: string }
  ) => {
    if (!arquivoAtivo) return;
    const { novoConteudo, alterado } = sincronizarDadosGuia(arquivoAtivo.conteudo, guide, novosDados);

    if (alterado) {
      atualizarConteudoArquivoAtivo(novoConteudo, true);
      mostrarToast(`Guia ${novosDados.guiaPrestador || guide.index} sincronizada no XML.`, "ok");
    } else {
      mostrarToast("Nenhuma alteração detectada na guia.", "info", 2500);
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
      atualizarConteudoArquivoAtivo(novoConteudo, true);
      mostrarToast(`Procedimento ${novoCodigo} sincronizado no XML.`, "ok");
    } else {
      mostrarToast("Nenhuma alteração detectada no procedimento.", "info", 2500);
    }
  };

  const handleExcluirGuia = (guide: GuideItem) => {
    if (!arquivoAtivo) return;
    const novoConteudo = arquivoAtivo.conteudo.substring(0, guide.startIdx) + arquivoAtivo.conteudo.substring(guide.endIdx);
    atualizarConteudoArquivoAtivo(novoConteudo, true);
    setSelectedGuideIds((prev) => prev.filter((id) => id !== guide.id));
    mostrarToast(`Guia ${guide.guiaPrestador || guide.index} excluída do lote.`, "warn");
  };

  const handleExcluirProcedimento = (proc: ProcedimentoItem) => {
    if (!arquivoAtivo) return;
    const novoConteudo = arquivoAtivo.conteudo.substring(0, proc.startIdx) + arquivoAtivo.conteudo.substring(proc.endIdx);
    atualizarConteudoArquivoAtivo(novoConteudo, true);
    mostrarToast(`Procedimento ${proc.codigo} excluído da guia.`, "warn");
  };

  const inFlightCorrectionsRef = useRef<Set<string>>(new Set());

  const handleApplyCorrection = useCallback((inc: Inconsistency) => {
    if (!arquivoAtivo) return;
    const lockKey = `${arquivoAtivo.id}:${inc.id}`;
    if (inFlightCorrectionsRef.current.has(lockKey)) return;
    inFlightCorrectionsRef.current.add(lockKey);

    try {
      const { novoConteudo, sucesso } = aplicarCorrecaoIndividual(arquivoAtivo.conteudo, inc);
      if (sucesso && novoConteudo !== arquivoAtivo.conteudo) {
        setDebouncedConteudo(novoConteudo);
        atualizarConteudoArquivoAtivo(novoConteudo, true);
        mostrarToast(`Correção aplicada na linha ${inc.linha}.`, "ok");
      } else {
        mostrarToast("Esta correção já foi aplicada ou a linha foi alterada; reanalisando.", "info", 2500);
      }
    } finally {
      window.setTimeout(() => {
        inFlightCorrectionsRef.current.delete(lockKey);
      }, 250);
    }
  }, [arquivoAtivo, atualizarConteudoArquivoAtivo, mostrarToast]);

  const handleApplySafeCorrections = useCallback(() => {
    if (!arquivoAtivo) return;
    const { novoConteudo, totalCorrigidos } = aplicarCorrecoesSegurasRecursivo(arquivoAtivo.conteudo);
    if (totalCorrigidos > 0 && novoConteudo !== arquivoAtivo.conteudo) {
      setDebouncedConteudo(novoConteudo);
      atualizarConteudoArquivoAtivo(novoConteudo, true);
      mostrarToast(`${totalCorrigidos} correção(ões) segura(s) aplicada(s) ao XML.`, "ok");
    } else {
      mostrarToast("Nenhuma correção automática segura pendente.", "info");
    }
  }, [arquivoAtivo, atualizarConteudoArquivoAtivo, mostrarToast]);

  const handleIgnorarErro = (incId: string) => {
    if (!arquivoAtivoId) return;
    setIgnoredByFileId((prev) => {
      const current = prev[arquivoAtivoId] || [];
      if (current.includes(incId)) return prev;
      return { ...prev, [arquivoAtivoId]: [...current, incId] };
    });
    mostrarToast("Inconsistência ocultada da lista atual.", "info", 2500);
  };

  const handleRestaurarIgnorados = () => {
    if (!arquivoAtivoId) return;
    setIgnoredByFileId((prev) => {
      const next = { ...prev };
      delete next[arquivoAtivoId];
      return next;
    });
    mostrarToast("Inconsistências ignoradas restauradas.", "info", 2500);
  };

  const handleExcluirLinha = (linhaNum: number) => {
    if (!arquivoAtivo) return;
    const linhas = arquivoAtivo.conteudo.split('\n');
    if (linhaNum > 0 && linhaNum <= linhas.length) {
      linhas.splice(linhaNum - 1, 1);
      atualizarConteudoArquivoAtivo(linhas.join('\n'), true);
      mostrarToast(`Linha ${linhaNum} excluída do XML.`, "warn");
    }
  };

  const handleToggleGuideSelection = (guideId: string) => {
    setSelectedGuideIds((prev) =>
      prev.includes(guideId) ? prev.filter((id) => id !== guideId) : [...prev, guideId]
    );
  };

  const numInconsistencias = inconsistenciasVisiveis.length;
  const numGuias = audit?.guias.length ?? 0;

  const abas = avancado
    ? [
        { id: "split", label: `Split View · Editor + Correções (${numInconsistencias})` },
        { id: "raw", label: "XML bruto" },
        { id: "corr", label: `Painel de Correções (${numInconsistencias})` },
        { id: "guias", label: `Guias do Lote (${numGuias})` },
        { id: "guias-individuais", label: `Guias Individuais (${selectedGuideIds.length})` },
      ]
    : [
        { id: "split", label: `Resumo do lote (${numInconsistencias})` },
        { id: "guias", label: `Guias do Lote (${numGuias})` },
        { id: "guias-individuais", label: `Guias Individuais (${selectedGuideIds.length})` },
      ];

  const totalValue = audit ? (audit.valorConsulta + audit.valorSadt).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00";

  return (
    <div className="flex h-screen min-h-0 w-full flex-col bg-background text-foreground">
      <AnimatePresence>
        {modalHospitalAberto && (
          <HospitalModal
            nomeAtual={nomeHospital}
            onSalvar={(novo) => setNomeHospital(novo)}
            onFechar={() => setModalHospitalAberto(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {modalExtratorAnsAberto && (
          <ExtratorAnsModal
            onFechar={() => setModalExtratorAnsAberto(false)}
            onAplicarRazaoSocial={(novoNome) => setNomeHospital(novoNome)}
          />
        )}
      </AnimatePresence>
      <SaveAsModal
        isOpen={modalSaveAsAberto}
        nomeAtual={arquivoAtivo?.nome || 'lote_tiss.xml'}
        conteudoAtual={arquivoAtivo?.conteudo || ''}
        onClose={() => setModalSaveAsAberto(false)}
        onSalvarComoSucesso={(nome, conteudo, acao) => {
          if (acao === 'novo_no_sistema') {
            loadExample(crypto.randomUUID(), nome, conteudo);
            mostrarToast(`Novo lote "${nome}" ativado no painel.`, "ok");
          } else if (arquivoAtivo) {
            atualizarConteudoArquivoAtivo(conteudo, false);
            mostrarToast(`Arquivo "${nome}" salvo com sucesso.`, "ok");
          }
          setModalSaveAsAberto(false);
        }}
      />
      <HashReaderModal
        isOpen={modalHashReaderAberto}
        onClose={() => setModalHashReaderAberto(false)}
        conteudoXmlAtivo={arquivoAtivo?.conteudo || ''}
        nomeArquivoAtivo={arquivoAtivo?.nome || ''}
        onAtualizarXml={(novoXml, novoHash) => {
          if (arquivoAtivo) {
            atualizarConteudoArquivoAtivo(novoXml, false);
            mostrarToast(`Hash MD5 recalculada e assinada: ${novoHash}`, "ok", 4500);
          }
        }}
      />
      <CriticalAuditPopup
        isOpen={modalCriticalAberto}
        onClose={() => setModalCriticalAberto(false)}
        errors={criticalErrors}
      />
      <AssistenteEnvioAnsModal
        isOpen={modalAssistenteAberto}
        onClose={() => setModalAssistenteAberto(false)}
        audit={audit}
        nomeArquivo={arquivoAtivo?.nome}
        onIrParaAba={(targetAba) => setAba(targetAba)}
        onAbrirHashModal={() => setModalHashReaderAberto(true)}
        onExportarValidado={handleExport}
      />

      {modalPasteAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setModalPasteAberto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 text-foreground shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                <FileText className="size-4 text-primary" />
                <span>Colar XML TISS diretamente</span>
              </div>
              <button
                onClick={() => setModalPasteAberto(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Nome do arquivo</label>
              <input
                type="text"
                value={nomePasteXml}
                onChange={(e) => setNomePasteXml(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Conteúdo XML</label>
              <textarea
                value={conteudoPasteXml}
                onChange={(e) => setConteudoPasteXml(e.target.value)}
                placeholder="Cole aqui o código XML TISS completo..."
                rows={10}
                className="w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalPasteAberto(false)}
                className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPasteXml}
                disabled={!conteudoPasteXml.trim()}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Carregar XML
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button onClick={() => setModalHospitalAberto(true)} className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md border border-border/50 bg-surface px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:text-foreground active:scale-[0.98]">
              {nomeHospital}
            </button>
            <button onClick={() => setModalHashReaderAberto(true)} className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md border border-border/50 bg-surface px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:text-foreground active:scale-[0.98]">
              # Validador HASH
            </button>
            <button onClick={() => setModalExtratorAnsAberto(true)} className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md border border-info/30 bg-info/5 px-2.5 py-1.5 text-[12px] font-medium text-info transition-all duration-200 hover:bg-info/10 active:scale-[0.98]">
              Extrator ANS IA
            </button>
            <button 
              onClick={() => setModalAssistenteAberto(true)} 
              className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md border border-ok/40 bg-ok/10 px-2.5 py-1.5 text-[12px] font-medium text-ok transition-all duration-200 hover:bg-ok/20 active:scale-[0.98]"
              title="Assistente de Envio ANS e Checklist de Lote"
            >
              <ShieldCheck className="size-3.5" />
              Checklist ANS
            </button>
          </div>
          {audit && (
            <div className="hidden items-center gap-4 text-[12px] text-muted-foreground xl:flex ml-2">
              <span className="flex items-center gap-1.5 whitespace-nowrap">Padrão: <span className="text-foreground font-mono tabular-nums font-medium">{audit.versaoTiss}</span></span>
              <span className="w-px h-3.5 bg-border/60"></span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">CNPJ: <span className="text-foreground font-mono tabular-nums font-medium">{audit.cnpjBase}</span></span>
              <span className="w-px h-3.5 bg-border/60"></span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">Lote: <span className="text-warn font-mono tabular-nums font-medium">{totalValue}</span></span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center rounded-md border border-border/60 bg-surface p-0.5 text-[12px]">
            <button
              onClick={() => setAvancado(false)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors whitespace-nowrap",
                !avancado ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground",
              )}
            >
              Simples
            </button>
            <button
              onClick={() => setAvancado(true)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors whitespace-nowrap",
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
        <aside
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              void adicionarArquivosLista(e.dataTransfer.files);
            }
          }}
          className={cn(
            "hidden w-[300px] shrink-0 flex-col border-r border-border/60 bg-background md:flex transition-colors",
            isDraggingOver && "bg-primary/5 border-primary"
          )}
        >
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <span className="text-[11px] font-medium tracking-wider text-muted-foreground/80">
              Lotes carregados
            </span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {arquivos.length} arquivo{arquivos.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="px-3 pb-2 space-y-2">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm">
              <FileUp className="size-3.5" /> Adicionar XML (ou arraste)
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
            <div className="flex gap-2">
              <button 
                onClick={() => setModalPasteAberto(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-dashed border-border bg-surface px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors"
              >
                <FileText className="size-3" />
                Colar XML
              </button>
              <button 
                onClick={() => setModalExtratorAnsAberto(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-info/40 bg-info-surface/20 px-2 py-1.5 text-[10px] text-info hover:bg-info-surface transition-colors"
              >
                Extrator ANS
              </button>
            </div>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
            {arquivos.map((a) => {
              const ativo = a.id === arquivoAtivoId;
              const summary = sidebarSummaries[a.id];
              const hasErrors = summary && summary.totalErros > 0;
              const isCrit = summary && summary.criticos > 0;
              const tone: Severity | "ok" = !hasErrors ? "ok" : isCrit ? "crit" : "warn";
              const statusLabel = !summary
                ? "..."
                : !hasErrors
                  ? "Limpo"
                  : `${summary.totalErros} ${summary.totalErros === 1 ? "erro" : "erros"}`;

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
                      <span className="truncate font-mono text-xs text-foreground">{a.nome}</span>
                      {summary && (
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-medium tabular-nums",
                            sevToken[tone].text,
                          )}
                        >
                          {statusLabel}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground pr-6 tabular-nums">
                      <span>{formatFileSize(a.tamanhoBytes)}</span>
                      {summary && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{summary.totalGuias} guias</span>
                          <span aria-hidden="true">·</span>
                          <span>{summary.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </>
                      )}
                      {a.precisaGerarHash && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-warn font-medium">Hash pendente</span>
                        </>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleExcluirLote(a.id, e)}
                    title="Excluir Lote"
                    className="absolute right-2 top-2 p-1.5 text-muted-foreground opacity-0 transition-all duration-200 hover:text-destructive hover:bg-destructive/10 rounded-md group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
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
                    "shrink-0 whitespace-nowrap rounded-t-md px-3 py-2 transition-colors tabular-nums",
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
              <button
                onClick={handleExportarRelatorioCsv}
                disabled={!arquivoAtivo || numInconsistencias === 0}
                className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground transition-all duration-200 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                title="Exportar Relatório de Auditoria em CSV"
              >
                <FileSpreadsheet className="size-3.5" />
                Relatório CSV
              </button>
              <a
                href="/README.txt"
                download="README.txt"
                className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.97]"
                title="Baixar Manual e Documentação do Sistema (README.txt)"
              >
                <FileCode2 className="size-3.5" />
                README (.txt)
              </a>
              <button 
                onClick={handleProcessarLote}
                disabled={isScanning || !arquivoAtivo}
                className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md bg-info text-info-surface px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isScanning ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                Processar Lote
              </button>
              <button
                onClick={handleExport}
                disabled={!arquivoAtivo}
                className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md bg-ok text-ok-surface px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                title="Assinar MD5 e baixar XML validado no padrão ISO-8859-1"
              >
                <Download className="size-3.5" /> Exportar Validado
              </button>
            </div>
          </div>

          {!arquivoAtivo ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  void adicionarArquivosLista(e.dataTransfer.files);
                }
              }}
              className="flex min-h-0 flex-1 flex-col items-center justify-center text-muted-foreground p-6"
            >
              <FileUp className="mb-4 size-10 opacity-50" />
              <p className="text-sm font-medium text-foreground">Nenhum lote XML ativo</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm text-center">
                Arraste um arquivo XML para esta tela, importe na barra lateral ou cole o conteúdo XML diretamente.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <label className="cursor-pointer rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                  Adicionar XML
                  <input type="file" accept=".xml" multiple className="hidden" onChange={handleFileUpload} />
                </label>
                <button
                  onClick={() => setModalPasteAberto(true)}
                  className="rounded-md border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors"
                >
                  Colar XML
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={cn("min-h-0 flex-1 flex-col transition-opacity duration-150", aba === "guias" ? "flex animate-in fade-in duration-150" : "hidden")}>
                <GuidesTable 
                  guias={audit?.guias || []} 
                  inconsistencias={inconsistenciasVisiveis}
                  selectedGuides={selectedGuideIds}
                  onToggleGuideSelection={handleToggleGuideSelection}
                  onVerNoXml={(linha) => {
                    setLinhaDestaque(linha);
                    setAba('split');
                  }}
                  onSincronizarGuia={handleSincronizarGuia}
                  onSincronizarProcedimento={handleSincronizarProcedimento}
                  onExcluirGuia={handleExcluirGuia}
                  onExcluirProcedimento={handleExcluirProcedimento}
                />
              </div>
              <div className={cn("min-h-0 flex-1 flex-col transition-opacity duration-150", aba === "guias-individuais" ? "flex animate-in fade-in duration-150" : "hidden")}>
                {selectedGuideIds.length === 0 ? (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
                    <p className="text-sm font-medium text-foreground">Nenhuma guia selecionada</p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-md">
                      Marque as caixas de seleção na aba &ldquo;Guias do Lote&rdquo; para isolar e auditar guias específicas aqui.
                    </p>
                    <button
                      onClick={() => setAba("guias")}
                      className="mt-4 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      Ir para Guias do Lote
                    </button>
                  </div>
                ) : (
                  <GuidesTable 
                    guias={(audit?.guias || []).filter((g) => selectedGuideIds.includes(g.id))} 
                    inconsistencias={inconsistenciasVisiveis}
                    selectedGuides={selectedGuideIds}
                    onToggleGuideSelection={handleToggleGuideSelection}
                    onVerNoXml={(linha) => {
                      setLinhaDestaque(linha);
                      setAba('split');
                    }}
                    onSincronizarGuia={handleSincronizarGuia}
                    onSincronizarProcedimento={handleSincronizarProcedimento}
                    onExcluirGuia={handleExcluirGuia}
                    onExcluirProcedimento={handleExcluirProcedimento}
                  />
                )}
              </div>
              <div className={cn("min-h-0 flex-1 flex-col lg:flex-row transition-opacity duration-150", (aba !== "guias" && aba !== "guias-individuais") ? "flex animate-in fade-in duration-150" : "hidden")}>
                <section className={cn("flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-150", (aba === "split" || aba === "raw") ? "flex animate-in fade-in duration-150" : "hidden")}>
                  {avancado ? (
                    <Editor
                      dark={dark}
                      arquivo={arquivoAtivo}
                      inconsistencias={inconsistenciasVisiveis}
                      linhaDestaque={linhaDestaque}
                      onGerarHash={handleGerarHash}
                      onSalvar={() => void handleSalvarAtualizar()}
                      onOpenSaveAs={() => setModalSaveAsAberto(true)}
                      onUpdateConteudo={(c, precisaHash = true) => atualizarConteudoArquivoAtivo(c, precisaHash)}
                      onNotify={mostrarToast}
                    />
                  ) : (
                    <ResumoSimples audit={audit} inconsistencias={inconsistenciasVisiveis} />
                  )}
                </section>
                <PainelAuditoria 
                  className={cn(
                    (aba === "split" || aba === "corr") ? "flex animate-in fade-in duration-150" : "hidden",
                    aba === "corr" ? "lg:w-full lg:border-l-0" : ""
                  )}
                  avancado={avancado} 
                  inconsistencias={inconsistenciasVisiveis}
                  ignoredCount={ignoredIdsAtivos.size}
                  onRestoreIgnored={handleRestaurarIgnorados}
                  onApplySafe={handleApplySafeCorrections}
                  onApplyCorrection={handleApplyCorrection}
                  onIgnoreError={handleIgnorarErro}
                  onDeleteLine={handleExcluirLinha}
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

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed bottom-4 right-4 z-50 flex max-w-md items-center gap-3 rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg transition-all",
            sevToken[toast.tone].bg,
            sevToken[toast.tone].border,
            sevToken[toast.tone].text
          )}
        >
          <span className="flex-1">{toast.mensagem}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Fechar notificação"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}


function getHighlightTheme(dark: boolean) {
  return EditorView.theme({
    ".cm-gutters": {
      backgroundColor: dark ? "#141824 !important" : "#f1f5f9 !important",
      color: dark ? "#94a3b8 !important" : "#475569 !important",
      borderRight: dark ? "1px solid #283044 !important" : "1px solid #e2e8f0 !important",
    },
    ".cm-activeLineGutter": {
      backgroundColor: dark ? "#1e2538 !important" : "#e2e8f0 !important",
      color: dark ? "#f8fafc !important" : "#0f172a !important",
    },
    ".cm-error-gutter": { color: dark ? "#fca5a5 !important" : "#b91c1c !important", backgroundColor: "rgba(239, 68, 68, 0.16) !important" },
    ".cm-warn-gutter": { color: dark ? "#fde047 !important" : "#b45309 !important", backgroundColor: "rgba(234, 179, 8, 0.16) !important" },
    ".cm-active-gutter": { color: dark ? "#ffffff !important" : "#0f172a !important", backgroundColor: dark ? "rgba(255, 255, 255, 0.14) !important" : "rgba(15, 23, 42, 0.1) !important" },
    ".cm-error-line": { backgroundColor: "rgba(239, 68, 68, 0.14) !important" },
    ".cm-warn-line": { backgroundColor: "rgba(234, 179, 8, 0.14) !important" },
    ".cm-active-line": { backgroundColor: dark ? "rgba(255, 255, 255, 0.10) !important" : "rgba(59, 130, 246, 0.08) !important" },
    ".cm-searchMatch": { backgroundColor: "rgba(234, 179, 8, 0.35) !important", outline: "1px solid rgba(234, 179, 8, 0.6) !important" },
    ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "rgba(59, 130, 246, 0.45) !important", outline: "2px solid #3b82f6 !important" }
  });
}

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
      const lineMap = new Map<number, { crit: boolean; warn: boolean }>();
      inconsistencias.forEach(inc => {
        const isError = isCritico(inc);
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
          } catch {}
        }
      }
      return builder.finish();
    },
    update(gutters, tr) {
      return gutters.map(tr.changes);
    }
  });

  return [field, gutterLineClass.compute([field], state => state.field(field))];
}

function getHighlightExtension(inconsistencias: Inconsistency[], linhaDestaque: number | null, dark: boolean) {
  return [
    getHighlightTheme(dark),
    EditorView.decorations.of((view) => {
      const builder = new RangeSetBuilder<Decoration>();
      const lineMap = new Map<number, { crit: boolean; warn: boolean }>();
      inconsistencias.forEach(inc => {
        const isError = isCritico(inc);
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
          } catch {}
        }
      }
      return builder.finish();
    })
  ];
}

function Editor({
  dark,
  arquivo,
  inconsistencias,
  linhaDestaque,
  onGerarHash,
  onSalvar,
  onOpenSaveAs,
  onUpdateConteudo,
  onNotify,
}: {
  dark: boolean;
  arquivo?: LoadedFile;
  inconsistencias: Inconsistency[];
  linhaDestaque: number | null;
  onGerarHash: () => void;
  onSalvar: () => void;
  onOpenSaveAs: () => void;
  onUpdateConteudo: (c: string, precisaGerarHash?: boolean) => void;
  onNotify: (msg: string, tone?: ToastTone) => void;
}) {
  const viewRef = useRef<any>(null);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);

  const matches = useMemo(() => {
    if (!findText.trim() || !arquivo?.conteudo) return [];
    const text = arquivo.conteudo;
    const lowerText = text.toLowerCase();
    const query = findText.toLowerCase();
    const results: { from: number; to: number; line: number }[] = [];

    let pos = 0;
    let currentLine = 1;
    let lastNewlinePos = -1;

    const MAX_MATCHES = 500;
    while (pos < lowerText.length && results.length < MAX_MATCHES) {
      const idx = lowerText.indexOf(query, pos);
      if (idx === -1) break;

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
    } catch {}
  };

  useEffect(() => {
    if (!findText.trim()) {
      setCurrentMatchIndex(-1);
      if (viewRef.current?.view) {
        try {
          viewRef.current.view.dispatch({
            effects: setSearchQuery.of(new SearchQuery({ search: "" }))
          });
        } catch {}
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
    const matchesCount = (arquivo.conteudo.match(regex) || []).length;
    if (matchesCount === 0) {
      onNotify("Nenhuma ocorrência encontrada para substituir.", "warn");
      return;
    }
    const newContent = arquivo.conteudo.replace(regex, replaceText);
    onUpdateConteudo(newContent, true);
    onNotify(`${matchesCount} ocorrência(s) substituída(s).`, "ok");
  };

  const handleFormatXml = () => {
    if (!arquivo) return;
    if (!arquivo.conteudo || !arquivo.conteudo.trim()) {
      onNotify("Conteúdo XML vazio.", "warn");
      return;
    }
    const formatted = formatXmlBruto(arquivo.conteudo);
    onUpdateConteudo(formatted, arquivo.precisaGerarHash);
    onNotify("XML formatado e identado com sucesso!", "ok");
  };

  const handleCopyXml = async () => {
    if (!arquivo) return;
    try {
      await navigator.clipboard.writeText(arquivo.conteudo);
      onNotify("XML copiado para a área de transferência.", "ok");
    } catch {
      onNotify("Não foi possível acessar a área de transferência.", "warn");
    }
  };

  useEffect(() => {
    if (linhaDestaque && viewRef.current) {
      const view = viewRef.current.view;
      if (view) {
        try {
          const line = view.state.doc.line(Math.min(linhaDestaque, view.state.doc.lines));
          view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'center' }) });
          view.dispatch({ selection: { anchor: line.from, head: line.to } });
        } catch {}
      }
    }
  }, [linhaDestaque]);

  if (!arquivo) return null;
  const linhas = arquivo.conteudo.split('\n');

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-2 text-[11px] bg-surface">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono">{arquivo.nome}</span>
            <span className="text-muted-foreground">·</span>
            <span className={cn("shrink-0 font-medium tabular-nums", inconsistencias.length > 0 ? "text-crit" : "text-ok")}>
              {inconsistencias.length} inconsistências
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
            <span>Linhas: <strong className="text-foreground font-mono">{linhas.length}</strong></span>
            <span className="w-px h-2.5 bg-border"></span>
            <span>Chars: <strong className="text-foreground font-mono">{arquivo.conteudo.length}</strong></span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded px-2 py-1 flex-1 min-w-[180px] max-w-[260px]">
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
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
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
                  className="p-0.5 hover:bg-surface rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button 
                  onClick={handleNext} 
                  disabled={matches.length === 0} 
                  title="Próxima ocorrência (Enter)" 
                  className="p-0.5 hover:bg-surface rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded px-2 py-1 flex-1 min-w-[140px] max-w-[190px]">
            <input type="text" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Substituir por..." className="bg-transparent outline-none w-full placeholder:text-muted-foreground font-mono text-[11px]" />
          </div>
          <button onClick={handleReplaceAll} disabled={!findText} className="whitespace-nowrap rounded bg-primary/15 text-primary border border-primary/30 px-2 py-1 font-medium hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Substituir Tudo
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                const view = viewRef.current?.view;
                if (view) {
                  view.focus();
                  startCompletion(view);
                }
              }}
              title="Seletor inteligente de tags e valores TISS ANS (Ctrl+Espaço)"
              className="flex items-center gap-1 whitespace-nowrap rounded border border-primary/40 bg-primary/10 px-2 py-1 font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Tags className="size-3" />
              Tags TISS
            </button>
            <button
              onClick={() => viewRef.current?.view && undo(viewRef.current.view)}
              title="Desfazer (Ctrl+Z)"
              className="rounded border border-border bg-surface-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Undo2 className="size-3.5" />
            </button>
            <button
              onClick={() => viewRef.current?.view && redo(viewRef.current.view)}
              title="Refazer (Ctrl+Y)"
              className="rounded border border-border bg-surface-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Redo2 className="size-3.5" />
            </button>
            <button
              onClick={onGerarHash}
              title="Validar estrutura segura e assinar nova Hash MD5 no XML"
              className={cn(
                "flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1 font-medium transition-colors",
                arquivo.precisaGerarHash
                  ? "border-warn/60 bg-warn-surface text-warn hover:opacity-90"
                  : "border-info/40 bg-info-surface/20 text-info hover:bg-info-surface"
              )}
            >
              <Hash className="size-3" />
              {arquivo.precisaGerarHash ? "Gerar Hash*" : "Gerar Hash"}
            </button>
            <button
              onClick={handleFormatXml}
              title="Formatar apenas a indentação do XML (sem alterar tags ou valores)"
              className="whitespace-nowrap rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              Formatar
            </button>
            <button onClick={() => void handleCopyXml()} className="whitespace-nowrap rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors">
              Copiar
            </button>
            <button
              onClick={onSalvar}
              title="Salvar alterações com Hash MD5 atualizada (Ctrl+S)"
              className="flex items-center gap-1 whitespace-nowrap rounded bg-ok px-2.5 py-1 font-medium text-ok-surface hover:opacity-90 transition-opacity"
            >
              <Save className="size-3" />
              Salvar
            </button>
            <button onClick={onOpenSaveAs} className="whitespace-nowrap rounded border border-primary/40 text-primary px-2 py-1 font-medium hover:bg-primary/10 transition-colors">
              Salvar Como...
            </button>
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
            getTissAutocompleteExtension(dark),
            search({ top: true }),
            lineNumbers(),
            highlightActiveLine(),
            getHighlightExtension(inconsistencias, linhaDestaque, dark),
            getGutterExtension(inconsistencias, linhaDestaque),
            keymap.of([
              {
                key: "Mod-s",
                preventDefault: true,
                run: () => {
                  onSalvar();
                  return true;
                },
              },
              {
                key: "Mod-Shift-s",
                preventDefault: true,
                run: () => {
                  onOpenSaveAs();
                  return true;
                },
              },
            ]),
          ]}
          onChange={(value) => {
            onUpdateConteudo(value, true);
          }}
          className="flex-1 text-[13px] leading-relaxed"
          theme={dark ? "dark" : "light"}
        />
      </div>
    </>
  );
}

function ResumoSimples({ audit, inconsistencias }: { audit?: AuditResult | null; inconsistencias: Inconsistency[] }) {
  if (!audit) return null;
  const { criticos: numCrit, avisos: numWarn } = contarPorSeveridade(inconsistencias);

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-[26px] font-semibold tracking-tight text-foreground">
          Revisão do Lote
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground max-w-[65ch]">
          O motor de auditoria identificou <span className="font-medium text-foreground">{inconsistencias.length} pontos de atenção</span> estruturais e de negócio no XML. Dentre eles, existem <strong className="font-medium text-crit">{numCrit} erros críticos</strong> que causarão rejeição imediata no webservice da operadora.
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
            desc="Guias validadas no escopo deste lote."
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
      <div className={cn("font-display text-[28px] font-semibold tracking-tight tabular-nums shrink-0 px-2", t.text)}>
        {valor}
      </div>
    </div>
  );
}

function PainelAuditoria({ 
  avancado, 
  inconsistencias,
  ignoredCount,
  onRestoreIgnored,
  onApplySafe,
  onApplyCorrection,
  onIgnoreError,
  onDeleteLine,
  onViewInXml,
  className
}: { 
  avancado: boolean, 
  inconsistencias: Inconsistency[],
  ignoredCount: number,
  onRestoreIgnored: () => void,
  onApplySafe: () => void,
  onApplyCorrection: (inc: Inconsistency) => void,
  onIgnoreError: (id: string) => void,
  onDeleteLine: (linha: number) => void,
  onViewInXml: (linha: number) => void,
  className?: string
}) {
  const [filtroSev, setFiltroSev] = useState<'todos' | 'criticos' | 'avisos'>('todos');
  const icones = { crit: CircleAlert, warn: AlertTriangle, info: Info };
  const { criticos: numCrit, avisos: numWarn } = contarPorSeveridade(inconsistencias);
  const safeCount = inconsistencias.filter(i => i.seguro).length;

  const filtradas = useMemo(() => {
    if (filtroSev === 'criticos') return inconsistencias.filter(isCritico);
    if (filtroSev === 'avisos') return inconsistencias.filter((i) => !isCritico(i));
    return inconsistencias;
  }, [inconsistencias, filtroSev]);

  return (
    <aside className={cn("flex w-full shrink-0 flex-col border-t border-border/60 bg-background lg:w-[400px] lg:border-l lg:border-t-0", className)}>
      <div className="flex flex-col gap-3 border-b border-border/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-[16px] font-semibold tracking-tight text-foreground">
              {avancado ? "Registro de Auditoria" : "Atenção Necessária"}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground tabular-nums">
              <span>{inconsistencias.length} itens detectados</span>
              {ignoredCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onRestoreIgnored}
                    className="text-info hover:underline"
                  >
                    Restaurar {ignoredCount} ignorado(s)
                  </button>
                </>
              )}
            </div>
          </div>
          {numCrit > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-crit tabular-nums">
              <CircleAlert className="size-3.5" />
              {numCrit} críticos
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-surface p-0.5 text-[11px] tabular-nums">
          <button
            type="button"
            onClick={() => setFiltroSev('todos')}
            className={cn(
              "flex-1 rounded-md px-2 py-1 font-medium transition-colors whitespace-nowrap",
              filtroSev === 'todos' ? "bg-surface-2 text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todos ({inconsistencias.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroSev('criticos')}
            className={cn(
              "flex-1 rounded-md px-2 py-1 font-medium transition-colors whitespace-nowrap",
              filtroSev === 'criticos' ? "bg-crit-surface text-crit shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Críticos ({numCrit})
          </button>
          <button
            type="button"
            onClick={() => setFiltroSev('avisos')}
            className={cn(
              "flex-1 rounded-md px-2 py-1 font-medium transition-colors whitespace-nowrap",
              filtroSev === 'avisos' ? "bg-warn-surface text-warn shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Avisos ({numWarn})
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 bg-surface/30">
        {inconsistencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-ok/30 bg-ok-surface/40 p-8 text-center">
            <ShieldCheck className="size-10 text-ok mb-3" />
            <p className="font-display text-sm font-semibold text-ok">Lote 100% no padrão ANS</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Nenhuma inconsistência de schema XSD, regras de negócio ou estrutura foi detectada neste lote.
            </p>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Nenhuma inconsistência corresponde ao filtro selecionado.
          </div>
        ) : (
          filtradas.map((inc) => {
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
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70 bg-background/50 px-1.5 py-0.5 rounded border border-border/40">
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
                        <button
                          type="button"
                          onClick={() => onApplyCorrection(inc)}
                          className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-all duration-150 ease-out hover:opacity-90 hover:shadow-md active:scale-[0.97]"
                        >
                          Aplicar Correção
                        </button>
                      )}
                      {avancado && (
                        <button
                          type="button"
                          onClick={() => onViewInXml(inc.linha)}
                          className="rounded-md border border-border/60 bg-surface px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-150 hover:border-border hover:text-foreground active:scale-[0.97]"
                        >
                          Localizar no XML
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onIgnoreError(inc.id)}
                        className="rounded-md border border-border/60 bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                        title="Ocultar esta inconsistência"
                      >
                        Ignorar
                      </button>
                      {avancado && inc.linha > 0 && (
                        <button
                          type="button"
                          onClick={() => onDeleteLine(inc.linha)}
                          className="rounded-md border border-crit/30 bg-crit/5 px-2.5 py-1.5 text-[11px] font-medium text-crit transition-colors hover:bg-crit/15"
                          title={`Remover linha ${inc.linha} do XML`}
                        >
                          Excluir Linha
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border/60 bg-background p-5">
        <button
          type="button"
          onClick={onApplySafe}
          disabled={safeCount === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-ok/40 bg-ok/10 px-4 py-2.5 text-[13px] font-semibold tracking-wide text-ok transition-all duration-150 hover:bg-ok/20 hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none active:scale-[0.98]"
        >
          <Check className="size-4" /> Aplicar correções seguras ({safeCount})
        </button>
      </div>
    </aside>
  );
}

