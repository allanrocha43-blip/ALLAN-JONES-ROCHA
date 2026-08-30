const fs = require('fs');

// Add formatXml function to tissAuditor.ts
let tiss = fs.readFileSync('src/utils/tissAuditor.ts', 'utf8');
const formatFn = `
export function formatXmlBruto(xml: string): string {
  try {
    let xmlTrabalho = xml.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
    xmlTrabalho = xmlTrabalho.split('\\n').filter(l => l.trim() !== '').join('\\n');
    let formatted = format(xmlTrabalho, {
      indentation: '  ',
      collapseContent: true,
      lineSeparator: '\\n',
      whiteSpaceAtEndOfSelfclosingTag: true
    });
    if (formatted.startsWith('<?xml') && !formatted.includes('<?xml version="1.0" encoding="ISO-8859-1"?>\\n')) {
      formatted = formatted.replace(/(<\\?xml[^>]+>)/, '$1\\n');
    }
    return formatted;
  } catch (e) {
    return xml;
  }
}
`;
tiss += formatFn;
fs.writeFileSync('src/utils/tissAuditor.ts', tiss);

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  'import { exportarXmlValidadoComHash, sincronizarDadosGuia, sincronizarProcedimento, aplicarCorrecaoIndividual } from "./utils/tissAuditor";',
  'import { exportarXmlValidadoComHash, sincronizarDadosGuia, sincronizarProcedimento, aplicarCorrecaoIndividual, formatXmlBruto } from "./utils/tissAuditor";'
);

app = app.replace(
  'function Editor({ arquivo, inconsistencias, linhaDestaque, onOpenHash, onOpenSaveAs }: { arquivo?: LoadedFile, inconsistencias: Inconsistency[], linhaDestaque: number | null, onOpenHash: () => void, onOpenSaveAs: () => void }) {',
  'function Editor({ arquivo, inconsistencias, linhaDestaque, onOpenHash, onOpenSaveAs, onUpdateConteudo }: { arquivo?: LoadedFile, inconsistencias: Inconsistency[], linhaDestaque: number | null, onOpenHash: () => void, onOpenSaveAs: () => void, onUpdateConteudo: (c: string) => void }) {'
);

app = app.replace(
  '<Editor arquivo={arquivoAtivo} inconsistencias={audit?.inconsistencias || []} linhaDestaque={linhaDestaque} onOpenHash={() => setModalHashReaderAberto(true)} onOpenSaveAs={() => setModalSaveAsAberto(true)} />',
  '<Editor arquivo={arquivoAtivo} inconsistencias={audit?.inconsistencias || []} linhaDestaque={linhaDestaque} onOpenHash={() => setModalHashReaderAberto(true)} onOpenSaveAs={() => setModalSaveAsAberto(true)} onUpdateConteudo={(c) => { setArquivos(prev => prev.map(a => a.id === arquivoAtivo!.id ? { ...a, conteudo: c, ultimaAtualizacao: new Date() } : a)) }} />'
);

app = app.replace(
  '<button className="rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors">\n              Formatar\n            </button>',
  '<button onClick={() => onUpdateConteudo(formatXmlBruto(arquivo.conteudo))} className="rounded border border-border bg-surface-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors">\n              Formatar\n            </button>'
);

fs.writeFileSync('src/App.tsx', app);
console.log('Format and Update Conteudo added');
