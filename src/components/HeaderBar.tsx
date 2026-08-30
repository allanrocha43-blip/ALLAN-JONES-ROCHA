import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Search, Download, Building2, FileSpreadsheet, Sparkles, Hash } from 'lucide-react';
import { AuditResult } from '../types/tiss';

interface HeaderBarProps {
  auditResult: AuditResult | null;
  nomeHospital: string;
  onOpenHospitalModal: () => void;
  onOpenExtratorAns: () => void;
  onOpenHashReader?: () => void;
  onProcessarLote: () => void;
  onExportarXml: () => void;
  onExportarRelatorio: () => void;
  temArquivoAtivo: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  auditResult,
  nomeHospital,
  onOpenHospitalModal,
  onOpenExtratorAns,
  onOpenHashReader,
  onProcessarLote,
  onExportarXml,
  onExportarRelatorio,
  temArquivoAtivo,
}) => {
  const versao = auditResult?.versaoTiss || "-";
  const cnpj = auditResult?.cnpjBase || "-";
  const total = auditResult?.totalLote || 0;

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(total);

  return (
    <header className="h-16 bg-[#1a1d1e] border-b border-[#2d3235] px-4 flex items-center justify-between select-none shrink-0 text-white gap-3 z-20">
      {/* Área Esquerda: Logo, Título e Badges da Instituição */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2 text-[#00b4d8] font-bold text-sm md:text-base tracking-wide shrink-0">
          <div className="p-1.5 bg-[#00b4d8]/10 border border-[#00b4d8]/30 rounded-md">
            <ShieldCheck className="w-5 h-5 text-[#00b4d8]" />
          </div>
          <span className="hidden sm:inline">Auditor TISS Pro</span>
          <span className="text-[10px] bg-[#0e1111] border border-[#00b4d8]/30 px-2 py-0.5 rounded font-mono text-[#00b4d8]">
            v9.0
          </span>
        </div>

        <div className="h-5 w-[1px] bg-[#2d3235] mx-1 hidden md:block" />

        {/* Hospital badge button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onOpenHospitalModal}
          title="Alterar Razão Social / Nome do Hospital Padrão"
          className="hidden md:flex items-center gap-1.5 text-xs bg-[#121415] hover:bg-[#202427] text-gray-300 border border-[#2d3235] hover:border-emerald-600/40 px-2.5 py-1.5 rounded transition-all shadow-xs cursor-pointer"
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="max-w-[130px] truncate">{nomeHospital}</span>
        </motion.button>

        {/* Leitor & Validador de HASH button */}
        {onOpenHashReader && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenHashReader}
            title="Ferramenta de Leitura, Inspeção e Validação de HASH MD5 TISS"
            className="hidden lg:flex items-center gap-1.5 text-xs bg-[#121415] hover:bg-[#202427] text-[#2a9d8f] border border-[#2a9d8f]/30 hover:border-[#2a9d8f]/60 px-2.5 py-1.5 rounded transition-all font-medium cursor-pointer"
          >
            <Hash className="w-3.5 h-3.5 text-[#2a9d8f]" />
            <span>Validador HASH</span>
          </motion.button>
        )}

        {/* Extrator ANS IA button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onOpenExtratorAns}
          title="Extrator de Dados de Operadoras ANS com IA Gemini"
          className="hidden xl:flex items-center gap-1.5 text-xs bg-[#00b4d8]/10 hover:bg-[#00b4d8]/20 text-[#00b4d8] border border-[#00b4d8]/30 hover:border-[#00b4d8]/60 px-2.5 py-1.5 rounded transition-all font-medium cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#00b4d8] animate-pulse" />
          <span>Extrator ANS IA</span>
        </motion.button>
      </div>

      {/* Área Central: Resumo financeiro e do arquivo */}
      <div className="hidden md:flex items-center gap-3.5 font-mono text-xs bg-[#0e1111] px-4 py-1.5 rounded-lg border border-[#262b2e]">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-sans text-[11px]">Padrão:</span>
          <span className="text-gray-200 font-bold bg-[#1a1d1e] px-1.5 py-0.5 rounded border border-[#2d3235]">{versao}</span>
        </div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-sans text-[11px]">CNPJ:</span>
          <span className="text-gray-200 font-semibold">{cnpj}</span>
        </div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-sans text-[11px]">Total Lote:</span>
          <span className="text-[#fca311] font-bold bg-[#fca311]/10 px-2 py-0.5 rounded border border-[#fca311]/30">{valorFormatado}</span>
        </div>
      </div>

      {/* Área Direita: Botões de ação principais com semântica de cores refinada */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={temArquivoAtivo ? { scale: 1.03 } : undefined}
          whileTap={temArquivoAtivo ? { scale: 0.96 } : undefined}
          onClick={onExportarRelatorio}
          disabled={!temArquivoAtivo}
          title="Baixar Relatório em CSV da Auditoria"
          className="hidden sm:flex items-center gap-1.5 text-xs bg-[#24282b] hover:bg-[#30363a] text-gray-200 border border-[#373d42] px-3 py-1.5 rounded font-medium disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#e9c46a]" />
          <span>Relatório</span>
        </motion.button>

        {/* Processar Lote: Destaque Primário (Ciano / Azul) em vez de Vermelho */}
        <motion.button
          whileHover={temArquivoAtivo ? { scale: 1.03, boxShadow: "0px 0px 14px rgba(0, 180, 216, 0.4)" } : undefined}
          whileTap={temArquivoAtivo ? { scale: 0.96 } : undefined}
          onClick={onProcessarLote}
          disabled={!temArquivoAtivo}
          title="Executar Auditoria e Corrigir Inconsistências Seguras"
          className="flex items-center gap-1.5 text-xs font-bold bg-[#00b4d8] hover:bg-[#0096c7] text-black px-3.5 py-1.5 rounded disabled:opacity-40 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          <Search className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Processar Lote</span>
        </motion.button>

        {/* Exportar Validado: Verde Sucesso */}
        <motion.button
          whileHover={temArquivoAtivo ? { scale: 1.03, boxShadow: "0px 0px 14px rgba(16, 185, 129, 0.4)" } : undefined}
          whileTap={temArquivoAtivo ? { scale: 0.96 } : undefined}
          onClick={onExportarXml}
          disabled={!temArquivoAtivo}
          title="Exportar Arquivo XML Validado com Assinatura MD5 (Padrão ISO-8859-1)"
          className="flex items-center gap-1.5 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white px-3.5 py-1.5 rounded disabled:opacity-40 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Exportar Validado</span>
        </motion.button>
      </div>
    </header>
  );
};


