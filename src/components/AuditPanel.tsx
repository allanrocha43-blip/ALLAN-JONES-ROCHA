import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Eye, Check, X, ShieldCheck } from 'lucide-react';
import { Inconsistency, InconsistencyType } from '../types/tiss';

interface AuditPanelProps {
  inconsistencias: Inconsistency[];
  onCorrigirTudoSeguro: () => void;
  onAplicarCorrecao: (erro: Inconsistency) => void;
  onIgnorarErro: (id: string) => void;
  onIrParaLinha: (linha: number) => void;
  onExcluirLinha: (linha: number) => void;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({
  inconsistencias,
  onCorrigirTudoSeguro,
  onAplicarCorrecao,
  onIgnorarErro,
  onIrParaLinha,
  onExcluirLinha,
}) => {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  const errosSeguros = inconsistencias.filter(e => e.seguro);

  const inconsistenciasFiltradas = inconsistencias.filter(erro => {
    if (filtroTipo === 'todos') return true;
    if (filtroTipo === 'criticos') return erro.tipo === 'Crítico' || erro.tipo === 'XSD Schema' || erro.tipo === 'Erro Órfão';
    if (filtroTipo === 'avisos') return erro.tipo === 'Aviso' || erro.tipo === 'Inconsistência' || erro.tipo === 'Erro Regra';
    return true;
  });

  const getCorBorda = (tipo: InconsistencyType) => {
    if (tipo === "Crítico" || tipo === "XSD Schema" || tipo === "Erro Órfão") {
      return "border-[#e63946]";
    }
    return "border-[#e9c46a]";
  };

  const getCorTextoBadge = (tipo: InconsistencyType) => {
    if (tipo === "Crítico" || tipo === "XSD Schema" || tipo === "Erro Órfão") {
      return "text-[#e63946]";
    }
    return "text-[#e9c46a]";
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1d1e] rounded-b-lg p-3 space-y-3 overflow-hidden text-gray-200">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2d3235] shrink-0">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={errosSeguros.length > 0 ? { scale: 1.04, boxShadow: "0px 0px 12px rgba(233, 196, 106, 0.4)" } : undefined}
            whileTap={errosSeguros.length > 0 ? { scale: 0.95 } : undefined}
            onClick={onCorrigirTudoSeguro}
            disabled={errosSeguros.length === 0}
            className="flex items-center gap-2 text-xs font-bold bg-[#e9c46a] hover:bg-[#d4b059] text-black px-3.5 py-2 rounded transition-all disabled:opacity-40 shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 fill-black/20" />
            <span>Aplicar Todas as Correções Seguras ({errosSeguros.length})</span>
          </motion.button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-400 mr-1 hidden sm:inline">Filtrar:</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFiltroTipo('todos')}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
              filtroTipo === 'todos' ? 'bg-[#00b4d8] text-black font-bold' : 'bg-[#0e1111] text-gray-400 hover:text-white'
            }`}
          >
            Todos ({inconsistencias.length})
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFiltroTipo('criticos')}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
              filtroTipo === 'criticos' ? 'bg-[#e63946] text-white font-bold' : 'bg-[#0e1111] text-gray-400 hover:text-white'
            }`}
          >
            Críticos/XSD
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFiltroTipo('avisos')}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
              filtroTipo === 'avisos' ? 'bg-[#e9c46a] text-black font-bold' : 'bg-[#0e1111] text-gray-400 hover:text-white'
            }`}
          >
            Avisos/Regras
          </motion.button>
        </div>
      </div>

      {/* Audit Errors Scrollable Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {inconsistencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-[#121415] border border-emerald-500/30 rounded-lg my-4">
            <ShieldCheck className="w-16 h-16 text-emerald-400 mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-emerald-400">
              ✅ Validação Concluída: Lote 100% no padrão ANS!
            </h3>
            <p className="text-xs text-gray-400 mt-2 max-w-md">
              Nenhuma inconsistência de schema XSD, regras de negócio ou estrutura foi detectada neste lote TISS.
            </p>
          </div>
        ) : inconsistenciasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            Nenhuma inconsistência encontrada para o filtro selecionado.
          </div>
        ) : (
          inconsistenciasFiltradas.map((erro) => {
            const corBorda = getCorBorda(erro.tipo);
            const corTexto = getCorTextoBadge(erro.tipo);

            return (
              <div
                key={erro.id}
                className={`flex flex-wrap md:flex-nowrap items-center justify-between gap-2 p-2.5 bg-[#121415] border-l-4 ${corBorda} rounded border-t border-r border-b border-[#262a2c] hover:border-[#383e41] transition-all`}
              >
                {/* Info Left */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono font-bold text-xs bg-[#1a1d1e] text-gray-300 border border-[#2d3235] px-2 py-1 rounded w-12 text-center shrink-0">
                    L{erro.linha}
                  </span>

                  <span className={`font-bold text-xs ${corTexto} w-24 shrink-0 truncate`}>
                    {erro.tipo}
                  </span>

                  <div className="text-xs text-gray-200 truncate min-w-0 flex-1">
                    <p className="font-medium">{erro.desc}</p>
                    {erro.sugestao && (
                      <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5">
                        <span className="text-emerald-400 font-sans">Sugestão:</span> {erro.sugestao.trim()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Right */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto pt-2 md:pt-0">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onIrParaLinha(erro.linha)}
                    className="flex items-center gap-1 text-[11px] bg-[#2a2d2e] hover:bg-[#383c3e] text-gray-300 px-2.5 py-1 rounded transition-all cursor-pointer"
                  >
                    <Eye className="w-3 h-3 text-[#00b4d8]" />
                    <span>Ver no XML</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onIgnorarErro(erro.id)}
                    className="flex items-center gap-1 text-[11px] bg-transparent hover:bg-gray-800 text-gray-400 border border-[#444] px-2 py-1 rounded transition-all cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span className="hidden sm:inline">Ignorar</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onExcluirLinha(erro.linha)}
                    className="flex items-center gap-1 text-[11px] bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 px-2 py-1 rounded transition-all cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span className="hidden sm:inline">Excluir Linha</span>
                  </motion.button>

                  {erro.sugestao !== "" && (
                    <motion.button
                      whileHover={{ scale: 1.06, boxShadow: "0px 0px 10px rgba(42, 157, 143, 0.4)" }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => onAplicarCorrecao(erro)}
                      className="flex items-center gap-1 text-[11px] font-bold bg-[#2a9d8f] hover:bg-[#21867a] text-white px-2.5 py-1 rounded transition-all shadow-xs cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Corrigir</span>
                    </motion.button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
