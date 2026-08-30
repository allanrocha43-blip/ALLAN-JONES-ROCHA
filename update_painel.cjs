const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '              <p className="mt-1.5 text-[12px] text-foreground/90">\n                {inc.desc}\n              </p>',
  `              <p className="mt-1.5 text-[12px] text-foreground/90">
                {inc.desc}
              </p>
              {avancado && inc.original && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">De:</div>
                  <code className="block p-1.5 rounded bg-background/50 border border-border text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                    {inc.original.trim()}
                  </code>
                </div>
              )}
              {avancado && inc.sugestao && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] text-ok uppercase tracking-wide">Para (sugestão):</div>
                  <code className="block p-1.5 rounded bg-ok-surface/50 border border-ok/30 text-[11px] font-mono text-ok whitespace-pre-wrap">
                    {inc.sugestao.trim()}
                  </code>
                </div>
              )}`
);

fs.writeFileSync('src/App.tsx', content);
console.log('PainelAuditoria updated');
