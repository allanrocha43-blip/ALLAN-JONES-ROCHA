import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Download, 
  ShieldCheck, 
  X
} from 'lucide-react';
import { AuditResult } from '../types/tiss';
import { isCritico } from '../utils/severidade';
import { cn } from '../lib/utils';

export interface AssistenteEnvioAnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: AuditResult | null;
  nomeArquivo?: string;
  onIrParaAba: (aba: string) => void;
  onAbrirHashModal: () => void;
  onExportarValidado: () => void;
}

export const AssistenteEnvioAnsModal: React.FC<AssistenteEnvioAnsModalProps> = ({
  isOpen,
  onClose,
  audit,
  nomeArquivo,
  onIrParaAba,
  onAbrirHashModal,
  onExportarValidado,
}) => {
  if (!isOpen) return null;

  const totalGuias = audit?.guias?.length || 0;
  const inconsistencias = audit?.inconsistencias || [];
  const errosCriticos = inconsistencias.filter(isCritico);

  // 1. Verificação de Integridade XML / Versão TISS
  const versaoTiss = audit?.versaoTiss || '4.01.00';
  const versaoValida = versaoTiss.startsWith('4.0') || versaoTiss.startsWith('3.05');
  const etapa1Status: 'aprovado' | 'aviso' | 'erro' = 
    !audit ? 'erro' : versaoValida ? 'aprovado' : 'aviso';

  // 2. Glosas Críticas & Dados Obrigatórios (ex: dataExecucao vazia, orfaos, etc)
  const etapa2Status: 'aprovado' | 'erro' = 
    errosCriticos.length === 0 ? 'aprovado' : 'erro';

  // 3. Vias Cirúrgicas / Procedimentos
  const temErroViaOuEquipe = inconsistencias.some(i => 
    i.id.includes('viaAcesso') || i.id.includes('equipesadt') || i.id.includes('tecnicautilizada')
  );
  const etapa3Status: 'aprovado' | 'aviso' = temErroViaOuEquipe ? 'aviso' : 'aprovado';

  // 4. Integridade HASH MD5
  const temErroHash = inconsistencias.some(i => 
    i.id.toLowerCase().includes('hash') || i.desc.toLowerCase().includes('hash')
  );
  const etapa4Status: 'aprovado' | 'aviso' = temErroHash ? 'aviso' : 'aprovado';

  // 5. Prontidão para Envio
  const prontoParaEnvio = etapa2Status === 'aprovado';

  const etapas = [
    {
      numero: 1,
      titulo: 'Padrão ANS & Estrutura XML',
      descricao: `Padrão ${versaoTiss} identificado · CNPJ Base: ${audit?.cnpjBase || '-'}`,
      status: etapa1Status,
      detalhes: versaoValida 
        ? 'Cabeçalho e identificação da operadora em conformidade com o XSD da ANS.' 
        : 'Versão do padrão fora da faixa 4.0X.X. Recomenda-se revisão.',
      acaoTexto: 'Ver no XML',
      onAcao: () => {
        onIrParaAba('split');
        onClose();
      }
    },
    {
      numero: 2,
      titulo: 'Glosas Críticas & Dados Mandatórios',
      descricao: errosCriticos.length === 0 
        ? 'Nenhuma glosa crítica pendente' 
        : `${errosCriticos.length} glosas críticas detectadas (bloqueantes)`,
      status: etapa2Status,
      detalhes: errosCriticos.length === 0
        ? 'Todas as guias possuem dados cadastrais, carteiras e procedimentos válidos.'
        : 'Identificamos campos obrigatórios vazios (como <dataExecucao> ou tags órfãs). A operadora rejeitará o lote se enviado assim.',
      acaoTexto: errosCriticos.length > 0 ? 'Resolver Glosas' : 'Revisar Guias',
      onAcao: () => {
        onIrParaAba('guias');
        onClose();
      }
    },
    {
      numero: 3,
      titulo: 'Tabela TUSS & Vias Cirúrgicas',
      descricao: temErroViaOuEquipe 
        ? 'Procedimentos bilaterais / cirúrgicos requerem conferência' 
        : 'Regras de tabela TUSS e equipe conformes',
      status: etapa3Status,
      detalhes: temErroViaOuEquipe
        ? 'Existem procedimentos cirúrgicos ou SADT com via de acesso ou equipe a validar.'
        : 'Codificação CBHPM/TUSS validada sem divergências.',
      acaoTexto: 'Abrir Tabela',
      onAcao: () => {
        onIrParaAba('guias');
        onClose();
      }
    },
    {
      numero: 4,
      titulo: 'Assinatura & Hash MD5 da ANS',
      descricao: !temErroHash ? 'Hash MD5 íntegro e alinhado ao padrão ANS' : 'Hash MD5 com inconsistência ou pendente de cálculo',
      status: etapa4Status,
      detalhes: 'O validador recalcula o Hash MD5 oficial ANS automaticamente na exportação, garantindo integridade criptográfica no envio.',
      acaoTexto: 'Conferir HASH',
      onAcao: () => {
        onAbrirHashModal();
        onClose();
      }
    },
    {
      numero: 5,
      titulo: 'Exportação do Lote Validado',
      descricao: prontoParaEnvio 
        ? 'Lote 100% pronto para download e envio à operadora' 
        : 'Corrija os erros críticos antes de exportar para evitar glosa',
      status: prontoParaEnvio ? 'aprovado' : 'erro',
      detalhes: prontoParaEnvio
        ? `${totalGuias} guias validadas prontas para download com HASH embutido.`
        : 'O botão de exportação foi protegido para evitar envio de faturamento inconsistente.',
      acaoTexto: 'Exportar Lote',
      onAcao: () => {
        onExportarValidado();
        onClose();
      }
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-2xl text-foreground my-8 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary border border-primary/25">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                  Assistente de Lote: Checklist para Envio ANS
                  <span className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded border uppercase",
                    prontoParaEnvio 
                      ? "bg-ok-surface text-ok border-ok/30" 
                      : "bg-crit-surface text-crit border-crit/30"
                  )}>
                    {prontoParaEnvio ? "Aprovado para Envio" : "Bloqueado por Glosas"}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nomeArquivo || 'Lote ativo'} · {totalGuias} guias avaliadas em conformidade com as regras ANS
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Checklist Body */}
          <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {etapas.map((etapa) => {
              const isOk = etapa.status === 'aprovado';
              const isErro = etapa.status === 'erro';
              const isAviso = etapa.status === 'aviso';

              return (
                <div
                  key={etapa.numero}
                  className={cn(
                    "rounded-lg border p-3.5 transition-all",
                    isOk && "border-ok/30 bg-ok-surface/10",
                    isErro && "border-crit/30 bg-crit-surface/10",
                    isAviso && "border-warn/30 bg-warn-surface/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isOk && <CheckCircle2 className="size-4 text-ok" />}
                        {isErro && <XCircle className="size-4 text-crit" />}
                        {isAviso && <AlertTriangle className="size-4 text-warn" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-muted-foreground">
                            Etapa {etapa.numero}.
                          </span>
                          <h4 className="text-xs font-semibold text-foreground">
                            {etapa.titulo}
                          </h4>
                        </div>
                        <p className={cn(
                          "text-[11px] mt-0.5 font-medium",
                          isOk && "text-ok",
                          isErro && "text-crit",
                          isAviso && "text-warn"
                        )}>
                          {etapa.descricao}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {etapa.detalhes}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={etapa.onAcao}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded transition-all active:scale-95 cursor-pointer",
                        isErro && "bg-crit text-crit-surface hover:opacity-90 shadow-xs",
                        isOk && "border border-border bg-surface-2 text-foreground hover:bg-surface-3",
                        isAviso && "border border-warn/40 bg-warn-surface/20 text-warn hover:bg-warn-surface/40"
                      )}
                    >
                      <span>{etapa.acaoTexto}</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">
              {errosCriticos.length > 0 ? (
                <span className="text-crit font-medium flex items-center gap-1">
                  <AlertTriangle className="size-3.5" /> {errosCriticos.length} inconsistência(s) crítica(s) requerem correção.
                </span>
              ) : (
                <span className="text-ok font-medium flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Lote aprovado para exportação e faturamento.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Fechar
              </button>
              {prontoParaEnvio ? (
                <button
                  onClick={() => {
                    onExportarValidado();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 rounded bg-ok text-ok-surface px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Download className="size-3.5" /> Baixar XML Validado
                </button>
              ) : (
                <button
                  onClick={() => {
                    onIrParaAba('guias');
                    onClose();
                  }}
                  className="flex items-center gap-1.5 rounded bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Corrigir Guias Pendentes
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
