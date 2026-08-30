const fs = require('fs');

// Fix regressionFixtures.ts
let regContent = fs.readFileSync('src/utils/regressionFixtures.ts', 'utf8');
regContent = regContent.replace(/\\`/g, '`');
fs.writeFileSync('src/utils/regressionFixtures.ts', regContent);

// Fix test.ts
let testContent = fs.readFileSync('test.ts', 'utf8');
testContent = testContent.replace(/\\`/g, '`');
fs.writeFileSync('test.ts', testContent);

// Restore tissAuditor.ts
fs.copyFileSync('src/utils/tissAuditor.original.ts', 'src/utils/tissAuditor.ts');

// Read it
let content = fs.readFileSync('src/utils/tissAuditor.ts', 'utf8');

content = content.replace(
  '    const bloco = matchBloco[0];\n    const tipoG = matchBloco[1];\n    const matchStart = matchBloco.index;',
  '    const bloco = matchBloco[0];\n    const tipoGuiaAtual = matchBloco[2];\n    const ehConsulta = /^guiaConsulta$/i.test(tipoGuiaAtual);\n    const ehSadt = /^guia(?:SP-?)?SADT$/i.test(tipoGuiaAtual);\n    const matchStart = matchBloco.index;'
);

content = content.replace(
  '    if (/guiaConsulta/i.test(tipoG)) {\n      valorConsulta += valorGuia;\n    } else {\n      valorSadt += valorGuia; // Agrupa outros tipos de guia no "SADT" pro lote\n    }',
  '    if (ehConsulta) {\n      valorConsulta += valorGuia;\n    } else {\n      valorSadt += valorGuia; // Agrupa outros tipos de guia no "SADT" pro lote\n    }'
);

content = content.replace(
  '    // Detect Namespace prefix used in this guide block (e.g. "ans:" or "")\n    const nsMatch = bloco.match(/<([a-zA-Z0-9_-]+:)?(?:guiaConsulta|guiaSP-SADT)/i);\n    const ns = nsMatch && nsMatch[1] ? nsMatch[1] : \'\';',
  '    // Detect Namespace prefix used in this guide block (e.g. "ans:" or "").\n    const tipoEscapadoParaNs = tipoGuiaAtual.replace(/[.*+?^${}()|[\\]\\\\]/g, \'\\\\$&\');\n    const nsMatch = bloco.match(new RegExp(`<([a-zA-Z0-9_-]+:)?${tipoEscapadoParaNs}`, \'i\'));\n    const ns = nsMatch && nsMatch[1] ? nsMatch[1] : \'\';'
);

content = content.replace('    if (/guiaConsulta/i.test(bloco)) {', '    if (ehConsulta) {');

content = content.replace('} else if (/<(?:[^:]+:)?guiaSP-SADT/i.test(bloco)) {', '} else if (ehSadt) {');
content = content.replace('} else if (/guia(?:SP-?)?SADT/i.test(bloco)) {', '} else if (ehSadt) {');

content = content.replace(
  '    if (/<(?:[^:>]+:)?(?:guiaConsulta|guiaSP-SADT|guiaResumoInternacao|guiaHonorarioIndividual|guiaOutrasDespesas|guiaOdontologia)/i.test(trecho)) {',
  '    if (new RegExp(`<([^:>]+:)?(${TIPOS_GUIA_ALT})`, \'i\').test(trecho)) {'
);

fs.writeFileSync('src/utils/tissAuditor.ts', content);
console.log('Fixed everything');
