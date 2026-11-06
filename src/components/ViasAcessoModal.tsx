import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, Calculator, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import { REGRAS_VIAS_ACESSO, PROCEDIMENTOS_OFTALMOLOGICOS_BILATERAIS, calcularValorProcedimentoComVia } from '../utils/tabelaTiss';

interface ViasAcessoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAplicarFator?: (fator: string) => void;
}

export const ViasAcessoModal: React.FC<ViasAcessoModalProps> = ({ isOpen, onClose, onAplicarFator }) => {
  const [procSelecionado, setProcSelecionado] = useState(PROCEDIMENTOS_OFTALMOLOGICOS_BILATERAIS[0].codigo);
  const [valorUnitarioSimulacao, setValorUnitarioSimulacao] = useState('1000.00');

  const resultado100 = calcularValorProcedimentoComVia(1, valorUnitarioSimulacao, '1.00');
  const resultado70 = calcularValorProcedimentoComVia(1, valorUnitarioSimulacao, '0.70');
  const resultado50 = calcularValorProcedimentoComVia(1, valorUnitarioSimulacao, '0.50');
  const totalBilateral = (parseFloat(resultado100.valorTotal) + parseFloat(resultado70.valorTotal)).toFixed(2);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-2xl overflow-hidden my-8"
          >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary border border-primary/20">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  Tabela de Vias de Acesso e Cálculo de Dois Olhos
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                    CBHPM / TISS ANS
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Regras normativas para cobrança de procedimentos oftalmológicos bilaterais e vias cirúrgicas
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Explicação da Regra Geral */}
            <div className="rounded-lg border border-border/80 bg-background/60 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Info className="w-4 h-4 text-primary" />
                <span>Como funciona a cobrança em Dois Olhos (Bilateralidade Oftalmológica)?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Na oftalmologia, os olhos constituem <strong>órgãos pares e vias cirúrgicas anatomicamente distintas</strong>. 
                De acordo com as Diretrizes Gerais da CBHPM e as resoluções da ANS para atos múltiplos praticados pela mesma equipe:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                {Object.values(REGRAS_VIAS_ACESSO).map(regra => (
                  <div
                    key={regra.id}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      regra.fator === 0.70
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-surface/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">{regra.percentual}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-background border border-border text-muted-foreground font-semibold">
                        Fator {regra.fator.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-foreground mt-1.5">{regra.rotulo}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{regra.aplicacao}</div>
                    {onAplicarFator && (
                      <button
                        onClick={() => {
                          onAplicarFator(regra.fator.toFixed(2));
                          onClose();
                        }}
                        className="mt-2.5 w-full text-[10px] py-1 px-2 rounded bg-primary/10 hover:bg-primary/20 text-primary font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>Aplicar {regra.fator.toFixed(2)}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Simulador Interativo */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-primary" />
                  Simulador de Cálculo Bilateral (1º Olho + 2º Olho)
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">100% + 70%</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                    Procedimento de Exemplo:
                  </label>
                  <select
                    value={procSelecionado}
                    onChange={(e) => setProcSelecionado(e.target.value)}
                    className="w-full bg-background border border-border text-foreground text-xs p-1.5 rounded focus:border-primary focus:outline-none"
                  >
                    {PROCEDIMENTOS_OFTALMOLOGICOS_BILATERAIS.map(p => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.codigo} - {p.nome} (Porte {p.porte})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                    Valor Unitário Base (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorUnitarioSimulacao}
                    onChange={(e) => setValorUnitarioSimulacao(e.target.value)}
                    className="w-full bg-background border border-border text-foreground text-xs p-1.5 rounded focus:border-primary focus:outline-none font-mono"
                    placeholder="1000.00"
                  />
                </div>
              </div>

              {/* Resumo do Cálculo */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-primary/10">
                <div className="bg-background/80 p-2.5 rounded border border-border text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">1º Olho (100%)</div>
                  <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                    R$ {resultado100.valorTotal}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono">Fator 1.00</div>
                </div>

                <div className="bg-background/80 p-2.5 rounded border border-primary/30 text-center">
                  <div className="text-[10px] text-primary uppercase font-semibold">2º Olho - Via Dif. (70%)</div>
                  <div className="text-sm font-bold font-mono text-primary mt-0.5">
                    R$ {resultado70.valorTotal}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono">Fator 0.70</div>
                </div>

                <div className="bg-background/80 p-2.5 rounded border border-border text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Mesma Via (50%)</div>
                  <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                    R$ {resultado50.valorTotal}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono">Fator 0.50</div>
                </div>

                <div className="bg-primary/15 p-2.5 rounded border border-primary/30 text-center">
                  <div className="text-[10px] text-primary font-bold uppercase">Total Bilateral</div>
                  <div className="text-sm font-extrabold font-mono text-primary mt-0.5">
                    R$ {totalBilateral}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono">100% + 70% = 170%</div>
                </div>
              </div>
            </div>

            {/* Tabela de Procedimentos Bilaterais Frequentes */}
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Procedimentos Oftalmológicos Frequentes com Vias Diferentes (Dois Olhos)
              </h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background/80 border-b border-border text-muted-foreground text-[10px] uppercase font-mono">
                    <tr>
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Procedimento</th>
                      <th className="py-2 px-2 text-center">Porte</th>
                      <th className="py-2 px-3 text-right">1º Olho (1.00)</th>
                      <th className="py-2 px-3 text-right">2º Olho (0.70)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                    {PROCEDIMENTOS_OFTALMOLOGICOS_BILATERAIS.map(p => (
                      <tr key={p.codigo} className="hover:bg-background/40">
                        <td className="py-1.5 px-3 font-semibold text-primary">{p.codigo}</td>
                        <td className="py-1.5 px-3 font-sans text-foreground/90">{p.nome}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{p.porte}</td>
                        <td className="py-1.5 px-3 text-right text-foreground">100%</td>
                        <td className="py-1.5 px-3 text-right font-bold text-primary">70% (Fator 0.70)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              O campo <code>&lt;reducaoAcrescimo&gt;0.70&lt;/reducaoAcrescimo&gt;</code> é sincronizado diretamente no XML.
            </span>
            <button
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
