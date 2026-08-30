import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon, X } from 'lucide-react';
import { Inconsistency } from '../types/tiss';

interface CriticalAuditPopupProps {
  isOpen: boolean;
  onClose: () => void;
  errors: Inconsistency[];
}

export const CriticalAuditPopup: React.FC<CriticalAuditPopupProps> = ({ isOpen, onClose, errors }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[#1a1d1e] border-2 border-red-500/50 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="bg-red-500/10 px-6 py-4 flex items-center justify-between border-b border-red-500/20">
              <div className="flex items-center gap-3">
                <AlertOctagon size={24} className="text-red-400" />
                <h2 className="text-red-100 font-medium text-lg tracking-wide uppercase">Corrigir modelo TISS</h2>
              </div>
              <button
                onClick={onClose}
                className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Foram detectadas <strong>múltiplas tags críticas vazias ou órfãs</strong> neste lote.
                A ausência dessas informações gera glosa imediata e invalidação do faturamento junto à operadora.
              </p>

              <div className="space-y-3 mt-4">
                {errors.map((erro, idx) => (
                  <div key={idx} className="bg-[#121415] border border-[#2d3235] p-3 rounded-lg flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-red-400 font-bold text-xs">{idx + 1}</span>
                    </div>
                    <div>
                      <h4 className="text-gray-200 font-medium text-[13px]">{erro.original}</h4>
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                        {erro.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-[#2d3235] bg-[#121415] flex justify-end">
              <button
                onClick={onClose}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-lg transition-all shadow-lg shadow-red-500/20 active:scale-95"
              >
                Entendi, vou corrigir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
