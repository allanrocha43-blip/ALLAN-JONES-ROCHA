const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const exportFunc = `  const handleExport = () => {`;
const deleteFunc = `  const handleExcluirLote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setArquivos((prev) => prev.filter((a) => a.id !== id));
    if (arquivoAtivoId === id) {
      const remaining = arquivos.filter((a) => a.id !== id);
      setArquivoAtivoId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleExport = () => {`;
  
content = content.replace(exportFunc, deleteFunc);

const originalMap = `              return (
                <button
                  key={a.id}
                  onClick={() => setArquivoAtivoId(a.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                    ativo
                      ? "border-primary/50 bg-primary/15"
                      : "border-transparent hover:border-border hover:bg-surface-2",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs">{a.nome}</span>
                    {aAudit && (
                      <span
                        className={cn(
                          "shrink-0 rounded border px-1.5 py-0.5 text-[10px]",
                          sevToken[tone].text,
                          sevToken[tone].border,
                          sevToken[tone].bg,
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                  {aAudit && (
                    <div className="mt-1.5 truncate text-[11px] text-muted-foreground">
                      {aAudit.guias.length} guias · {(aAudit.valorConsulta + aAudit.valorSadt).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  )}
                </button>
              );`;

const newMap = `              return (
                <div key={a.id} className="relative group block w-full">
                  <button
                    onClick={() => setArquivoAtivoId(a.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                      ativo
                        ? "border-primary/50 bg-primary/15"
                        : "border-transparent hover:border-border hover:bg-surface-2",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 pr-6">
                      <span className="truncate font-mono text-xs">{a.nome}</span>
                      {aAudit && (
                        <span
                          className={cn(
                            "shrink-0 rounded border px-1.5 py-0.5 text-[10px]",
                            sevToken[tone].text,
                            sevToken[tone].border,
                            sevToken[tone].bg,
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                    {aAudit && (
                      <div className="mt-1.5 truncate text-[11px] text-muted-foreground pr-6">
                        {aAudit.guias.length} guias · {(aAudit.valorConsulta + aAudit.valorSadt).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleExcluirLote(a.id, e)}
                    title="Excluir Lote"
                    className="absolute right-2 top-2 p-1.5 text-muted-foreground opacity-0 transition-all duration-200 hover:text-destructive hover:bg-destructive/10 rounded-md group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              );`;

content = content.replace(originalMap, newMap);

fs.writeFileSync('src/App.tsx', content);
console.log('Done');
