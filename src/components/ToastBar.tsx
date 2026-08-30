import React from 'react';
import { ToastState } from '../types/tiss';

interface ToastBarProps {
  toast: ToastState;
  ultimaAtualizacao?: Date;
}

export const ToastBar: React.FC<ToastBarProps> = ({ toast, ultimaAtualizacao }) => {
  return (
    <footer
      className="h-7 border-t border-[#2d3235] px-4 flex items-center justify-between text-xs font-bold transition-colors duration-300 shrink-0 select-none"
      style={{
        backgroundColor: toast.cor || '#00b4d8',
        color: toast.cor === '#1a1d1e' ? '#a0a0a0' : '#000000',
      }}
    >
      <div className="flex items-center gap-2 truncate">
        <span className="truncate">{toast.mensagem}</span>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-mono shrink-0 hidden sm:flex">
        {ultimaAtualizacao && (
          <span className="opacity-60 text-gray-200/70 font-medium">
            Última atualização: {ultimaAtualizacao.toLocaleString()}
          </span>
        )}
        <span className="opacity-80">
          TISS v8.0 Enterprise | Standard ANS
        </span>
      </div>
    </footer>
  );
};
