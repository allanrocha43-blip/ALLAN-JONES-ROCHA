import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Search, Link, CreditCard, Building, Hash, FileCheck, Trash2, ChevronDown, ChevronRight, Key, Eye, AlertCircle, AlertTriangle, Code2 } from 'lucide-react';
import { GuideItem, ProcedimentoItem, Inconsistency } from '../types/tiss';
import { ViasAcessoModal } from './ViasAcessoModal';
import { cn } from '../lib/utils';
import { isCritico } from '../utils/severidade';

interface GuidesTableProps {
  guias: GuideItem[];
  inconsistencias?: Inconsistency[];
  onSincronizarGuia: (
    guide: GuideItem,
    novosDados: { carteira: string; guia: string; senha: string; guiaPrestador: string }
  ) => void;
  onSincronizarProcedimento?: (
    proc: ProcedimentoItem,
    novoCodigo: string,
    novoValor: string,
    novaQuantidade: string,
    novoValorUnitario: string,
    novaReducaoAcrescimo?: string,
    novaDataExecucao?: string
  ) => void;
  onExcluirGuia?: (guide: GuideItem) => void;
  onExcluirProcedimento?: (proc: ProcedimentoItem) => void;
  selectedGuides?: string[];
  onToggleGuideSelection?: (guideId: string) => void;
  onVerNoXml?: (linha: number) => void;
}

export const GuidesTable: React.FC<GuidesTableProps> = ({ 
  guias, 
  inconsistencias = [],
  onSincronizarGuia, 
  onSincronizarProcedimento, 
  onExcluirGuia, 
  onExcluirProcedimento, 
  selectedGuides, 
  onToggleGuideSelection,
  onVerNoXml
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'criticas' | 'consulta' | 'sadt'>('todas');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<
    Record<string, { carteira: string; guia: string; senha: string; guiaPrestador: string }>
  >({});
  const [procFormState, setProcFormState] = useState<
    Record<string, { codigo: string; quantidade: string; valorUnitario: string; reducaoAcrescimo: string; valor: string; dataExecucao: string }>
  >({});
  const [viasModalOpen, setViasModalOpen] = useState(false);
  const [targetProcForModal, setTargetProcForModal] = useState<string | null>(null);

  // Refs to track the last known XML state so we don't overwrite user edits unless the XML actually changed
  const handleBridgeSync = (guideId: string, _source: 'senha' | 'guia' | 'guiaPrestador', value: string) => {
    setFormState(prev => ({
      ...prev,
      [guideId]: {
        ...(prev[guideId] || { carteira: '', guia: '', senha: '', guiaPrestador: '' }),
        guia: value,
        senha: value,
        guiaPrestador: value,
      }
    }));
  };

  const xmlStateRef = React.useRef<Record<string, any>>({});
  const xmlProcStateRef = React.useRef<Record<string, any>>({});

  useEffect(() => {
    setFormState(prev => {
      const next = { ...prev };
      guias.forEach((g) => {
        const lastXml = xmlStateRef.current[g.id];
        const currentXml = { carteira: g.carteira || '', guia: g.guia || '', senha: g.senha || '', guiaPrestador: g.guiaPrestador || '' };
        const currentForm = prev[g.id];

        if (!currentForm) {
          next[g.id] = currentXml;
        } else {
          let updated = { ...currentForm };
          let changed = false;
          if (lastXml) {
             for (const key of ['carteira', 'guia', 'senha', 'guiaPrestador']) {
                if (lastXml[key] !== currentXml[key as keyof typeof currentXml]) {
                   updated[key as keyof typeof updated] = currentXml[key as keyof typeof currentXml];
                   changed = true;
                }
             }
          }
          if (changed) next[g.id] = updated;
        }
        xmlStateRef.current[g.id] = currentXml;
      });
      return next;
    });

    setProcFormState(prev => {
      const next = { ...prev };
      guias.forEach((g) => {
        if (g.procedimentos) {
          g.procedimentos.forEach(p => {
            const lastXml = xmlProcStateRef.current[p.id];
            const currentXml = {
              codigo: p.codigo || '',
              quantidade: p.quantidade || '',
              valorUnitario: p.valorUnitario || '',
              reducaoAcrescimo: p.reducaoAcrescimo || '',
              valor: p.valor || '',
              dataExecucao: p.dataExecucao || '',
            };
            const currentForm = prev[p.id];

            if (!currentForm) {
              next[p.id] = currentXml;
            } else {
              let updated = { ...currentForm };
              let changed = false;
              if (lastXml) {
                 for (const key of ['codigo', 'quantidade', 'valorUnitario', 'reducaoAcrescimo', 'valor', 'dataExecucao']) {
                    if (lastXml[key] !== currentXml[key as keyof typeof currentXml]) {
                       updated[key as keyof typeof updated] = currentXml[key as keyof typeof currentXml];
                       changed = true;
                    }
                 }
              }
              if (changed) next[p.id] = updated;
            }
            xmlProcStateRef.current[p.id] = currentXml;
          });
        }
      });
      return next;
    });
  }, [guias]);

  const handleInputChange = (
    guideId: string,
    field: 'carteira' | 'guia' | 'senha' | 'guiaPrestador',
    val: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      [guideId]: {
        ...(prev[guideId] || { carteira: '', guia: '', senha: '', guiaPrestador: '' }),
        [field]: val,
      },
    }));
  };

  const handleProcCodeChange = (procId: string, val: string) => {
    setProcFormState((prev) => ({
      ...prev,
      [procId]: {
        ...(prev[procId] || { codigo: '', quantidade: '1', valorUnitario: '0', valor: '0' }),
        codigo: val,
      },
    }));
  };

  const recalcTotal = (qtd: string, unit: string, red?: string) => {
    const q = parseFloat(qtd.replace(',', '.')) || 0;
    const u = parseFloat(unit.replace(',', '.')) || 0;
    let r = 1.0;
    if (red !== undefined && red !== null && String(red).trim() !== '') {
      const parsedR = parseFloat(String(red).replace(',', '.'));
      if (!isNaN(parsedR) && parsedR > 0) {
        r = parsedR;
      }
    }
    const res = (q * u * r).toFixed(2);
    return (qtd.includes(',') || unit.includes(',')) ? res.replace('.', ',') : res;
  };

  const handleProcQtdChange = (procId: string, val: string) => {
    setProcFormState((prev) => {
      const current = prev[procId] || { codigo: '', quantidade: '1', valorUnitario: '0', reducaoAcrescimo: '', valor: '0' };
      const novoTotal = recalcTotal(val, current.valorUnitario, current.reducaoAcrescimo);
      return {
        ...prev,
        [procId]: { ...current, quantidade: val, valor: novoTotal },
      };
    });
  };

  const handleProcValorUnitarioChange = (procId: string, val: string) => {
    setProcFormState((prev) => {
      const current = prev[procId] || { codigo: '', quantidade: '1', valorUnitario: '0', reducaoAcrescimo: '', valor: '0' };
      const novoTotal = recalcTotal(current.quantidade, val, current.reducaoAcrescimo);
      return {
        ...prev,
        [procId]: { ...current, valorUnitario: val, valor: novoTotal },
      };
    });
  };

  const handleProcReducaoChange = (procId: string, val: string) => {
    setProcFormState((prev) => {
      const current = prev[procId] || { codigo: '', quantidade: '1', valorUnitario: '0', reducaoAcrescimo: '', valor: '0' };
      const novoTotal = recalcTotal(current.quantidade, current.valorUnitario, val);
      return {
        ...prev,
        [procId]: { ...current, reducaoAcrescimo: val, valor: novoTotal },
      };
    });
  };

  const handleProcValorChange = (procId: string, val: string) => {
    setProcFormState((prev) => ({
      ...prev,
      [procId]: {
        ...(prev[procId] || { codigo: '', quantidade: '1', valorUnitario: '0', reducaoAcrescimo: '', valor: '0' }),
        valor: val,
      },
    }));
  };

  
  const handleProcDataExecucaoChange = (procId: string, val: string) => {
    setProcFormState((prev) => ({
      ...prev,
      [procId]: {
        ...(prev[procId] || { codigo: '', quantidade: '1', valorUnitario: '0', reducaoAcrescimo: '', valor: '0', dataExecucao: '' }),
        dataExecucao: val,
      },
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    guiasFiltradas.forEach(g => {
      allExpanded[g.id] = true;
    });
    setExpandedRows(allExpanded);
  };

  const collapseAll = () => {
    setExpandedRows({});
  };

  // Mapeamento otimizado de inconsistências por número da guia
  const mapaInconsistenciasPorGuia = useMemo(() => {
    const mapa = new Map<string, { criticas: Inconsistency[]; avisos: Inconsistency[] }>();

    for (const inc of inconsistencias) {
      // Procura número da guia na descrição (ex: "Guia nº 12345" ou "Guia 1")
      const match = inc.desc.match(/Guia (?:nº )?([^\s|:]+)/i);
      const guiaId = match ? match[1].trim() : null;

      if (guiaId) {
        if (!mapa.has(guiaId)) {
          mapa.set(guiaId, { criticas: [], avisos: [] });
        }
        const bucket = mapa.get(guiaId)!;
        if (isCritico(inc)) {
          bucket.criticas.push(inc);
        } else {
          bucket.avisos.push(inc);
        }
      }
    }
    return mapa;
  }, [inconsistencias]);

  // Função para verificar se a guia tem glosa crítica pendente
  const getInconsistenciasGuia = (guide: GuideItem) => {
    const gNum1 = guide.guiaPrestador?.trim();
    const gNum2 = guide.guia?.trim();
    const gNum3 = String(guide.index);

    const b1 = gNum1 ? mapaInconsistenciasPorGuia.get(gNum1) : null;
    const b2 = gNum2 ? mapaInconsistenciasPorGuia.get(gNum2) : null;
    const b3 = mapaInconsistenciasPorGuia.get(gNum3);

    // Também verifica diretamente se há procedimento com dataExecucao vazia no formulário atual
    const temDataVazia = guide.procedimentos?.some(p => {
      const form = procFormState[p.id];
      const dt = form ? form.dataExecucao : p.dataExecucao;
      return !dt || dt.trim() === '';
    });

    const criticas = [
      ...(b1?.criticas || []),
      ...(b2?.criticas || []),
      ...(b3?.criticas || [])
    ];
    const avisos = [
      ...(b1?.avisos || []),
      ...(b2?.avisos || []),
      ...(b3?.avisos || [])
    ];

    return {
      temCriticas: criticas.length > 0 || temDataVazia,
      criticas,
      avisos,
      temDataVazia
    };
  };

  const { numConsultas, numSadt, numCriticasTotal } = useMemo(() => {
    let consultas = 0;
    let sadt = 0;
    let criticas = 0;
    for (const g of guias) {
      if (g.tipoGuia === 'guiaConsulta') consultas++;
      else if (g.tipoGuia === 'guiaSP-SADT') sadt++;

      const info = getInconsistenciasGuia(g);
      if (info.temCriticas) {
        criticas++;
      }
    }
    return { numConsultas: consultas, numSadt: sadt, numCriticasTotal: criticas };
  }, [guias, mapaInconsistenciasPorGuia, procFormState]);

  const guiasFiltradas = useMemo(() => {
    let list = guias;

    // Filtro por Segmento de Status
    if (filtroStatus === 'criticas') {
      list = list.filter(g => getInconsistenciasGuia(g).temCriticas);
    } else if (filtroStatus === 'consulta') {
      list = list.filter(g => g.tipoGuia === 'guiaConsulta');
    } else if (filtroStatus === 'sadt') {
      list = list.filter(g => g.tipoGuia === 'guiaSP-SADT');
    }

    // Filtro por Texto de Busca
    if (busca.trim()) {
      const term = busca.trim().toLowerCase();
      list = list.filter((g) =>
        g.carteira.toLowerCase().includes(term) ||
        g.guia.toLowerCase().includes(term) ||
        g.guiaPrestador.toLowerCase().includes(term) ||
        g.senha.toLowerCase().includes(term)
      );
    }

    return list;
  }, [guias, busca, filtroStatus, mapaInconsistenciasPorGuia, procFormState]);

  return (
    <div className="flex flex-col h-full bg-surface rounded-b-lg p-3 space-y-3 overflow-hidden text-foreground">
      {/* Top bar with count & search */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border shrink-0 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Filter Control */}
          <div className="flex items-center rounded-md border border-border/80 bg-background p-0.5 text-[11px]">
            <button
              onClick={() => setFiltroStatus('todas')}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
                filtroStatus === 'todas'
                  ? "bg-surface-2 text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todas ({guias.length})
            </button>
            <button
              onClick={() => setFiltroStatus('criticas')}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition-colors cursor-pointer flex items-center gap-1",
                filtroStatus === 'criticas'
                  ? "bg-crit text-crit-surface shadow-xs font-bold"
                  : numCriticasTotal > 0
                    ? "text-crit hover:bg-crit-surface/20"
                    : "text-muted-foreground hover:text-foreground"
              )}
              title="Filtrar guias com dados pendentes ou glosas críticas"
            >
              <AlertCircle className="size-3" />
              <span>Com Glosa ({numCriticasTotal})</span>
            </button>
            <button
              onClick={() => setFiltroStatus('consulta')}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
                filtroStatus === 'consulta'
                  ? "bg-surface-2 text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Consultas ({numConsultas})
            </button>
            <button
              onClick={() => setFiltroStatus('sadt')}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
                filtroStatus === 'sadt'
                  ? "bg-surface-2 text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              SADT ({numSadt})
            </button>
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Mostrando: <strong className="text-foreground font-mono">{guiasFiltradas.length}</strong> de {guias.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTargetProcForModal(null);
              setViasModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-[11px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded transition-colors font-medium cursor-pointer"
            title="Abrir tabela e regras de cálculo para dois olhos e vias de acesso distintas"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cálculo 2 Olhos / Vias</span>
            <span className="sm:hidden">2 Olhos</span>
          </button>
          <button onClick={expandAll} className="text-[10px] bg-surface-2 hover:bg-surface-3 px-2 py-1 rounded transition-colors text-foreground/90 cursor-pointer">
            Expandir
          </button>
          <button onClick={collapseAll} className="text-[10px] bg-surface-2 hover:bg-surface-3 px-2 py-1 rounded transition-colors text-foreground/90 cursor-pointer">
            Recolher
          </button>
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar guia, carteira, senha..."
              className="w-full bg-background border border-border rounded pl-8 pr-3 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto border border-border rounded bg-surface">
        {guias.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs flex flex-col items-center justify-center">
            <FileCheck className="w-10 h-10 text-gray-600 mb-2" />
            <p className="font-medium text-muted-foreground">Nenhuma guia encontrada no XML ativo.</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Verifique se o arquivo possui tags &lt;guiaConsulta&gt; ou &lt;guiaSP-SADT&gt;.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface text-muted-foreground font-semibold border-b border-border sticky top-0 z-10">
              <tr>
                {selectedGuides !== undefined && onToggleGuideSelection && (
                  <th className="py-2 px-2 w-8 text-center">
                  </th>
                )}
                <th className="py-2 px-2 w-8"></th>
                <th className="py-2 px-3 w-10 text-center">
                  <Hash className="w-3.5 h-3.5 inline text-muted-foreground" />
                </th>
                <th className="py-2 px-3">Tipo</th>
                <th className="py-2 px-3 min-w-[130px]">
                  <Building className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                  Guia Prestador
                </th>
                <th className="py-2 px-3 min-w-[140px]">
                  <CreditCard className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                  Carteira
                </th>
                <th className="py-2 px-3 min-w-[130px]">
                  <Key className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                  Senha
                </th>
                <th className="py-2 px-3 min-w-[130px]">Nº Guia</th>
                <th className="py-2 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2224] font-mono">
              {guiasFiltradas.map((guide, idx) => {
                const currentForm = formState[guide.id] || {
                  carteira: guide.carteira,
                  guia: guide.guia,
                  senha: guide.senha,
                  guiaPrestador: guide.guiaPrestador,
                };

                const isConsulta = guide.tipoGuia === 'guiaConsulta';
                const isExpanded = !!expandedRows[guide.id];

                return (
                  <React.Fragment key={guide.id}>
                    <tr
                      className={`${idx % 2 === 0 ? 'bg-surface' : 'bg-surface/50'} hover:bg-surface-2 transition-colors`}
                    >
                      {selectedGuides !== undefined && onToggleGuideSelection && (
                        <td className="py-2 px-2 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={selectedGuides.includes(guide.id)}
                            onChange={() => onToggleGuideSelection(guide.id)}
                            className="w-3.5 h-3.5 rounded border-border bg-background text-primary focus:ring-[#00b4d8] cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-2 px-2 text-center">
                        {guide.procedimentos && guide.procedimentos.length > 0 && (
                          <button onClick={() => toggleExpand(guide.id)} className="text-muted-foreground hover:text-white p-1 rounded hover:bg-surface-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      {/* Index & Glosa Status Indicator */}
                      <td className="py-2 px-3 text-center font-bold">
                        <div className="flex items-center justify-center gap-1.5">
                          {(() => {
                            const info = getInconsistenciasGuia(guide);
                            if (info.temCriticas) {
                              const descGlosa = info.criticas[0]?.desc || 'Glosa Crítica Detectada';
                              return (
                                <span 
                                  title={descGlosa}
                                  className="inline-flex items-center justify-center size-4 rounded-full bg-crit-surface text-crit border border-crit/40 shrink-0"
                                >
                                  <AlertCircle className="size-3" />
                                </span>
                              );
                            }
                            if (info.avisos.length > 0) {
                              return (
                                <span 
                                  title={`${info.avisos.length} aviso(s) para conferência`}
                                  className="inline-flex items-center justify-center size-4 rounded-full bg-warn-surface text-warn border border-warn/40 shrink-0"
                                >
                                  <AlertTriangle className="size-3" />
                                </span>
                              );
                            }
                            return (
                              <span className="inline-block size-1.5 rounded-full bg-ok/60 shrink-0" title="Guia sem inconsistências" />
                            );
                          })()}
                          <span className="text-muted-foreground">{guide.index}</span>
                        </div>
                      </td>

                      {/* Guide Type */}
                      <td className="py-2 px-3 font-sans font-medium">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              isConsulta
                                ? "bg-sky-950/60 text-sky-400 border border-sky-800/40"
                                : "bg-purple-950/60 text-purple-400 border border-purple-800/40"
                            )}
                          >
                            {isConsulta ? 'Consulta' : 'SADT'}
                          </span>
                          {onVerNoXml && (
                            <button
                              type="button"
                              onClick={() => {
                                const info = getInconsistenciasGuia(guide);
                                const linhaAlvo = info.criticas[0]?.linha || info.avisos[0]?.linha;
                                if (linhaAlvo) {
                                  onVerNoXml(linhaAlvo);
                                }
                              }}
                              className="text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 p-0.5 rounded transition-opacity"
                              title="Localizar início desta guia no editor XML"
                            >
                              <Code2 className="size-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Guia Prestador */}
                      <td className="py-1.5 px-2">
                        <div className="relative group/input flex items-center">
                          <input
                            type="text"
                            value={currentForm.guiaPrestador}
                            onChange={(e) => handleInputChange(guide.id, 'guiaPrestador', e.target.value)}
                            className="w-full bg-transparent border border-border hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 pr-6 text-xs text-foreground focus:outline-none"
                            placeholder="Guia Prestador"
                          />
                          <button
                            title="Copiar para Senha e Guia Operadora"
                            onClick={(e) => { e.preventDefault(); handleBridgeSync(guide.id, 'guiaPrestador', currentForm.guiaPrestador); }}
                            className="absolute right-1 p-1 text-muted-foreground hover:text-primary opacity-0 group-hover/input:opacity-100 transition-opacity bg-surface-2 rounded-sm"
                          >
                            <Link className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Carteira */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={currentForm.carteira}
                          onChange={(e) => handleInputChange(guide.id, 'carteira', e.target.value)}
                          className="w-full bg-transparent border border-border hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                        />
                      </td>

                      {/* Senha */}
                      <td className="py-1.5 px-2">
                        <div className="relative group/input flex items-center">
                          <input
                            type="text"
                            value={currentForm.senha}
                            onChange={(e) => handleInputChange(guide.id, 'senha', e.target.value)}
                            className="w-full bg-transparent border border-border hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 pr-6 text-xs text-foreground focus:outline-none"
                            placeholder="Senha"
                          />
                          <button
                            title="Copiar para Guia Prestador e Guia Operadora"
                            onClick={(e) => { e.preventDefault(); handleBridgeSync(guide.id, 'senha', currentForm.senha); }}
                            className="absolute right-1 p-1 text-muted-foreground hover:text-primary opacity-0 group-hover/input:opacity-100 transition-opacity bg-surface-2 rounded-sm"
                          >
                            <Link className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Nº Guia */}
                      <td className="py-1.5 px-2">
                        <div className="relative group/input flex items-center">
                          <input
                            type="text"
                            value={currentForm.guia}
                            onChange={(e) => handleInputChange(guide.id, 'guia', e.target.value)}
                            className="w-full bg-transparent border border-border hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 pr-6 text-xs text-foreground focus:outline-none"
                            placeholder="Nº Guia"
                          />
                          <button
                            title="Copiar para Senha e Guia Prestador"
                            onClick={(e) => { e.preventDefault(); handleBridgeSync(guide.id, 'guia', currentForm.guia); }}
                            className="absolute right-1 p-1 text-muted-foreground hover:text-primary opacity-0 group-hover/input:opacity-100 transition-opacity bg-surface-2 rounded-sm"
                          >
                            <Link className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-1.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSincronizarGuia(guide, currentForm)}
                            title="Corrigir no XML"
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1 rounded transition-transform duration-150 ease-out hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span className="hidden lg:inline">Corrigir</span>
                          </button>
                          {onExcluirGuia && (
                            <button
                              onClick={() => {
                                if (confirmDelete === guide.id) {
                                  onExcluirGuia(guide);
                                  setConfirmDelete(null);
                                } else {
                                  setConfirmDelete(guide.id);
                                  setTimeout(() => setConfirmDelete(null), 3000);
                                }
                              }}
                              title="Excluir guia do XML"
                              className={`inline-flex items-center justify-center p-1 rounded transition-transform duration-150 ease-out hover:scale-105 active:scale-95 cursor-pointer ${
                                confirmDelete === guide.id
                                  ? 'bg-red-600 hover:bg-red-700 text-white px-2'
                                  : 'bg-[#e63946] hover:bg-[#c1121f] text-white'
                              }`}
                            >
                              {confirmDelete === guide.id ? (
                                <span className="text-[10px] font-bold">Confirmar?</span>
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {isExpanded && guide.procedimentos && guide.procedimentos.length > 0 && (
                      <tr className="bg-surface border-b border-border">
                        <td colSpan={8} className="p-0">
                          <div className="pl-12 pr-4 py-3 bg-background shadow-inner transition-all duration-200 animate-in fade-in slide-in-from-top-1">
                            <h4 className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">Procedimentos e Exames</h4>
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="text-left text-[10px] text-muted-foreground border-b border-border">
                                  <th className="pb-1 font-semibold">Código</th>
                                  <th className="pb-1 font-semibold">Descrição</th>
                                  <th className="pb-1 font-semibold text-center">Data Exec.</th>
                                  <th className="pb-1 font-semibold text-center">Qtde</th>
                                  <th className="pb-1 font-semibold text-right">Unitário (R$)</th>
                                  <th className="pb-1 font-semibold text-center">Redução/Acr.</th>
                                  <th className="pb-1 font-semibold text-right">Total (R$)</th>
                                  <th className="pb-1 font-semibold w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {guide.procedimentos.map((proc) => {
                                  const currentProcForm = procFormState[proc.id] || {
                                    codigo: proc.codigo,
                                    quantidade: proc.quantidade,
                                    valorUnitario: proc.valorUnitario,
                                    reducaoAcrescimo: proc.reducaoAcrescimo || '',
                                    valor: proc.valor,
                                    dataExecucao: proc.dataExecucao || '',
                                  };
                                  const isDataVazia = !currentProcForm.dataExecucao || currentProcForm.dataExecucao.trim() === '';
                                  const codeChanged = currentProcForm.codigo !== proc.codigo;
                                  const qtdChanged = currentProcForm.quantidade !== proc.quantidade;
                                  const unitChanged = currentProcForm.valorUnitario !== proc.valorUnitario;
                                  const redChanged = currentProcForm.reducaoAcrescimo !== (proc.reducaoAcrescimo || '');
                                  const valChanged = currentProcForm.valor !== proc.valor;
                                  const dataExecucaoChanged = currentProcForm.dataExecucao !== (proc.dataExecucao || '');
                                  const procChanged = codeChanged || qtdChanged || unitChanged || redChanged || valChanged || dataExecucaoChanged;

                                  return (
                                    <tr key={proc.id} className="border-b border-border last:border-0 hover:bg-surface">
                                      <td className="py-1.5 text-foreground/90 font-mono text-[11px]">
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={currentProcForm.codigo}
                                            onChange={(e) => handleProcCodeChange(proc.id, e.target.value)}
                                            className="bg-background border border-border text-foreground text-[10px] p-0.5 rounded focus:border-[#00b4d8] focus:outline-none w-20 px-1"
                                            placeholder="Código"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-1.5 text-muted-foreground text-[11px] truncate max-w-[200px]">{proc.descricao || '-'}</td>
                                      <td className="py-1.5 text-foreground/90 font-mono text-[11px] text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <input
                                            type="text"
                                            value={currentProcForm.dataExecucao || ''}
                                            onChange={(e) => handleProcDataExecucaoChange(proc.id, e.target.value)}
                                            className={cn(
                                              "text-[10px] p-0.5 rounded focus:outline-none w-24 px-1 text-center font-mono transition-colors",
                                              isDataVazia
                                                ? "border border-red-500/80 bg-red-500/10 text-red-200 placeholder:text-red-400/60 font-semibold focus:border-red-400"
                                                : "bg-background border border-border text-foreground focus:border-primary"
                                            )}
                                            placeholder="AAAA-MM-DD"
                                            title={isDataVazia ? `Alerta: Tag <dataExecucao> vazia na Guia ${guide.guiaPrestador || guide.guia || guide.id} (Risco de glosa imediata)` : "Data de Execução (AAAA-MM-DD)"}
                                          />
                                          {isDataVazia && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const hoje = new Date().toISOString().slice(0, 10);
                                                handleProcDataExecucaoChange(proc.id, hoje);
                                              }}
                                              title="Preencher com data de hoje (AAAA-MM-DD)"
                                              className="px-1 py-0.5 text-[9px] font-bold text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/40 rounded border border-red-500/40 cursor-pointer shrink-0"
                                            >
                                              Hoje
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      
                                      <td className="py-1.5 text-foreground/90 font-mono text-[11px] text-center">
                                        <input
                                          type="text"
                                          value={currentProcForm.quantidade}
                                          onChange={(e) => handleProcQtdChange(proc.id, e.target.value)}
                                          className="bg-background border border-border text-foreground text-[10px] p-0.5 rounded focus:border-[#00b4d8] focus:outline-none w-10 px-1 text-center font-mono"
                                        />
                                      </td>

                                      <td className="py-1.5 text-foreground/90 font-mono text-[11px] text-right">
                                        <input
                                          type="text"
                                          value={currentProcForm.valorUnitario}
                                          onChange={(e) => handleProcValorUnitarioChange(proc.id, e.target.value)}
                                          className="bg-background border border-border text-foreground text-[10px] p-0.5 rounded focus:border-[#00b4d8] focus:outline-none w-16 px-1 text-right font-mono"
                                          placeholder="0.00"
                                        />
                                      </td>
                                      
                                      <td className="py-1.5 text-foreground/90 font-mono text-[11px] text-center">
                                        <div className="flex flex-col items-center gap-1">
                                          <div className="flex items-center justify-center gap-1">
                                            <input
                                              type="text"
                                              value={currentProcForm.reducaoAcrescimo}
                                              onChange={(e) => handleProcReducaoChange(proc.id, e.target.value)}
                                              className="bg-background border border-border text-foreground text-[10px] p-0.5 rounded focus:border-[#00b4d8] focus:outline-none w-12 px-1 text-center font-mono"
                                              placeholder="1.00"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setTargetProcForModal(proc.id);
                                                setViasModalOpen(true);
                                              }}
                                              title="Ver regras de cálculo para 2 olhos e vias diferentes"
                                              className="text-muted-foreground hover:text-primary p-0.5 transition-colors"
                                            >
                                              <Eye className="w-3 h-3" />
                                            </button>
                                          </div>
                                          <div className="flex items-center gap-0.5 text-[8px] font-mono">
                                            <button
                                              type="button"
                                              onClick={() => handleProcReducaoChange(proc.id, '1.00')}
                                              className={`px-1 py-0.2 rounded border transition-colors ${
                                                currentProcForm.reducaoAcrescimo === '1.00' || currentProcForm.reducaoAcrescimo === ''
                                                  ? 'bg-primary/20 border-primary/40 text-primary font-bold'
                                                  : 'border-border text-muted-foreground hover:text-foreground'
                                              }`}
                                              title="1º Olho (Integral / 100%)"
                                            >
                                              1.00
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleProcReducaoChange(proc.id, '0.70')}
                                              className={`px-1 py-0.2 rounded border transition-colors ${
                                                currentProcForm.reducaoAcrescimo === '0.70'
                                                  ? 'bg-primary/20 border-primary/40 text-primary font-bold'
                                                  : 'border-border text-muted-foreground hover:text-foreground'
                                              }`}
                                              title="2º Olho / Via Diferente (70%)"
                                            >
                                              0.70
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleProcReducaoChange(proc.id, '0.50')}
                                              className={`px-1 py-0.2 rounded border transition-colors ${
                                                currentProcForm.reducaoAcrescimo === '0.50'
                                                  ? 'bg-primary/20 border-primary/40 text-primary font-bold'
                                                  : 'border-border text-muted-foreground hover:text-foreground'
                                              }`}
                                              title="Mesma Via de Acesso (50%)"
                                            >
                                              0.50
                                            </button>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-1.5 text-foreground/90 font-mono text-[11px] text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <span className="text-muted-foreground text-[10px]">R$</span>
                                          <input
                                            type="text"
                                            value={currentProcForm.valor}
                                            onChange={(e) => handleProcValorChange(proc.id, e.target.value)}
                                            className="bg-background border border-border text-foreground text-[10px] p-0.5 rounded focus:border-[#00b4d8] focus:outline-none w-16 px-1 text-right font-mono text-primary"
                                            placeholder="0.00"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-1.5 text-right flex justify-end gap-1">
                                        {onSincronizarProcedimento && procChanged && (
                                          <button
                                            onClick={() => onSincronizarProcedimento(proc, currentProcForm.codigo, currentProcForm.valor, currentProcForm.quantidade, currentProcForm.valorUnitario, currentProcForm.reducaoAcrescimo, currentProcForm.dataExecucao)}
                                            title="Corrigir procedimento no XML"
                                            className="text-primary hover:text-[#0096c7] p-1 transition-colors bg-primary/10 hover:bg-primary/20 rounded flex items-center gap-1 text-[10px] font-bold"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Corrigir</span>
                                          </button>
                                        )}
                                        {onExcluirProcedimento && (
                                          <button
                                            onClick={() => {
                                              if (confirmDelete === proc.id) {
                                                onExcluirProcedimento(proc);
                                                setConfirmDelete(null);
                                              } else {
                                                setConfirmDelete(proc.id);
                                                setTimeout(() => setConfirmDelete(null), 3000);
                                              }
                                            }}
                                            title="Excluir procedimento"
                                            className={`transition-colors p-1 rounded ${
                                              confirmDelete === proc.id
                                                ? 'bg-red-600 text-white px-2 text-[10px] font-bold'
                                                : 'text-muted-foreground hover:text-primaryestructive'
                                            }`}
                                          >
                                            {confirmDelete === proc.id ? 'Confirmar?' : <Trash2 className="w-3.5 h-3.5" />}
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ViasAcessoModal
        isOpen={viasModalOpen}
        onClose={() => {
          setViasModalOpen(false);
          setTargetProcForModal(null);
        }}
        onAplicarFator={(fator) => {
          if (targetProcForModal) {
            handleProcReducaoChange(targetProcForModal, fator);
          }
        }}
      />
    </div>
  );
};
