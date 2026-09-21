import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Columns2, FileCode, Sparkles, Table, CheckSquare } from 'lucide-react';
import { HeaderBar } from './components/HeaderBar';
import { Sidebar } from './components/Sidebar';
import { AuditPanel } from './components/AuditPanel';
import { GuidesTable } from './components/GuidesTable';
import { XmlEditor } from './components/XmlEditor';
import { HospitalModal } from './components/HospitalModal';
import { ExtratorAnsModal } from './components/ExtratorAnsModal';
import { SaveAsModal } from './components/SaveAsModal';
import { HashReaderModal } from './components/HashReaderModal';
import { CriticalAuditPopup } from './components/CriticalAuditPopup';
import { ToastBar } from './components/ToastBar';
import { useDebounce } from './hooks/useDebounce';
import { LoadedFile, AuditResult, Inconsistency, GuideItem, ProcedimentoItem, ToastState } from './types/tiss';
import {
  executarAuditoriaDinamica,
  sincronizarDadosGuia,
  sincronizarProcedimento,
  aplicarCorrecoesSegurasRecursivo,
  aplicarCorrecaoIndividual,
  exportarXmlValidadoComHash,
  prepararParaExportacaoEHash,
} from './utils/tissAuditor';
import { SAMPLE_TISS_WITH_ERRORS, SAMPLE_TISS_4_SADT } from './utils/sampleXmls';

export default function App() {
  const [arquivos, setArquivos] = useState<LoadedFile[]>([]);
  const [arquivoAtivoId, setArquivoAtivoId] = useState<string | null>(null);
  const [nomeHospital, setNomeHospital] = useState('HOSPITAL H OLHOS');
  const [abaAtiva, setAbaAtiva] = useState<'split' | 'editor' | 'auditoria' | 'guias' | 'guias-individuais'>('split');
  const [linhaDestoque, setLinhaDestoque] = useState<number | null>(null);
  const [modalHospitalAberto, setModalHospitalAberto] = useState(false);
  const [modalExtratorAnsAberto, setModalExtratorAnsAberto] = useState(false);
  const [modalSaveAsAberto, setModalSaveAsAberto] = useState(false);
  const [modalHashReaderAberto, setModalHashReaderAberto] = useState(false);
  
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  
  const [modalCriticalAberto, setModalCriticalAberto] = useState(false);
  const [criticalErrors, setCriticalErrors] = useState<Inconsistency[]>([]);
  const shownCriticalForFile = useRef<Set<string>>(new Set());

  const [toast, setToast] = useState<ToastState>({
    mensagem: 'Sistema pronto.',
    cor: '#00b4d8',
    visivel: true,
  });

  const mostrarToast = useCallback((mensagem: string, cor: string = '#00b4d8', tempo: number = 3500) => {
    setToast({ mensagem, cor, visivel: true });
    setTimeout(() => {
      setToast((prev) =>
        prev.mensagem === mensagem
          ? { mensagem: 'Aguardando próxima ação...', cor: '#1a1d1e', visivel: true }
          : prev
      );
    }, tempo);
  }, []);

  // Initial setup - load sample TISS 3.05 on start or from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tiss-autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.arquivos && parsed.arquivos.length > 0) {
          const loadedArquivos = parsed.arquivos.map((a: any) => ({
            ...a,
            dataCarregamento: new Date(a.dataCarregamento || Date.now()),
            ultimaAtualizacao: new Date(a.ultimaAtualizacao || Date.now()),
          }));
          setArquivos(loadedArquivos);
          setArquivoAtivoId(parsed.arquivoAtivoId || loadedArquivos[0].id);
          setToast({ mensagem: 'Sessão restaurada a partir do auto-salvamento.', cor: '#e9c46a', visivel: true });
          setTimeout(() => setToast(prev => prev.mensagem === 'Sessão restaurada a partir do auto-salvamento.' ? { mensagem: 'Aguardando próxima ação...', cor: '#1a1d1e', visivel: true } : prev), 3500);
          return;
        }
      }
    } catch (e) {
      console.warn('Falha ao restaurar auto-salvamento:', e);
    }

    const initialFile: LoadedFile = {
      id: 'lote-exemplo-1',
      nome: 'lote_tiss_305_exemplo.xml',
      conteudo: SAMPLE_TISS_WITH_ERRORS,
      tamanhoBytes: new Blob([SAMPLE_TISS_WITH_ERRORS]).size,
      dataCarregamento: new Date(),
      ultimaAtualizacao: new Date(),
    };
    setArquivos([initialFile]);
    setArquivoAtivoId(initialFile.id);
  }, []);

  // Auto-save to localStorage with 30s debounce
  useEffect(() => {
    if (arquivos.length === 0) return;
    
    const handler = setTimeout(() => {
      try {
        const arquivosToSave = arquivos.map(a => ({
          id: a.id,
          nome: a.nome,
          conteudo: a.conteudo,
          tamanhoBytes: a.tamanhoBytes,
          dataCarregamento: a.dataCarregamento,
          ultimaAtualizacao: a.ultimaAtualizacao,
          precisaGerarHash: a.precisaGerarHash
        }));
        
        localStorage.setItem('tiss-autosave', JSON.stringify({
          arquivos: arquivosToSave,
          arquivoAtivoId
        }));
        console.log('Autosave concluído');
      } catch (e) {
        console.warn('Falha ao executar auto-salvamento:', e);
      }
    }, 30000); // 30 seconds

    return () => clearTimeout(handler);
  }, [arquivos, arquivoAtivoId]);

  // Get active file
  const arquivoAtivo = useMemo(() => {
    return arquivos.find((a) => a.id === arquivoAtivoId) || null;
  }, [arquivos, arquivoAtivoId]);

  const debouncedArquivoAtivo = useDebounce(arquivoAtivo, 500);
  
  // Only debounce when typing in the editor or split view. Otherwise, use synchronous updates to prevent stale indices on button clicks.
  const activeFileForAudit = (abaAtiva === 'editor' || abaAtiva === 'split') ? debouncedArquivoAtivo : arquivoAtivo;

  // Perform dynamic audit on active file
  const auditResultActive: AuditResult | null = useMemo(() => {
    if (!activeFileForAudit) return null;
    return executarAuditoriaDinamica(activeFileForAudit.conteudo);
  }, [activeFileForAudit, nomeHospital]);

  // Compute error counts for all loaded files, caching to avoid blocking on keystrokes
  const fileAuditCache = useRef<Record<string, { conteudo: string; count: number }>>({});
  const erroCountsByFileId = useMemo(() => {
    const counts: Record<string, number> = {};
    arquivos.forEach((f) => {
      // If it's the active file and it matches the debounced version, update cache
      if (f.id === arquivoAtivoId && auditResultActive && activeFileForAudit && f.conteudo === activeFileForAudit.conteudo) {
        fileAuditCache.current[f.id] = { conteudo: f.conteudo, count: auditResultActive.inconsistencias.length };
        counts[f.id] = auditResultActive.inconsistencias.length;
      } else {
        const cached = fileAuditCache.current[f.id];
        if (cached && cached.conteudo === f.conteudo) {
          counts[f.id] = cached.count;
        } else {
           // Only compute if we really need to (e.g. newly loaded file). 
           // If the active file is currently being typed in, we return the cached count instead of re-evaluating synchronously.
           if (f.id === arquivoAtivoId && cached) {
             counts[f.id] = cached.count;
           } else {
             const res = executarAuditoriaDinamica(f.conteudo);
             fileAuditCache.current[f.id] = { conteudo: f.conteudo, count: res.inconsistencias.length };
             counts[f.id] = res.inconsistencias.length;
           }
        }
      }
    });
    return counts;
  }, [arquivos, nomeHospital, arquivoAtivoId, auditResultActive, activeFileForAudit]);

  useEffect(() => {
    if ((abaAtiva === 'auditoria' || abaAtiva === 'split') && arquivoAtivoId && auditResultActive) {
      if (!shownCriticalForFile.current.has(arquivoAtivoId)) {
        const criticos = auditResultActive.inconsistencias.filter(i => 
          i.tipo === "Erro Órfão" && 
          (i.desc.includes('conselhoProfissional') || 
           i.desc.includes('codigoProfissional') || 
           i.desc.includes('cnpjContratado') || 
           i.desc.includes('cpfContratado') ||
           i.desc.includes('registroANS') ||
           i.desc.includes('numeroConselhoProfissional'))
        );
        if (criticos.length > 1) { // Múltiplas tags vazias críticas
          setCriticalErrors(criticos);
          setModalCriticalAberto(true);
        }
        shownCriticalForFile.current.add(arquivoAtivoId);
      }
    }
  }, [abaAtiva, arquivoAtivoId, auditResultActive]);

  // Keyboard shortcuts (Ctrl+S, Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSalvarAtualizar();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleProcessarLote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [arquivoAtivo, auditResultActive]);

  const downloadArquivo = (filename: string, content: string) => {
    const bytesISO = prepararParaExportacaoEHash(content, arquivoAtivo?.eolOriginal);
    const blob = new Blob([bytesISO], { type: 'application/xml;charset=iso-8859-1' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // File Handlers
  const handleAdicionarArquivos = (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawText = e.target?.result as string;
        if (rawText) {
          const eolOriginal: '\r\n' | '\n' = rawText.includes('\r\n') ? '\r\n' : '\n';
          // Limpeza global de caracteres ASCII de controle inválidos em XML e normalização interna para \n
          const text = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/\r\n/g, '\n');
          const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const newFile: LoadedFile = {
            id: fileId,
            nome: file.name,
            conteudo: text,
            tamanhoBytes: file.size,
            dataCarregamento: new Date(),
            ultimaAtualizacao: new Date(),
            eolOriginal,
          };
          setArquivos((prev) => [...prev.filter((f) => f.nome !== file.name), newFile]);
          setArquivoAtivoId(fileId);
        }
      };
      reader.readAsText(file, 'ISO-8859-1');
    });

    mostrarToast(`📄 ${filesArray.length} arquivo(s) adicionado(s) com sucesso!`, '#2a9d8f');
  };

  const handleCarregarExemplo = (tipo: 'erros' | 'sadt') => {
    const conteudo = tipo === 'erros' ? SAMPLE_TISS_WITH_ERRORS : SAMPLE_TISS_4_SADT;
    const nome = tipo === 'erros' ? 'lote_tiss_305_exemplo.xml' : 'lote_tiss_401_sadt.xml';
    const fileId = `exemplo-${tipo}-${Date.now()}`;

    const newFile: LoadedFile = {
      id: fileId,
      nome,
      conteudo,
      tamanhoBytes: new Blob([conteudo]).size,
      dataCarregamento: new Date(),
      ultimaAtualizacao: new Date(),
    };

    setArquivos((prev) => [newFile, ...prev.filter((a) => a.nome !== nome)]);
    setArquivoAtivoId(fileId);
    mostrarToast(`✨ Lote exemplo ${nome} carregado!`, '#00b4d8');
  };

  const handleAdicionarTextoDireto = (nome: string, conteudoBruto: string) => {
    const fileId = `paste-${Date.now()}`;
    const conteudo = conteudoBruto.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    const newFile: LoadedFile = {
      id: fileId,
      nome,
      conteudo,
      tamanhoBytes: new Blob([conteudo]).size,
      dataCarregamento: new Date(),
      ultimaAtualizacao: new Date(),
    };
    setArquivos((prev) => [newFile, ...prev]);
    setArquivoAtivoId(fileId);
    mostrarToast(`📄 ${nome} criado e carregado!`, '#2a9d8f');
  };

  const handleRemoverArquivo = (id: string) => {
    setArquivos((prev) => prev.filter((a) => a.id !== id));
    if (arquivoAtivoId === id) {
      const remaining = arquivos.filter((a) => a.id !== id);
      setArquivoAtivoId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Content Update Helper
  const atualizarConteudoArquivoAtivo = (novoConteudo: string, setNeedsHash: boolean = true) => {
    if (!arquivoAtivoId) return;
    setArquivos((prev) =>
      prev.map((a) =>
        a.id === arquivoAtivoId
          ? {
              ...a,
              conteudo: novoConteudo,
              tamanhoBytes: new Blob([novoConteudo]).size,
              precisaGerarHash: setNeedsHash,
              ultimaAtualizacao: new Date(),
            }
          : a
      )
    );
  };

  // Actions
  const handleProcessarLote = () => {
    if (!arquivoAtivo) return;
    mostrarToast('⏳ Analisando regras ANS e XSD...', '#e9c46a');
    setTimeout(() => {
      const res = executarAuditoriaDinamica(arquivoAtivo.conteudo);
      const errorCount = res.inconsistencias.length;
      if (errorCount > 0) {
        mostrarToast(`🔍 Auditado: ${errorCount} inconsistência(s) encontrada(s).`, '#e63946', 4000);
      } else {
        mostrarToast('✅ Validação Concluída: Lote 100% no padrão ANS!', '#2a9d8f', 4000);
      }
    }, 200);
  };

  const handleCorrigirTudoSeguro = () => {
    if (!arquivoAtivo) return;
    const { novoConteudo, totalCorrigidos } = aplicarCorrecoesSegurasRecursivo(arquivoAtivo.conteudo);

    if (totalCorrigidos > 0) {
      atualizarConteudoArquivoAtivo(novoConteudo);
      mostrarToast(`✨ ${totalCorrigidos} correções estruturais aplicadas com sucesso!`, '#2a9d8f', 4000);
    } else {
      mostrarToast('Nenhuma correção segura pendente.', '#1a1d1e');
    }
  };

  const handleAplicarCorrecao = (erro: Inconsistency) => {
    if (!arquivoAtivo) return;
    const { novoConteudo, sucesso } = aplicarCorrecaoIndividual(arquivoAtivo.conteudo, erro);

    if (sucesso) {
      atualizarConteudoArquivoAtivo(novoConteudo);
      mostrarToast(`✓ Correção aplicada na linha ${erro.linha}!`, '#2a9d8f');
    } else {
      mostrarToast('Aviso: Estrutura alterada. Reiniciando análise.', '#e63946');
    }
  };

  const handleIgnorarErro = () => {
    // Dismiss toast or filter
    mostrarToast('Inconsistência ignorada.', '#2a2d2e', 2000);
  };

  const handleExcluirLinha = (linhaNum: number) => {
    if (!arquivoAtivo) return;
    const linhas = arquivoAtivo.conteudo.split('\n');
    if (linhaNum > 0 && linhaNum <= linhas.length) {
      linhas.splice(linhaNum - 1, 1);
      atualizarConteudoArquivoAtivo(linhas.join('\n'));
      mostrarToast(`✓ Linha ${linhaNum} excluída!`, '#2a9d8f');
    }
  };

  const handleGerarHash = () => {
    if (!arquivoAtivo) return;

    // 1. Verificação prévia da estrutura do XML
    const auditInicial = executarAuditoriaDinamica(arquivoAtivo.conteudo);
    let conteudoParaHash = arquivoAtivo.conteudo;
    let totalCorrigidos = 0;

    if (auditInicial.inconsistencias.length > 0) {
      // 2. Aponta e corrige inconsistências de forma segura
      const resCorrecao = aplicarCorrecoesSegurasRecursivo(arquivoAtivo.conteudo);
      conteudoParaHash = resCorrecao.novoConteudo;
      totalCorrigidos = resCorrecao.totalCorrigidos;
    }

    // 3. Gera a nova Hash com a estrutura validada/corrigida
    const { novoConteudo, hashCalculado, sucesso, erroMsg } = exportarXmlValidadoComHash(conteudoParaHash);

    if (sucesso) {
      atualizarConteudoArquivoAtivo(novoConteudo, false);
      if (totalCorrigidos > 0) {
        mostrarToast(`🔍 Estrutura verificada e ${totalCorrigidos} erro(s) corrigido(s)! ✓ Nova Hash MD5: ${hashCalculado}`, '#2a9d8f', 5000);
      } else if (auditInicial.inconsistencias.length === 0) {
        mostrarToast(`✅ Estrutura 100% válida! ✓ Nova Hash MD5 Gerada: ${hashCalculado}`, '#2a9d8f', 4000);
      } else {
        mostrarToast(`✓ Nova Hash MD5 Gerada: ${hashCalculado} (Restam ${auditInicial.inconsistencias.length} aviso(s))`, '#e9c46a', 5000);
      }
    } else {
      mostrarToast(`Erro ao gerar Hash: ${erroMsg}`, '#e63946', 4000);
    }
  };

  const handleSalvarAtualizar = useCallback(async () => {
    if (!arquivoAtivo) return;

    // Recalcula a Hash e atualiza o conteúdo no estado da aplicação
    const { novoConteudo, hashCalculado, sucesso, erroMsg } = exportarXmlValidadoComHash(arquivoAtivo.conteudo);
    const finalContent = sucesso ? novoConteudo : arquivoAtivo.conteudo;
    
    let updatedFileHandle = arquivoAtivo.fileHandle;

    // Solicita onde salvar fisicamente (e mantém referência) caso ainda não tenhamos o fileHandle
    if (!updatedFileHandle && 'showSaveFilePicker' in window) {
      try {
        updatedFileHandle = await (window as any).showSaveFilePicker({
          suggestedName: arquivoAtivo.nome,
          types: [{ description: 'Arquivo XML TISS', accept: { 'text/xml': ['.xml'] } }],
        });
        
        // Atualiza o Handle no state
        setArquivos((prev) => 
          prev.map((f) => 
            f.id === arquivoAtivo.id ? { ...f, fileHandle: updatedFileHandle } : f
          )
        );
      } catch (err) {
        console.warn('Operação de salvar arquivo cancelada ou indisponível', err);
      }
    }

    // Aplica o novo conteúdo localmente na UI
    atualizarConteudoArquivoAtivo(finalContent, false);

    let salvoNoDisco = false;
    
    if (updatedFileHandle) {
      try {
        const uint8Array = prepararParaExportacaoEHash(finalContent, arquivoAtivo.eolOriginal);
        const writable = await updatedFileHandle.createWritable();
        await writable.write(uint8Array);
        await writable.close();
        salvoNoDisco = true;
      } catch (err) {
        console.warn('Salvamento no disco falhou, estado mantido no sistema:', err);
      }
    }

    if (sucesso) {
      if (salvoNoDisco) {
        mostrarToast(`💾 Arquivo salvo no disco com sucesso! Hash: ${hashCalculado}`, '#2a9d8f', 4000);
      } else {
        mostrarToast(`💾 Estado do arquivo "${arquivoAtivo.nome}" salvo no sistema! | Hash MD5: ${hashCalculado}`, '#2a9d8f', 4000);
      }
    } else {
      if (salvoNoDisco) {
        mostrarToast(`💾 Arquivo salvo no disco! (Aviso Hash: ${erroMsg})`, '#e9c46a', 4000);
      } else {
        mostrarToast(`💾 Estado do arquivo salvo no sistema! (Aviso Hash: ${erroMsg})`, '#e9c46a', 4000);
      }
    }
  }, [arquivoAtivo, mostrarToast]);

  const handleAbrirSalvarComo = useCallback(() => {
    if (!arquivoAtivo) {
      mostrarToast('Nenhum lote XML aberto para "Salvar Como".', '#e63946');
      return;
    }
    setModalSaveAsAberto(true);
  }, [arquivoAtivo, mostrarToast]);

  const handleSalvarComoSucesso = (
    novoNome: string,
    novoConteudo: string,
    acao: 'download' | 'novo_no_sistema'
  ) => {
    if (acao === 'novo_no_sistema') {
      const novoFile: LoadedFile = {
        id: `file_saved_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nome: novoNome,
        conteudo: novoConteudo,
        tamanhoBytes: new Blob([novoConteudo]).size,
        dataCarregamento: new Date(),
        precisaGerarHash: false,
        ultimaAtualizacao: new Date(),
      };
      setArquivos((prev) => [novoFile, ...prev]);
      setArquivoAtivoId(novoFile.id);
      mostrarToast(`✨ Novo arquivo "${novoNome}" ativado no painel!`, '#2a9d8f', 4500);
    } else {
      if (arquivoAtivo) {
        atualizarConteudoArquivoAtivo(novoConteudo, false);
      }
      mostrarToast(`💾 Salvo como "${novoNome}" no seu computador!`, '#2a9d8f', 4500);
    }
  };

  // Atalhos de teclado globais: Ctrl+S (Salvar) e Ctrl+Shift+S (Salvar Como)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();

        if (e.shiftKey) {
          handleAbrirSalvarComo();
        } else {
          handleSalvarAtualizar();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleSalvarAtualizar, handleAbrirSalvarComo]);

  const handleSincronizarGuia = (
    guide: GuideItem,
    novosDados: { carteira: string; guia: string; senha: string; guiaPrestador: string }
  ) => {
    if (!arquivoAtivo) return;
    const { novoConteudo, alterado } = sincronizarDadosGuia(arquivoAtivo.conteudo, guide, novosDados);

    if (alterado) {
      atualizarConteudoArquivoAtivo(novoConteudo);
      mostrarToast('✨ Edição sincronizada com o XML isolado!', '#2a9d8f');
    } else {
      mostrarToast('Nenhuma alteração detectada na guia.', '#1a1d1e');
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
      atualizarConteudoArquivoAtivo(novoConteudo);
      mostrarToast('✨ Procedimento sincronizado com sucesso!', '#2a9d8f');
    } else {
      mostrarToast('Nenhuma alteração detectada no procedimento.', '#1a1d1e');
    }
  };

  const handleExcluirGuia = (guide: GuideItem) => {
    if (!arquivoAtivo) return;
    const before = arquivoAtivo.conteudo.substring(0, guide.startIdx);
    const after = arquivoAtivo.conteudo.substring(guide.endIdx);
    let novoConteudo = before + after;
    atualizarConteudoArquivoAtivo(novoConteudo);
    mostrarToast('🗑️ Guia excluída com sucesso!', '#e63946');
  };

  const handleExcluirProcedimento = (proc: { startIdx: number; endIdx: number }) => {
    if (!arquivoAtivo) return;
    const before = arquivoAtivo.conteudo.substring(0, proc.startIdx);
    const after = arquivoAtivo.conteudo.substring(proc.endIdx);
    let novoConteudo = before + after;
    atualizarConteudoArquivoAtivo(novoConteudo);
    mostrarToast('🗑️ Procedimento excluído com sucesso!', '#e9c46a');
  };

  const handleIrParaLinha = (linha: number) => {
    setLinhaDestoque(linha);
    if (abaAtiva !== 'split' && abaAtiva !== 'editor') {
      setAbaAtiva('split');
    }
  };

  const handleExportarXml = () => {
    if (!arquivoAtivo) return;

    if (arquivoAtivo.precisaGerarHash) {
      mostrarToast('Atenção: Você tem alterações pendentes. Por favor, gere uma nova Hash antes de exportar!', '#e63946', 5000);
      return;
    }

    const { novoConteudo, hashCalculado, sucesso, erroMsg } = exportarXmlValidadoComHash(arquivoAtivo.conteudo);

    if (!sucesso) {
      mostrarToast(erroMsg || 'Falha ao validar exportação.', '#e63946', 5000);
      return;
    }

    // Save content back
    atualizarConteudoArquivoAtivo(novoConteudo, false);

    // Trigger download ISO-8859-1 puro
    const nomeOriginal = arquivoAtivo.nome;
    const nomeNovo = nomeOriginal.replace(/\.xml$/i, '_VALIDADO.xml');
    downloadArquivo(nomeNovo, novoConteudo);

    mostrarToast(`🔒 Assinatura MD5 validada [${hashCalculado?.substring(0, 8)}...]. Salvo: ${nomeNovo}`, '#2a9d8f', 5000);
  };

  const handleExportarRelatorioCsv = () => {
    if (!auditResultActive || auditResultActive.inconsistencias.length === 0) {
      mostrarToast('Nenhuma inconsistência para gerar relatório.', '#e9c46a');
      return;
    }

    const headers = 'Linha;Tipo;Descrição;Original;Sugestao;Seguro\n';
    const rows = auditResultActive.inconsistencias
      .map(
        (i) =>
          `${i.linha};"${i.tipo}";"${i.desc.replace(/"/g, '""')}";"${i.original.replace(/"/g, '""')}";"${i.sugestao.replace(/"/g, '""')}";${i.seguro ? 'SIM' : 'NAO'}`
      )
      .join('\n');

    const csvContent = '\uFEFF' + headers + rows; // Add UTF-8 BOM for Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_auditoria_${arquivoAtivo?.nome || 'tiss'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    mostrarToast('📊 Relatório CSV exportado com sucesso!', '#2a9d8f');
  };

  const handleToggleGuideSelection = (guideId: string) => {
    setSelectedGuideIds(prev => 
      prev.includes(guideId) 
        ? prev.filter(id => id !== guideId)
        : [...prev, guideId]
    );
  };

  const countErrosAtuais = auditResultActive?.inconsistencias.length || 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#121415] text-gray-100 font-sans overflow-hidden select-none">
      {/* Top Header Bar with Clean Hierarchy & Semantic Colors */}
      <HeaderBar
        auditResult={auditResultActive}
        nomeHospital={nomeHospital}
        onOpenHospitalModal={() => setModalHospitalAberto(true)}
        onOpenExtratorAns={() => setModalExtratorAnsAberto(true)}
        onOpenHashReader={() => setModalHashReaderAberto(true)}
        onProcessarLote={handleProcessarLote}
        onExportarXml={handleExportarXml}
        onExportarRelatorio={handleExportarRelatorioCsv}
        temArquivoAtivo={!!arquivoAtivo}
      />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          arquivos={arquivos}
          arquivoAtivoId={arquivoAtivoId}
          onSelecionarArquivo={(id) => {
            setArquivoAtivoId(id);
            setLinhaDestoque(null);
          }}
          onAdicionarArquivos={handleAdicionarArquivos}
          onRemoverArquivo={handleRemoverArquivo}
          onCarregarExemplo={handleCarregarExemplo}
          onAdicionarTextoDireto={handleAdicionarTextoDireto}
          onOpenExtratorAns={() => setModalExtratorAnsAberto(true)}
          erroCountsByFileId={erroCountsByFileId}
        />

        {/* Workspace Main Panel */}
        <main className="flex-1 flex flex-col bg-[#121415] p-2 overflow-hidden min-w-0">
          {arquivoAtivo ? (
            <div className="flex flex-col h-full bg-[#1a1d1e] border border-[#2d3235] rounded-lg overflow-hidden shadow-xl">
              {/* Tabs Navigation */}
              <div className="flex items-center bg-[#0e1111] border-b border-[#2d3235] px-2 pt-1.5 shrink-0 gap-1 overflow-x-auto">
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAbaAtiva('split')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t border-t border-l border-r transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    abaAtiva === 'split'
                      ? 'bg-[#1a1d1e] text-[#00b4d8] border-[#2d3235] border-b-[#1a1d1e] -mb-[1px] z-10 shadow-sm'
                      : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Split View (Editor + Correções)</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      countErrosAtuais > 0 ? 'bg-[#e63946] text-white' : 'bg-emerald-950 text-emerald-400'
                    }`}
                  >
                    {countErrosAtuais}
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAbaAtiva('editor')}
                  className={`px-3 py-2 text-xs font-bold rounded-t border-t border-l border-r transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    abaAtiva === 'editor'
                      ? 'bg-[#1a1d1e] text-[#00b4d8] border-[#2d3235] border-b-[#1a1d1e] -mb-[1px] z-10 shadow-sm'
                      : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>XML Bruto</span>
                </motion.button>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAbaAtiva('auditoria')}
                  className={`px-3 py-2 text-xs font-bold rounded-t border-t border-l border-r transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    abaAtiva === 'auditoria'
                      ? 'bg-[#1a1d1e] text-[#00b4d8] border-[#2d3235] border-b-[#1a1d1e] -mb-[1px] z-10 shadow-sm'
                      : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#e9c46a]" />
                  <span>Painel de Correções</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      countErrosAtuais > 0 ? 'bg-[#e63946] text-white' : 'bg-emerald-950 text-emerald-400'
                    }`}
                  >
                    {countErrosAtuais}
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAbaAtiva('guias')}
                  className={`px-3 py-2 text-xs font-bold rounded-t border-t border-l border-r transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    abaAtiva === 'guias'
                      ? 'bg-[#1a1d1e] text-[#00b4d8] border-[#2d3235] border-b-[#1a1d1e] -mb-[1px] z-10 shadow-sm'
                      : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Guias do Lote ({auditResultActive?.qtdGuiasDeclaradas || auditResultActive?.guias.length || 0})</span>
                </motion.button>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAbaAtiva('guias-individuais')}
                  className={`px-3 py-2 text-xs font-bold rounded-t border-t border-l border-r transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    abaAtiva === 'guias-individuais'
                      ? 'bg-[#1a1d1e] text-[#00b4d8] border-[#2d3235] border-b-[#1a1d1e] -mb-[1px] z-10 shadow-sm'
                      : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Guias Individuais ({selectedGuideIds.length})</span>
                </motion.button>
              </div>

              {/* Tab Content Area */}
              <div className="flex-1 overflow-hidden relative bg-[#121415]">
                {/* Mode 1: Split View (60% Editor / 40% Corrections) */}
                <div className={`h-full ${abaAtiva === 'split' ? 'flex' : 'hidden'} flex-col lg:flex-row gap-2 p-2 overflow-hidden bg-[#121415]`}>
                  {/* Left Pane: XML Editor (60%) */}
                  <div className="w-full lg:w-[58%] h-full flex flex-col bg-[#1a1d1e] rounded-lg border border-[#2d3235] overflow-hidden shadow-md min-w-0">
                    <div className="bg-[#0e1111] px-3.5 py-1.5 border-b border-[#2d3235] flex items-center justify-between text-xs text-gray-300 shrink-0">
                      <div className="flex items-center gap-2 font-bold text-[#00b4d8]">
                        <FileCode className="w-4 h-4" />
                        <span>Editor XML</span>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono bg-[#1a1d1e] px-2 py-0.5 rounded border border-[#2d3235] truncate max-w-[220px]">
                        {arquivoAtivo.nome}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <XmlEditor
                        conteudo={arquivoAtivo.conteudo}
                        onChangeConteudo={atualizarConteudoArquivoAtivo}
                        linhaDestoque={linhaDestoque}
                        onSalvar={handleSalvarAtualizar}
                        onSalvarComo={handleAbrirSalvarComo}
                        onGerarHash={handleGerarHash}
                        precisaGerarHash={arquivoAtivo.precisaGerarHash}
                      />
                    </div>
                  </div>

                  {/* Right Pane: Corrections / Audit Panel (40%) */}
                  <div className="w-full lg:w-[42%] h-full flex flex-col bg-[#1a1d1e] rounded-lg border border-[#2d3235] overflow-hidden shadow-md min-w-0">
                    <div className="bg-[#0e1111] px-3.5 py-1.5 border-b border-[#2d3235] flex items-center justify-between text-xs text-gray-300 shrink-0">
                      <div className="flex items-center gap-2 font-bold text-[#e9c46a]">
                        <Sparkles className="w-4 h-4 text-[#e9c46a]" />
                        <span>Inconsistências & Auditoria</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        countErrosAtuais > 0 ? 'bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/40' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                      }`}>
                        {countErrosAtuais} {countErrosAtuais === 1 ? 'inconsistência' : 'inconsistências'}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <AuditPanel
                        inconsistencias={auditResultActive?.inconsistencias || []}
                        onCorrigirTudoSeguro={handleCorrigirTudoSeguro}
                        onAplicarCorrecao={handleAplicarCorrecao}
                        onIgnorarErro={handleIgnorarErro}
                        onIrParaLinha={handleIrParaLinha}
                        onExcluirLinha={handleExcluirLinha}
                      />
                    </div>
                  </div>
                </div>

                {/* Mode 2: Full Screen XML Editor */}
                <div className={`h-full ${abaAtiva === 'editor' ? 'block' : 'hidden'}`}>
                  <XmlEditor
                    conteudo={arquivoAtivo.conteudo}
                    onChangeConteudo={atualizarConteudoArquivoAtivo}
                    linhaDestoque={linhaDestoque}
                    onSalvar={handleSalvarAtualizar}
                    onSalvarComo={handleAbrirSalvarComo}
                    onGerarHash={handleGerarHash}
                    precisaGerarHash={arquivoAtivo.precisaGerarHash}
                  />
                </div>

                {/* Mode 3: Full Screen Audit Panel */}
                <div className={`h-full flex flex-col ${abaAtiva === 'auditoria' ? 'block' : 'hidden'}`}>
                  <AuditPanel
                    inconsistencias={auditResultActive?.inconsistencias || []}
                    onCorrigirTudoSeguro={handleCorrigirTudoSeguro}
                    onAplicarCorrecao={handleAplicarCorrecao}
                    onIgnorarErro={handleIgnorarErro}
                    onIrParaLinha={handleIrParaLinha}
                    onExcluirLinha={handleExcluirLinha}
                  />
                </div>

                {/* Mode 4: Guias do Lote */}
                <div className={`h-full ${abaAtiva === 'guias' ? 'block' : 'hidden'}`}>
                  <GuidesTable
                    guias={auditResultActive?.guias || []}
                    onSincronizarGuia={handleSincronizarGuia}
                    onSincronizarProcedimento={handleSincronizarProcedimento}
                    onExcluirGuia={handleExcluirGuia}
                    onExcluirProcedimento={handleExcluirProcedimento}
                    selectedGuides={selectedGuideIds}
                    onToggleGuideSelection={handleToggleGuideSelection}
                  />
                </div>

                {/* Mode 5: Guias Individuais Selecionadas */}
                <div className={`h-full ${abaAtiva === 'guias-individuais' ? 'block' : 'hidden'}`}>
                  <GuidesTable
                    guias={(auditResultActive?.guias || []).filter(g => selectedGuideIds.includes(g.id))}
                    onSincronizarGuia={handleSincronizarGuia}
                    onSincronizarProcedimento={handleSincronizarProcedimento}
                    onExcluirGuia={handleExcluirGuia}
                    onExcluirProcedimento={handleExcluirProcedimento}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full border border-dashed border-[#222629] rounded-lg text-gray-500 p-8 text-center">
              <p className="text-sm font-bold text-gray-400 mb-1">Nenhum lote XML selecionado</p>
              <p className="text-xs text-gray-500">
                Selecione ou adicione um arquivo XML na barra lateral para iniciar a auditoria ANS TISS.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Hospital Name Modal */}
      {modalHospitalAberto && (
        <HospitalModal
          nomeAtual={nomeHospital}
          onSalvar={(novo) => {
            setNomeHospital(novo);
            mostrarToast(`Razão social atualizada para: ${novo}`, '#2a9d8f');
          }}
          onFechar={() => setModalHospitalAberto(false)}
        />
      )}

      {/* Extrator ANS Gemini IA Modal */}
      {modalExtratorAnsAberto && (
        <ExtratorAnsModal
          onFechar={() => setModalExtratorAnsAberto(false)}
          onAplicarRazaoSocial={(novoNome) => {
            setNomeHospital(novoNome);
            mostrarToast(`Razão Social de Faturamento atualizada com IA: ${novoNome}`, '#00b4d8');
          }}
        />
      )}

      {/* Save As Modal */}
      <SaveAsModal
        isOpen={modalSaveAsAberto}
        nomeAtual={arquivoAtivo?.nome || 'lote_tiss.xml'}
        conteudoAtual={arquivoAtivo?.conteudo || ''}
        onClose={() => setModalSaveAsAberto(false)}
        onSalvarComoSucesso={handleSalvarComoSucesso}
      />

      {/* Hash Reader & Inspector Modal */}
      <HashReaderModal
        isOpen={modalHashReaderAberto}
        onClose={() => setModalHashReaderAberto(false)}
        conteudoXmlAtivo={arquivoAtivo?.conteudo || ''}
        nomeArquivoAtivo={arquivoAtivo?.nome || ''}
        onAtualizarXml={(novoXml, novoHash) => {
          if (arquivoAtivo) {
            atualizarConteudoArquivoAtivo(novoXml, false);
            mostrarToast(`✓ Hash MD5 recalculado e aplicado ao XML: ${novoHash}`, '#2a9d8f', 4000);
          }
        }}
      />

      {/* Critical Audit Popup */}
      <CriticalAuditPopup
        isOpen={modalCriticalAberto}
        onClose={() => setModalCriticalAberto(false)}
        errors={criticalErrors}
      />

      {/* Bottom Status Bar / Toast */}
      <ToastBar toast={toast} ultimaAtualizacao={arquivoAtivo?.ultimaAtualizacao} />
    </div>
  );
}
