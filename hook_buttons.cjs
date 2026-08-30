const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Modify the Editor props to accept callbacks
content = content.replace(
  'function Editor({ arquivo, inconsistencias, linhaDestaque }: { arquivo?: LoadedFile, inconsistencias: Inconsistency[], linhaDestaque: number | null }) {',
  'function Editor({ arquivo, inconsistencias, linhaDestaque, onOpenHash, onOpenSaveAs }: { arquivo?: LoadedFile, inconsistencias: Inconsistency[], linhaDestaque: number | null, onOpenHash: () => void, onOpenSaveAs: () => void }) {'
);

// Hook up the callbacks
content = content.replace(
  '<Editor arquivo={arquivoAtivo} inconsistencias={audit?.inconsistencias || []} linhaDestaque={linhaDestaque} />',
  '<Editor arquivo={arquivoAtivo} inconsistencias={audit?.inconsistencias || []} linhaDestaque={linhaDestaque} onOpenHash={() => setModalHashReaderAberto(true)} onOpenSaveAs={() => setModalSaveAsAberto(true)} />'
);

content = content.replace(
  '<button className="rounded border border-info/40 bg-info-surface/20 px-2 py-1 text-info hover:bg-info-surface transition-colors">',
  '<button onClick={onOpenHash} className="rounded border border-info/40 bg-info-surface/20 px-2 py-1 text-info hover:bg-info-surface transition-colors">'
);

content = content.replace(
  '<button className="rounded border border-primary/40 text-primary px-2 py-1 font-medium hover:bg-primary/10 transition-colors">\n              Salvar Como...\n            </button>',
  '<button onClick={onOpenSaveAs} className="rounded border border-primary/40 text-primary px-2 py-1 font-medium hover:bg-primary/10 transition-colors">\n              Salvar Como...\n            </button>'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Editor buttons hooked up');
