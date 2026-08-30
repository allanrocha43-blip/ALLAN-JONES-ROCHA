const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// Need to import Edit from lucide-react? We probably have some icons already.
// Let's check what's imported from lucide-react.
app = app.replace(
  'function Editor({ arquivo, inconsistencias, linhaDestaque, onOpenHash, onOpenSaveAs, onUpdateConteudo }: { arquivo?: LoadedFile, inconsistencias: Inconsistency[], linhaDestaque: number | null, onOpenHash: () => void, onOpenSaveAs: () => void, onUpdateConteudo: (c: string) => void }) {',
  `function Editor({ arquivo, inconsistencias, linhaDestaque, onOpenHash, onOpenSaveAs, onUpdateConteudo }: { arquivo?: LoadedFile, inconsistencias: Inconsistency[], linhaDestaque: number | null, onOpenHash: () => void, onOpenSaveAs: () => void, onUpdateConteudo: (c: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  
  useEffect(() => {
    if (arquivo && !isEditing) {
      setEditValue(arquivo.conteudo);
    }
  }, [arquivo, isEditing]);

  const handleSaveEdit = () => {
    if (editValue !== arquivo?.conteudo) {
      onUpdateConteudo(editValue);
    }
    setIsEditing(false);
  };
`
);

app = app.replace(
  '<button className="rounded bg-primary px-2 py-1 text-primary-foreground font-medium hover:opacity-90 transition-opacity">\n              Salvar (Ctrl+S)\n            </button>',
  `{isEditing ? (
              <button onClick={handleSaveEdit} className="rounded bg-primary px-2 py-1 text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                Salvar (Ctrl+S)
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="rounded bg-primary px-2 py-1 text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                Editar XML
              </button>
            )}`
);

const renderLines = `{linhas.map((texto, index) => {`;
const newRenderLines = `{isEditing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveEdit();
              }
            }}
            spellCheck={false}
            className="w-full h-full min-h-full bg-background text-foreground font-mono text-[12.5px] leading-relaxed p-4 outline-none resize-none"
          />
        ) : linhas.map((texto, index) => {`;

app = app.replace(renderLines, newRenderLines);

// Append the closing paren for the conditional rendering of linhas.map
const endRenderLines = `          );
        })}`;
const newEndRenderLines = `          );
        })}`;

app = app.replace(
  '          );\n        })}\n      </div>',
  '          );\n        }) }\n      </div>'
); // No wait, it's just `) : linhas.map(...)` so I only need to close it? No, wait. 
// `{isEditing ? (<textarea ... />) : linhas.map(...) }`
// Yes, the `}` closes the JSX expression that starts at `{isEditing ?`.

fs.writeFileSync('src/App.tsx', app);
console.log('Textarea Editor added');
