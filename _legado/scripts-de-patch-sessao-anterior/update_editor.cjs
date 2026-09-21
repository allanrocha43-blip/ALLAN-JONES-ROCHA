const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const originalHeader = `      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-[11px]">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono">{arquivo.nome}</span>
          <span className="shrink-0 rounded border border-crit/40 bg-crit-surface px-1.5 py-0.5 font-medium text-crit">
            {inconsistencias.length} inconsistências
          </span>
        </div>
      </div>`;

const newHeader = `      <div className="flex flex-col gap-2 border-b border-border px-4 py-2 text-[11px]">
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
            <input type="text" placeholder="Localizar no XML..." className="bg-transparent outline-none w-24 placeholder:text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Linhas: <span className="text-foreground">{linhas.length}</span></span>
            <span className="w-px h-2 bg-border"></span>
            <span>Chars: <span className="text-foreground">{arquivo.conteudo.length}</span></span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="rounded border border-info/40 bg-info-surface/20 px-2 py-1 text-info hover:bg-info-surface transition-colors">
              # Gerar Hash
            </button>
            <button className="rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors">
              Formatar
            </button>
            <button className="rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigator.clipboard.writeText(arquivo.conteudo)}>
              Copiar
            </button>
            <button className="rounded bg-primary px-2 py-1 text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              Salvar (Ctrl+S)
            </button>
            <button className="rounded border border-primary/40 text-primary px-2 py-1 font-medium hover:bg-primary/10 transition-colors">
              Salvar Como...
            </button>
          </div>
        </div>
      </div>`;

content = content.replace(originalHeader, newHeader);
fs.writeFileSync('src/App.tsx', content);
console.log('Editor header updated');
