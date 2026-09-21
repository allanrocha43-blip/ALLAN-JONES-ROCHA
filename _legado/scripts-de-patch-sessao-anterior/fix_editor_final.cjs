const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

const oldEditorStart = 'function Editor({ arquivo, inconsistencias, linhaDestaque, onOpenHash, onOpenSaveAs, onUpdateConteudo }: { arquivo?: LoadedFile, inconsistencias: Inconsistency[], linhaDestaque: number | null, onOpenHash: () => void, onOpenSaveAs: () => void, onUpdateConteudo: (c: string) => void }) {';

// I need to replace from oldEditorStart to the end of the Editor component.
// The Editor component ends at `649-}`

const editorRegex = /function Editor\(\{ arquivo.*?\n\}\n\nfunction ResumoSimples/s;

const newEditor = `function Editor({ arquivo, inconsistencias, linhaDestaque, onOpenHash, onOpenSaveAs, onUpdateConteudo }: { arquivo?: LoadedFile, inconsistencias: Inconsistency[], linhaDestaque: number | null, onOpenHash: () => void, onOpenSaveAs: () => void, onUpdateConteudo: (c: string) => void }) {
  const viewRef = useRef<any>(null);

  useEffect(() => {
    if (linhaDestaque && viewRef.current) {
      const view = viewRef.current.view;
      if (view) {
        try {
          const line = view.state.doc.line(Math.min(linhaDestaque, view.state.doc.lines));
          view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'center' }) });
          // Optional: we can add a cursor selection to highlight the line
          view.dispatch({ selection: { anchor: line.from, head: line.to } });
        } catch(e) {}
      }
    }
  }, [linhaDestaque]);

  if (!arquivo) return null;
  const linhas = arquivo.conteudo.split('\\n');

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-2 text-[11px] bg-surface">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono">{arquivo.nome}</span>
            <span className="shrink-0 rounded border border-crit/40 bg-crit-surface px-1.5 py-0.5 font-medium text-crit">
              {inconsistencias.length} inconsistências
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded px-2 py-1">
            <Search className="size-3 text-muted-foreground" />
            <input type="text" placeholder="Localizar..." className="bg-transparent outline-none w-24 placeholder:text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Linhas: <span className="text-foreground">{linhas.length}</span></span>
            <span className="w-px h-2 bg-border"></span>
            <span>Chars: <span className="text-foreground">{arquivo.conteudo.length}</span></span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={onOpenHash} className="rounded border border-info/40 bg-info-surface/20 px-2 py-1 text-info hover:bg-info-surface transition-colors">
              # Gerar Hash
            </button>
            <button onClick={() => onUpdateConteudo(formatXmlBruto(arquivo.conteudo))} className="rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors">
              Formatar
            </button>
            <button className="rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigator.clipboard.writeText(arquivo.conteudo)}>
              Copiar
            </button>
            <button onClick={onOpenSaveAs} className="rounded border border-primary/40 text-primary px-2 py-1 font-medium hover:bg-primary/10 transition-colors">
              Salvar Como...
            </button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-background flex flex-col">
        <CodeMirror
          ref={viewRef}
          value={arquivo.conteudo}
          height="100%"
          extensions={[xml()]}
          onChange={(value) => {
            onUpdateConteudo(value);
          }}
          className="flex-1 text-[13px] leading-relaxed"
          theme="dark"
        />
      </div>
    </>
  );
}

function ResumoSimples`;

app = app.replace(editorRegex, newEditor);

fs.writeFileSync('src/App.tsx', app);
console.log('Replaced Editor with CodeMirror');
