import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Save, X } from 'lucide-react';

interface HospitalModalProps {
  nomeAtual: string;
  onSalvar: (novoNome: string) => void;
  onFechar: () => void;
}

export const HospitalModal: React.FC<HospitalModalProps> = ({
  nomeAtual,
  onSalvar,
  onFechar,
}) => {
  const [nome, setNome] = useState(nomeAtual);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim()) {
      onSalvar(nome.trim().toUpperCase());
      onFechar();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d1e] border border-[#2d3235] rounded-lg p-5 w-full max-w-md space-y-4 text-gray-200 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2d3235] pb-3">
          <h3 className="text-sm font-bold text-[#00b4d8] flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>Razão Social do Faturamento</span>
          </h3>
          <button onClick={onFechar} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Nome Padrão do Hospital / Prestador Contratado
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: HOSPITAL H OLHOS"
              className="w-full bg-[#0e1111] border border-[#2d3235] rounded p-2.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#00b4d8]"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Utilizado pelo motor de auditoria ao reparar inconsistências de ausência de tag &lt;nomeContratado&gt;.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onFechar}
              className="px-3 py-1.5 text-xs bg-[#2a2d2e] hover:bg-[#383c3e] text-gray-300 rounded cursor-pointer transition-all"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0px 0px 10px rgba(42, 157, 143, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!nome.trim()}
              className="px-4 py-1.5 text-xs font-bold bg-[#2a9d8f] hover:bg-[#21867a] text-white rounded flex items-center gap-1.5 disabled:opacity-40 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Razão Social</span>
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
};
