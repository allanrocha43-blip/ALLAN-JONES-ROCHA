import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Copy, Search, ArrowUp, ArrowDown, Check, Wand2, Save, SaveAll, Hash, Undo2, Redo2, Replace, ReplaceAll, ChevronDown, ChevronUp } from 'lucide-react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import { formatarEHarmonizarXml } from '../utils/tissAuditor';

interface XmlEditorProps {
  conteudo: string;
  onChangeConteudo: (novoConteudo: string) => void;
  linhaDestoque?: number | null;
  onSalvar: () => void;
  onSalvarComo?: () => void;
  onGerarHash: () => void;
  precisaGerarHash?: boolean;
}

export const XmlEditor: React.FC<XmlEditorProps> = ({
  conteudo,
  onChangeConteudo,
  linhaDestoque,
  onSalvar,
  onSalvarComo,
  onGerarHash,
  precisaGerarHash,
}) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [matches, setMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // Line replacement states
  const [showReplacePanel, setShowReplacePanel] = useState(false);
  const [replaceSearchTerm, setReplaceSearchTerm] = useState('');
  const [replaceNewText, setReplaceNewText] = useState('');
  const [preserveIndentation, setPreserveIndentation] = useState(true);
  const [replaceSuccessMsg, setReplaceSuccessMsg] = useState<string | null>(null);

  const totalLinhas = useMemo(() => {
    let count = 1;
    for (let i = 0; i < conteudo.length; i++) {
      if (conteudo[i] === '\n') count++;
    }
    return count;
  }, [conteudo]);

  // Identify lines matching the replace search term
  const matchingLinesForReplace = useMemo(() => {
    if (!replaceSearchTerm.trim()) return [];
    const term = replaceSearchTerm.toLowerCase();
    const lines = conteudo.split('\n');
    const matched: { lineNum: number; content: string }[] = [];
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(term)) {
        matched.push({ lineNum: idx + 1, content: line });
      }
    });
    return matched;
  }, [replaceSearchTerm, conteudo]);

  // Handle line replace all
  const handleSubstituirTudo = () => {
    if (!replaceSearchTerm.trim()) return;
    const lines = conteudo.split('\n');
    const term = replaceSearchTerm.toLowerCase();
    let count = 0;

    const newLines: string[] = [];
    lines.forEach((line) => {
      if (line.toLowerCase().includes(term)) {
        count++;
        let replacement = replaceNewText;
        if (preserveIndentation && replacement.trim() !== '') {
          const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
          replacement = leadingWhitespace + replacement.trim();
        }
        // Se a substituição for por linha vazia, não mantém a linha em branco: a linha de baixo preenche o seu lugar
        if (replacement.trim() === '') {
          return;
        }
        newLines.push(replacement);
      } else {
        newLines.push(line);
      }
    });

    if (count > 0) {
      onChangeConteudo(newLines.join('\n'));
      setReplaceSuccessMsg(`✓ ${count} linha(s) substituída(s) com sucesso!`);
      setTimeout(() => setReplaceSuccessMsg(null), 4000);
    } else {
      setReplaceSuccessMsg('Nenhuma linha encontrada.');
      setTimeout(() => setReplaceSuccessMsg(null), 3000);
    }
  };

  // Jump to specific line if requested
  useEffect(() => {
    if (linhaDestoque && linhaDestoque > 0 && editorRef.current?.view) {
      const view = editorRef.current.view;
      const doc = view.state.doc;
      const lineNum = Math.min(linhaDestoque, doc.lines);
      if (lineNum > 0) {
        const line = doc.line(lineNum);
        
        view.dispatch({
          selection: { anchor: line.from, head: line.to },
          effects: EditorView.scrollIntoView(line.from, { y: 'center' })
        });
        view.focus();
      }
    }
  }, [linhaDestoque]);

  // Handle Search
  const prevSearchTermRef = useRef(searchTerm);

  useEffect(() => {
    const isNewSearch = prevSearchTermRef.current !== searchTerm;
    prevSearchTermRef.current = searchTerm;

    if (!searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const term = searchTerm.toLowerCase();
    const matchLines: number[] = [];

    const lines = conteudo.split('\n');
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(term)) {
        matchLines.push(idx + 1);
      }
    });

    setMatches(matchLines);
    if (matchLines.length > 0) {
      if (isNewSearch) {
        setCurrentMatchIndex(0);
      } else {
        setCurrentMatchIndex(prev => {
          if (prev === -1) return 0;
          if (prev >= matchLines.length) return Math.max(0, matchLines.length - 1);
          return prev;
        });
      }
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [searchTerm, conteudo]);

  const jumpToLine = (linhaNum: number) => {
    if (editorRef.current?.view) {
      const view = editorRef.current.view;
      const doc = view.state.doc;
      const validLineNum = Math.min(Math.max(1, linhaNum), doc.lines);
      if (validLineNum > 0) {
        const line = doc.line(validLineNum);
        
        view.dispatch({
          selection: { anchor: line.from, head: line.to },
          effects: EditorView.scrollIntoView(line.from, { y: 'center' })
        });
      }
    }
  };

  const nextMatch = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    jumpToLine(matches[nextIdx]);
  };

  const prevMatch = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    jumpToLine(matches[prevIdx]);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(conteudo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormatXml = () => {
    const res = formatarEHarmonizarXml(conteudo);
    onChangeConteudo(res.novoConteudo);
    setReplaceSuccessMsg(res.msg);
    setTimeout(() => setReplaceSuccessMsg(null), 4000);
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1d1e] rounded-b-lg p-3 space-y-2 overflow-hidden text-gray-200">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2d3235] shrink-0 text-xs">
        {/* Search & Replace Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#0e1111] border border-[#2d3235] rounded px-2.5 py-1">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Localizar no XML..."
              className="bg-transparent border-none text-xs text-gray-200 font-mono focus:outline-none w-40"
            />

            {matches.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-gray-400 pl-1 border-l border-[#2d3235]">
                <span>
                  {currentMatchIndex + 1}/{matches.length}
                </span>
                <button onClick={prevMatch} className="hover:text-white p-0.5">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button onClick={nextMatch} className="hover:text-white p-0.5">
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowReplacePanel(!showReplacePanel)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-all cursor-pointer border ${
              showReplacePanel
                ? 'bg-[#00b4d8] text-black font-bold border-[#00b4d8]'
                : 'bg-[#0e1111] hover:bg-[#1a1d1e] text-gray-300 border-[#2d3235]'
            }`}
            title="Abrir painel para substituir linhas completas por código"
          >
            <Replace className="w-3.5 h-3.5" />
            <span>Substituir Linha</span>
            {showReplacePanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </motion.button>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
            Linhas: <strong className="text-white">{totalLinhas}</strong> | Chars: <strong className="text-white">{conteudo.length}</strong>
          </span>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0px 0px 10px rgba(233, 196, 106, 0.4)" }}
            whileTap={{ scale: 0.94 }}
            onClick={onGerarHash}
            title="Gerar e Assinar Nova Hash MD5"
            className="relative flex items-center gap-1 text-[11px] font-bold bg-[#e9c46a] hover:bg-[#d4b059] text-black px-2.5 py-1 rounded transition-all cursor-pointer"
          >
            <Hash className="w-3 h-3" />
            <span className="hidden sm:inline">Gerar Hash</span>
            {precisaGerarHash && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-[#252526]"></span>
            )}
          </motion.button>

          <div className="flex items-center ml-1 mr-1 gap-1 border-x border-[#2d3235] px-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => editorRef.current?.view && undo(editorRef.current.view)}
              title="Desfazer (Ctrl+Z)"
              className="flex items-center justify-center bg-[#2a2d2e] hover:bg-[#383c3e] text-gray-300 p-1 rounded transition-all cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5 text-gray-400" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => editorRef.current?.view && redo(editorRef.current.view)}
              title="Refazer (Ctrl+Y)"
              className="flex items-center justify-center bg-[#2a2d2e] hover:bg-[#383c3e] text-gray-300 p-1 rounded transition-all cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5 text-gray-400" />
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0px 0px 10px rgba(0, 180, 216, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleFormatXml}
            title="Formatar Identação do XML e Corrigir Estrutura"
            className="flex items-center gap-1 text-[11px] bg-[#2a2d2e] hover:bg-[#383c3e] text-gray-300 px-2.5 py-1 rounded transition-all cursor-pointer"
          >
            <Wand2 className="w-3 h-3 text-[#00b4d8]" />
            <span className="hidden sm:inline">Formatar</span>
          </motion.button>

          {replaceSuccessMsg && !showReplacePanel && (
            <span className="text-[11px] font-bold text-emerald-400 font-mono bg-[#0e1111] px-2 py-0.5 rounded border border-emerald-800/60">
              {replaceSuccessMsg}
            </span>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            title="Copiar XML"
            className="flex items-center gap-1 text-[11px] bg-[#2a2d2e] hover:bg-[#383c3e] text-gray-300 px-2.5 py-1 rounded transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
          </motion.button>

          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0px 0px 10px rgba(42, 157, 143, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onSalvar}
              title="Salvar alterações no arquivo atual (Ctrl+S)"
              className="flex items-center gap-1 text-[11px] font-bold bg-[#2a9d8f] hover:bg-[#21867a] text-white px-3 py-1 rounded transition-all shadow-sm cursor-pointer"
            >
              <Save className="w-3 h-3" />
              <span>Salvar <span className="hidden lg:inline text-[10px] opacity-80">(Ctrl+S)</span></span>
            </motion.button>

            {onSalvarComo && (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 10px rgba(0, 180, 216, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={onSalvarComo}
                title="Salvar como um novo arquivo ou baixar cópia"
                className="flex items-center gap-1 text-[11px] font-bold bg-[#1e2326] hover:bg-[#282e33] text-[#00b4d8] border border-[#00b4d8]/40 px-2.5 py-1 rounded transition-all shadow-sm cursor-pointer"
              >
                <SaveAll className="w-3 h-3 text-[#00b4d8]" />
                <span className="hidden sm:inline">Salvar Como...</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Replace Panel */}
      {showReplacePanel && (
        <div className="bg-[#0e1111] border border-[#2d3235] rounded-md p-3 text-xs space-y-2.5 shrink-0">
          <div className="flex items-center justify-between border-b border-[#222629] pb-1.5">
            <div className="flex items-center gap-2 font-bold text-[#00b4d8]">
              <ReplaceAll className="w-4 h-4" />
              <span>Substituição de Linha Inteira por Código</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={preserveIndentation}
                  onChange={(e) => setPreserveIndentation(e.target.checked)}
                  className="rounded bg-[#1a1d1e] border-[#2d3235] text-[#00b4d8] focus:ring-0"
                />
                <span>Preservar recuo/indentação original</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Coluna 1: Linha/Código a localizar */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
                <span>1. Digite o código/termo contido na linha:</span>
                {matchingLinesForReplace.length > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {matchingLinesForReplace.length} linha(s) identificada(s)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={replaceSearchTerm}
                onChange={(e) => setReplaceSearchTerm(e.target.value)}
                placeholder="Ex: <ans:codigoProcedimento>40301010</ans:codigoProcedimento>"
                className="bg-[#1a1d1e] border border-[#2d3235] rounded px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#00b4d8]"
              />
            </div>

            {/* Coluna 2: Novo conteúdo da linha */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-300">
                2. Digite a nova linha para substituição:
              </label>
              <input
                type="text"
                value={replaceNewText}
                onChange={(e) => setReplaceNewText(e.target.value)}
                placeholder="Ex: <ans:codigoProcedimento>40301020</ans:codigoProcedimento>"
                className="bg-[#1a1d1e] border border-[#2d3235] rounded px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#00b4d8]"
              />
            </div>
          </div>

          {/* Identificação de linhas + Botão Substituir Tudo */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#222629]">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 overflow-x-auto max-w-full">
              {matchingLinesForReplace.length > 0 ? (
                <>
                  <span className="text-gray-300 font-medium shrink-0">Linhas identificadas:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {matchingLinesForReplace.slice(0, 10).map((m) => (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        key={m.lineNum}
                        onClick={() => jumpToLine(m.lineNum)}
                        className="bg-[#1e2326] hover:bg-[#2a3035] text-[#00b4d8] border border-[#2d3235] px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer"
                        title={`Ir para linha ${m.lineNum}: ${m.content.trim()}`}
                      >
                        #{m.lineNum}
                      </motion.button>
                    ))}
                    {matchingLinesForReplace.length > 10 && (
                      <span className="text-[10px] text-gray-500 font-mono">
                        +{matchingLinesForReplace.length - 10} mais
                      </span>
                    )}
                  </div>
                </>
              ) : replaceSearchTerm.trim() ? (
                <span className="text-red-400 text-[11px]">Nenhuma linha contém o código digitado.</span>
              ) : (
                <span className="text-gray-500 text-[11px]">Digite o código acima para o sistema identificar as linhas do XML.</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {replaceSuccessMsg && (
                <span className="text-[11px] font-bold text-emerald-400 font-mono">
                  {replaceSuccessMsg}
                </span>
              )}
              <motion.button
                whileHover={matchingLinesForReplace.length > 0 ? { scale: 1.05, boxShadow: "0px 0px 10px rgba(0, 180, 216, 0.4)" } : undefined}
                whileTap={matchingLinesForReplace.length > 0 ? { scale: 0.95 } : undefined}
                onClick={handleSubstituirTudo}
                disabled={matchingLinesForReplace.length === 0}
                className="flex items-center gap-1.5 text-xs font-bold bg-[#00b4d8] hover:bg-[#0096b4] text-black px-3.5 py-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
              >
                <ReplaceAll className="w-3.5 h-3.5" />
                <span>Substituir Tudo ({matchingLinesForReplace.length})</span>
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* CodeMirror Area */}
      <div className="flex-1 overflow-hidden border border-[#2d3235] rounded bg-[#1e1e1e] font-mono text-xs relative flex flex-col">
        <CodeMirror
          ref={editorRef}
          value={conteudo}
          height="100%"
          theme={vscodeDark}
          extensions={useMemo(() => [xml(), EditorView.lineWrapping], [])}
          onChange={(val) => onChangeConteudo(val)}
          className="flex-1 overflow-auto text-[13px]"
          basicSetup={useMemo(() => ({
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }), [])}
        />
      </div>
    </div>
  );
};
