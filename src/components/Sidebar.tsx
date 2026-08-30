import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { FileCode, Plus, Trash2, FileText, Sparkles, AlertTriangle, CheckCircle, UploadCloud } from 'lucide-react';
import { LoadedFile } from '../types/tiss';

interface SidebarProps {
  arquivos: LoadedFile[];
  arquivoAtivoId: string | null;
  onSelecionarArquivo: (id: string) => void;
  onAdicionarArquivos: (files: FileList | File[]) => void;
  onRemoverArquivo: (id: string) => void;
  onCarregarExemplo: (tipo: 'erros' | 'sadt') => void;
  onAdicionarTextoDireto: (nome: string, conteudo: string) => void;
  onOpenExtratorAns?: () => void;
  erroCountsByFileId: Record<string, number>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  arquivos,
  arquivoAtivoId,
  onSelecionarArquivo,
  onAdicionarArquivos,
  onRemoverArquivo,
  onCarregarExemplo,
  onAdicionarTextoDireto,
  onOpenExtratorAns,
  erroCountsByFileId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mostrarModalPaste, setMostrarModalPaste] = useState(false);
  const [nomeNovoXml, setNomeNovoXml] = useState('novo_lote_tiss.xml');
  const [conteudoColado, setConteudoColado] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAdicionarArquivos(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAdicionarArquivos(e.dataTransfer.files);
    }
  };

  const handleConfirmPaste = () => {
    if (!conteudoColado.trim()) return;
    const nome = nomeNovoXml.trim().endsWith('.xml') ? nomeNovoXml.trim() : `${nomeNovoXml.trim()}.xml`;
    onAdicionarTextoDireto(nome, conteudoColado);
    setConteudoColado('');
    setMostrarModalPaste(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <aside 
      className="w-64 bg-[#0e1111] border-r border-[#222629] flex flex-col h-full shrink-0 select-none text-gray-200"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* File Upload & Secondary Actions with Clean Breathing Room */}
      <div className="p-4 border-b border-[#222629] flex flex-col gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".xml"
          className="hidden"
        />

        {/* Botão Primário em Destaque */}
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0px 0px 14px rgba(0, 180, 216, 0.4)" }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            fileInputRef.current?.click();
          }}
          className="w-full py-2.5 px-3 bg-[#00b4d8] hover:bg-[#0096c7] text-black font-bold text-xs rounded-md flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Adicionar XML</span>
        </motion.button>

        {/* Botões Secundários com Estilo Ghost/Outline para não brigarem com o botão de Adicionar */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="grid grid-cols-2 gap-1.5">
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.03)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onCarregarExemplo('erros')}
              title="Carregar Lote Exemplo TISS 3.05 com Inconsistências"
              className="py-1.5 px-2 bg-transparent hover:bg-[#1a1d1e] text-gray-400 hover:text-gray-200 text-[11px] rounded border border-[#2d3235] hover:border-gray-600 flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#e9c46a]" />
              <span>Exemplo TISS 3</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.03)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onCarregarExemplo('sadt')}
              title="Carregar Lote Exemplo TISS 4.01 SADT"
              className="py-1.5 px-2 bg-transparent hover:bg-[#1a1d1e] text-gray-400 hover:text-gray-200 text-[11px] rounded border border-[#2d3235] hover:border-gray-600 flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#2a9d8f]" />
              <span>Exemplo TISS 4</span>
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setMostrarModalPaste(true)}
            className="w-full py-1.5 text-[11px] text-gray-400 hover:text-gray-200 bg-transparent hover:bg-[#1a1d1e] border border-dashed border-[#2d3235] hover:border-gray-600 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span>Colar XML diretamente</span>
          </motion.button>

          {onOpenExtratorAns && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenExtratorAns}
              className="w-full py-1.5 text-[11px] text-[#00b4d8]/80 hover:text-[#00b4d8] bg-transparent hover:bg-[#00b4d8]/10 border border-[#00b4d8]/20 hover:border-[#00b4d8]/50 rounded flex items-center justify-center gap-1.5 transition-all font-medium cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00b4d8] animate-pulse" />
              <span>Extrator Operadoras (IA)</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Loaded Files List with Generous Spacing */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase px-2 py-1 flex items-center justify-between">
          <span>Lotes Carregados</span>
          <span className="bg-[#1a1d1e] border border-[#2d3235] px-1.5 py-0.2 rounded text-gray-400 font-mono text-[10px]">
            {arquivos.length}
          </span>
        </div>

        {arquivos.length === 0 ? (
          <div 
            className="p-4 text-center border-2 border-dashed border-[#222629] rounded-lg my-2 cursor-pointer hover:border-[#00b4d8]/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-medium">Nenhum arquivo XML</p>
            <p className="text-[11px] text-gray-500 mt-1">Arraste ou clique para Adicionar XML</p>
          </div>
        ) : (
          arquivos.map((arq) => {
            const isAtivo = arq.id === arquivoAtivoId;
            const errorCount = erroCountsByFileId[arq.id] ?? 0;

            return (
              <div
                key={arq.id}
                onClick={() => onSelecionarArquivo(arq.id)}
                className={`group flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-all border ${
                  isAtivo
                    ? 'bg-[#1a1d1e] text-[#00b4d8] border-[#00b4d8]/40 shadow-sm'
                    : 'text-gray-300 hover:bg-[#151819] border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                  <FileCode className={`w-4 h-4 shrink-0 ${isAtivo ? 'text-[#00b4d8]' : 'text-gray-500'}`} />
                  <div className="truncate min-w-0">
                    <p className="font-mono text-xs truncate leading-tight">{arq.nome}</p>
                    <p className="text-[10px] text-gray-500 font-sans">{formatFileSize(arq.tamanhoBytes)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {errorCount > 0 ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/30 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-3 h-3" />
                      {errorCount}
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[10px] bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" />
                      OK
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoverArquivo(arq.id);
                    }}
                    title="Remover arquivo"
                    className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Direct Paste */}
      {mostrarModalPaste && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d1e] border border-[#2d3235] rounded-lg p-5 w-full max-w-lg space-y-4 text-gray-200 shadow-xl">
            <h3 className="text-sm font-bold text-[#00b4d8] flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              <span>Colar Conteúdo XML TISS</span>
            </h3>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Nome do Arquivo</label>
              <input
                type="text"
                value={nomeNovoXml}
                onChange={(e) => setNomeNovoXml(e.target.value)}
                className="w-full bg-[#0e1111] border border-[#2d3235] rounded p-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#00b4d8]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Conteúdo XML</label>
              <textarea
                value={conteudoColado}
                onChange={(e) => setConteudoColado(e.target.value)}
                placeholder="Cole o código XML TISS aqui..."
                rows={10}
                className="w-full bg-[#0e1111] border border-[#2d3235] rounded p-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#00b4d8] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMostrarModalPaste(false)}
                className="px-3 py-1.5 text-xs bg-[#2a2d2e] hover:bg-[#383c3e] rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPaste}
                disabled={!conteudoColado.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-[#00b4d8] hover:bg-[#0096c7] text-black rounded disabled:opacity-40"
              >
                Carregar XML
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
