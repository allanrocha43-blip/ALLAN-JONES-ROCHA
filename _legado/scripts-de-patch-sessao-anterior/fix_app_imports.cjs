const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /import \{ LoadedFile, AuditResult, Inconsistency, GuideItem \} from "\.\/types\/tiss";/,
  'import { LoadedFile, AuditResult, Inconsistency, GuideItem, ProcedimentoItem } from "./types/tiss";'
);
fs.writeFileSync('src/App.tsx', app);

let gt = fs.readFileSync('src/components/GuidesTable.tsx', 'utf8');
// 'source' is declared but its value is never read.
// We can just remove source parameter from handleBridgeSync if not used. Actually we used handleBridgeSync with source, but source is not used inside.
gt = gt.replace(/const handleBridgeSync = \(guideId: string, source: 'senha' \| 'guia' \| 'guiaPrestador', value: string\) => \{/g,
  "const handleBridgeSync = (guideId: string, _source: 'senha' | 'guia' | 'guiaPrestador', value: string) => {"
);
fs.writeFileSync('src/components/GuidesTable.tsx', gt);

console.log('Fixed ProcedimentoItem and _source');
