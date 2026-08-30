import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Search, Layers, Link, CreditCard, Building, Hash, FileCheck, Trash2, ChevronDown, ChevronRight, Key, ArrowRightToLine, ArrowLeftToLine } from 'lucide-react';
import { GuideItem, ProcedimentoItem } from '../types/tiss';

interface GuidesTableProps {
  guias: GuideItem[];
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
}

export const GuidesTable: React.FC<GuidesTableProps> = ({ guias, onSincronizarGuia, onSincronizarProcedimento, onExcluirGuia, onExcluirProcedimento, selectedGuides, onToggleGuideSelection }) => {
  const [busca, setBusca] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<
    Record<string, { carteira: string; guia: string; senha: string; guiaPrestador: string }>
  >({});
  const [procFormState, setProcFormState] = useState<
    Record<string, { codigo: string; quantidade: string; valorUnitario: string; reducaoAcrescimo: string; valor: string; dataExecucao: string }>
  >({});

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

  const recalcTotal = (qtd: string, unit: string) => {
    const q = parseFloat(qtd.replace(',', '.')) || 0;
    const u = parseFloat(unit.replace(',', '.')) || 0;
    // O TISS define o valor total do procedimento primariamente como (Quantidade * Unitário).
    // O campo redução/acréscimo muitas vezes é apenas informativo da tabela ou já vem aplicado no Unitário.
    const res = (q * u).toFixed(2);
    return (qtd.includes(',') || unit.includes(',')) ? res.replace('.', ',') : res;
  };

  const handleProcQtdChange = (procId: string, val: string) => {
    setProcFormState((prev) => {
      const current = prev[procId] || { codigo: '', quantidade: '1', valorUnitario: '0', reducaoAcrescimo: '', valor: '0' };
      const novoTotal = recalcTotal(val, current.valorUnitario);
      return {
        ...prev,
        [procId]: { ...current, quantidade: val, valor: novoTotal },
      };
    });
  };

  const handleProcValorUnitarioChange = (procId: string, val: string) => {
    setProcFormState((prev) => {
      const current = prev[procId] || { codigo: '', quantidade: '1', valorUnitario: '0', reducaoAcrescimo: '', valor: '0' };
      const novoTotal = recalcTotal(current.quantidade, val);
      return {
        ...prev,
        [procId]: { ...current, valorUnitario: val, valor: novoTotal },
      };
    });
  };

  const handleProcReducaoChange = (procId: string, val: string) => {
    setProcFormState((prev) => {
      const current = prev[procId] || { codigo: '', quantidade: '1', valorUnitario: '0', reducaoAcrescimo: '', valor: '0' };
      const novoTotal = recalcTotal(current.quantidade, current.valorUnitario);
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

  const guiasFiltradas = guias.filter((g) => {
    if (!busca) return true;
    const term = busca.toLowerCase();
    return (
      g.carteira.toLowerCase().includes(term) ||
      g.guia.toLowerCase().includes(term) ||
      g.guiaPrestador.toLowerCase().includes(term) ||
      g.senha.toLowerCase().includes(term)
    );
  });

  const numConsultas = guias.filter((g) => g.tipoGuia === 'guiaConsulta').length;
  const numSadt = guias.filter((g) => g.tipoGuia === 'guiaSP-SADT').length;

  return (
    <div className="flex flex-col h-full bg-surface rounded-b-lg p-3 space-y-3 overflow-hidden text-foreground">
      {/* Top bar with count & search */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border shrink-0 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-foreground/90">
            <Link className="w-4 h-4 text-primary" />
            <span>Total de Guias: <strong className="text-primary font-mono">{guias.length}</strong></span>
          </div>
          <span className="text-gray-600">|</span>
          <span className="text-muted-foreground">Consultas: <strong className="text-white font-mono">{numConsultas}</strong></span>
          <span className="text-muted-foreground">SADT: <strong className="text-white font-mono">{numSadt}</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="text-[10px] bg-surface-2 hover:bg-surface-3 px-2 py-1 rounded transition-colors text-foreground/90">
              Expandir Tudo
            </button>
            <button onClick={collapseAll} className="text-[10px] bg-surface-2 hover:bg-surface-3 px-2 py-1 rounded transition-colors text-foreground/90">
              Recolher Tudo
            </button>
          </div>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar por carteira, guia, Guia Prestador..."
              className="w-full bg-background border border-border rounded pl-8 pr-3 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-[#00b4d8]"
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
                      {/* Index */}
                      <td className="py-2 px-3 text-center text-muted-foreground font-bold">
                        {guide.index}
                      </td>

                      {/* Guide Type */}
                      <td className="py-2 px-3 font-sans font-medium">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isConsulta
                              ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                              : 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                          }`}
                        >
                          {isConsulta ? 'Consulta' : 'SADT'}
                        </span>
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
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onSincronizarGuia(guide, currentForm)}
                            title="Corrigir no XML"
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1 rounded transition-all shadow-xs cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span className="hidden lg:inline">Corrigir</span>
                          </motion.button>
                          {onExcluirGuia && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
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
                              className={`inline-flex items-center justify-center p-1 rounded transition-all cursor-pointer ${
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
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {isExpanded && guide.procedimentos && guide.procedimentos.length > 0 && (
                      <tr className="bg-surface border-b border-border">
                        <td colSpan={8} className="p-0">
                          <div className="pl-12 pr-4 py-3 bg-background shadow-inner">
                            <h4 className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">Procedimentos e Exames</h4>
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="text-left text-[10px] text-muted-foreground border-b border-border">
                                  <th className="pb-1 font-semibold">Código</th>
                                  <th className="pb-1 font-semibold">Descrição</th>
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
                                  };
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
                                        <input
                                          type="text"
                                          value={currentProcForm.dataExecucao || ''}
                                          onChange={(e) => handleProcDataExecucaoChange(proc.id, e.target.value)}
                                          className="bg-background border border-border text-foreground text-[10px] p-0.5 rounded focus:border-[#00b4d8] focus:outline-none w-20 px-1 text-center font-mono"
                                          placeholder="DD/MM/AAAA"
                                        />
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
                                        <input
                                          type="text"
                                          value={currentProcForm.reducaoAcrescimo}
                                          onChange={(e) => handleProcReducaoChange(proc.id, e.target.value)}
                                          className="bg-background border border-border text-foreground text-[10px] p-0.5 rounded focus:border-[#00b4d8] focus:outline-none w-12 px-1 text-center font-mono"
                                          placeholder="1.00"
                                        />
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
    </div>
  );
};
