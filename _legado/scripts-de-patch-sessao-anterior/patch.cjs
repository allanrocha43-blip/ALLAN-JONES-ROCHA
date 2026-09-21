const fs = require('fs');

let content = fs.readFileSync('src/utils/tissAuditor.ts', 'utf8');

// BUGFIX 1
content = content.replace(
  /const ehConsulta = \/guiaConsulta\/i\.test\(bloco\);\s*const ehSadt = \/guia(?:SP-\?)?SADT\/i\.test\(bloco\);/i,
  `const tipoGuiaAtual = matchBloco[2];\n    const ehConsulta = /^guiaConsulta$/i.test(tipoGuiaAtual);\n    const ehSadt = /^guia(?:SP-?)?SADT$/i.test(tipoGuiaAtual);`
);

// BUGFIX 2: nsMatch
content = content.replace(
  /const nsMatch = bloco\.match\(\/<([^:]+:)?(?:guiaConsulta|guiaSP-SADT)[^>]*\/i\);\s*const ns = nsMatch \? \(nsMatch\[1\] \|\| ""\) : "";/gi,
  `const tipoEscapadoParaNs = tipoGuiaAtual.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\\\$&');\n    const nsMatch = bloco.match(new RegExp(\`<([a-zA-Z0-9_-]+:)?\${tipoEscapadoParaNs}\`, 'i'));\n    const ns = nsMatch && nsMatch[1] ? nsMatch[1] : '';`
);

// Fallback if previous replacement didn't work:
content = content.replace(
  /const nsMatch = bloco\.match\(\/<([^:]+:)\?\([^)]+\)\/i\);\n\s*const ns = nsMatch \? \(nsMatch\[1\] \|\| ""\) : "";/g,
  `const tipoEscapadoParaNs = tipoGuiaAtual.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\\\$&');\n    const nsMatch = bloco.match(new RegExp(\`<([a-zA-Z0-9_-]+:)?\${tipoEscapadoParaNs}\`, 'i'));\n    const ns = nsMatch && nsMatch[1] ? nsMatch[1] : '';`
);

// BUGFIX 3: sincronizarDadosGuia
// Old: if (/<(?:[^:>]+:)?(?:guiaConsulta|guiaSP-SADT|guiaResumoInternacao|guiaHonorarioIndividual|guiaOutrasDespesas)/i.test(trecho)) {
// New: if (new RegExp(`<(?:[^:>]+:)?(?:${TIPOS_GUIA_ALT})`, 'i').test(trecho)) {
content = content.replace(
  /if \(\/<(?:[^:>]+:)\?\(\?:guiaConsulta\|guiaSP-SADT\|guiaResumoInternacao\|guiaHonorarioIndividual\|guiaOutrasDespesas\)\/i\.test\(trecho\)\) \{/i,
  `if (new RegExp(\`<(?:[^:>]+:)?(?:\${TIPOS_GUIA_ALT})\`, 'i').test(trecho)) {`
);

fs.writeFileSync('src/utils/tissAuditor.ts', content);
