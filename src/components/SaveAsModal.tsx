import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Download, FileCode, X, Hash, Sparkles, FolderPlus } from 'lucide-react';
import { exportarXmlValidadoComHash, formatarEHarmonizarXml, prepararParaExportacaoEHash } from '../utils/tissAuditor';

interface SaveAsModalProps {
  isOpen: boolean;
  nomeAtual: string;
  conteudoAtual: string;
  onClose: () => void;
  onSalvarComoSucesso: (novoNome: string, novoConteudo: string, acao: 'download' | 'novo_no_sistema') => void;
}

export const SaveAsModal: React.FC<SaveAsModalProps> = ({
  isOpen,
  nomeAtual,
  conteudoAtual,
  onClose,
  onSalvarComoSucesso,
}) => {
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [incluirHash, setIncluirHash] = useState(true);
  const [formatarEstrutura, setFormatarEstrutura] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Suggest filename with _NOVO or keep original if user wants
      if (nomeAtual) {
        const extIndex = nomeAtual.lastIndexOf('.');
        if (extIndex !== -1) {
          const namePart = nomeAtual.substring(0, extIndex);
          const extPart = nomeAtual.substring(extIndex);
          if (!namePart.endsWith('_NOVO') && !namePart.endsWith('_VALIDADO')) {
            setNomeArquivo(`${namePart}_NOVO${extPart}`);
          } else {
            setNomeArquivo(nomeAtual);
          }
        } else {
          setNomeArquivo(`${nomeAtual}_NOVO.xml`);
        }
      } else {
        setNomeArquivo('lote_tiss_modificado.xml');
      }
    }
  }, [isOpen, nomeAtual]);

  if (!isOpen) return null;

  const processarConteudoParaSalvar = (): { finalConteudo: string; hashMD5?: string } => {
    let xmlTrabalho = conteudoAtual;

    // 1. Formatar/harmonizar se solicitado
    if (formatarEstrutura) {
      const resFormat = formatarEHarmonizarXml(xmlTrabalho);
      xmlTrabalho = resFormat.novoConteudo;
    }

    // 2. Recalcular e aplicar Hash MD5 se solicitado
    if (incluirHash) {
      const resHash = exportarXmlValidadoComHash(xmlTrabalho);
      if (resHash.sucesso) {
        xmlTrabalho = resHash.novoConteudo;
        return { finalConteudo: xmlTrabalho, hashMD5: resHash.hashCalculado };
      } else {
        throw new Error(resHash.erroMsg || "Não foi possível gerar o Hash MD5.");
      }
    }

    return { finalConteudo: xmlTrabalho };
  };

  const handleSalvarComoDownload = async () => {
    setSalvando(true);
    try {
      let nomeFinal = nomeArquivo.trim();
      if (!nomeFinal.toLocaleLowerCase().endsWith('.xml')) {
        nomeFinal += '.xml';
      }

      const { finalConteudo } = processarConteudoParaSalvar();

      // Encodar em ISO-8859-1 para padrão TISS
      const uint8Array = prepararParaExportacaoEHash(finalConteudo);

      // Tenta seletor de arquivo nativo (showSaveFilePicker) se disponível
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: nomeFinal,
            types: [
              {
                description: 'Arquivo XML TISS',
                accept: { 'application/xml': ['.xml'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(uint8Array);
          await writable.close();

          onSalvarComoSucesso(handle.name || nomeFinal, finalConteudo, 'download');
          onClose();
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setSalvando(false);
            return; // Cancelado pelo usuário
          }
          console.warn('Fallback para download padrão:', err);
        }
      }

      // Fallback de download tradicional por Blob
      const blob = new Blob([uint8Array], { type: 'application/xml;charset=iso-8859-1' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeFinal;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onSalvarComoSucesso(nomeFinal, finalConteudo, 'download');
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar como:', err);
      alert(err.message || 'Erro ao processar o arquivo.');
    } finally {
      setSalvando(false);
    }
  };

  const handleCriarNovoNoSistema = () => {
    try {
      let nomeFinal = nomeArquivo.trim();
      if (!nomeFinal.toLocaleLowerCase().endsWith('.xml')) {
        nomeFinal += '.xml';
      }

      const { finalConteudo } = processarConteudoParaSalvar();
      onSalvarComoSucesso(nomeFinal, finalConteudo, 'novo_no_sistema');
      onClose();
    } catch (err: any) {
      console.error('Erro ao criar novo no sistema:', err);
      alert(err.message || 'Erro ao processar o arquivo.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          className="bg-[#1a1d1e] border border-[#2d3235] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-[#121415] border-b border-[#2d3235]">
            <div className="flex items-center gap-2.5 text-[#00b4d8]">
              <Save className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Salvar Como... (Save As)</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#282d2f] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Nome do Novo Arquivo XML:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nomeArquivo}
                  onChange={(e) => setNomeArquivo(e.target.value)}
                  placeholder="ex: lote_tiss_salvo.xml"
                  className="w-full bg-[#0e1111] border border-[#2d3235] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8]"
                  autoFocus
                />
                <FileCode className="w-4 h-4 text-gray-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="bg-[#121415] border border-[#282d2f] rounded-lg p-3 space-y-2.5">
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={incluirHash}
                  onChange={(e) => setIncluirHash(e.target.checked)}
                  className="rounded bg-[#0e1111] border-[#3a3f42] text-[#00b4d8] focus:ring-0 w-4 h-4"
                />
                <Hash className="w-3.5 h-3.5 text-[#e9c46a]" />
                <span>Recalcular e Assinar Hash MD5 TISS</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formatarEstrutura}
                  onChange={(e) => setFormatarEstrutura(e.target.checked)}
                  className="rounded bg-[#0e1111] border-[#3a3f42] text-[#00b4d8] focus:ring-0 w-4 h-4"
                />
                <Sparkles className="w-3.5 h-3.5 text-[#2a9d8f]" />
                <span>Validar e Formatar estrutura XML antes de salvar</span>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleCriarNovoNoSistema}
                  disabled={!nomeArquivo.trim() || salvando}
                  className="w-full py-2 px-3 bg-[#1e2326] hover:bg-[#282e33] text-gray-200 border border-[#2d3235] text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  title="Abre este novo arquivo no painel lateral do sistema"
                >
                  <FolderPlus className="w-4 h-4 text-[#00b4d8]" />
                  <span>Novo no Painel</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0px 0px 12px rgba(42, 157, 143, 0.4)' }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleSalvarComoDownload}
                  disabled={!nomeArquivo.trim() || salvando}
                  className="w-full py-2 px-3 bg-[#2a9d8f] hover:bg-[#21867a] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  <span>{salvando ? 'Salvando...' : 'Salvar no Disco'}</span>
                </motion.button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
