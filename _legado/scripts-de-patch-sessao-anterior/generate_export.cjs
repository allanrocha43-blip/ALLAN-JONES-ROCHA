const fs = require('fs');

const filesToExport = [
  'src/App.tsx',
  'src/utils/tabelaTiss.ts',
  'src/components/GuidesTable.tsx',
  'src/components/XmlEditor.tsx',
];

let output = '';

for (const file of filesToExport) {
  output += `\n\n=================================================================\n`;
  output += `FILE: ${file}\n`;
  output += `=================================================================\n\n`;
  output += fs.readFileSync(file, 'utf8');
}

// Extract calcularHashTISS context from tissAuditor.ts
const tissAuditor = fs.readFileSync('src/utils/tissAuditor.ts', 'utf8');
output += `\n\n=================================================================\n`;
output += `SNIPPET: src/utils/tissAuditor.ts (calcularHashTISS e funcoes relacionadas)\n`;
output += `=================================================================\n\n`;

// Find the export function calcularHashTISS and everything after it
const hashIndex = tissAuditor.indexOf('export function calcularHashTISS');
if (hashIndex !== -1) {
  output += tissAuditor.substring(hashIndex);
}

fs.writeFileSync('CODIGOS_PARA_REVISAO.txt', output);
console.log('File created: CODIGOS_PARA_REVISAO.txt');
