const fs = require('fs');

let content = fs.readFileSync('src/utils/tissAuditor.ts', 'utf8');

// 1. matchBloco[2] and ehConsulta / ehSadt
content = content.replace(
  `    const bloco = matchBloco[0];\n    const tipoG = matchBloco[1];\n    const matchStart = matchBloco.index;`,
  `    const bloco = matchBloco[0];\n    const tipoGuiaAtual = matchBloco[2];\n    const ehConsulta = /^guiaConsulta$/i.test(tipoGuiaAtual);\n    const ehSadt = /^guia(?:SP-?)?SADT$/i.test(tipoGuiaAtual);\n    const matchStart = matchBloco.index;`
);

// 2. valorConsulta +=
content = content.replace(
  `    if (/guiaConsulta/i.test(tipoG)) {\n      valorConsulta += valorGuia;\n    } else {\n      valorSadt += valorGuia; // Agrupa outros tipos de guia no "SADT" pro lote\n    }`,
  `    if (ehConsulta) {\n      valorConsulta += valorGuia;\n    } else {\n      valorSadt += valorGuia; // Agrupa outros tipos de guia no "SADT" pro lote\n    }`
);

// 3. Namespace fix
content = content.replace(
  `    // Detect Namespace prefix used in this guide block (e.g. "ans:" or "")\n    const nsMatch = bloco.match(/<([a-zA-Z0-9_-]+:)?(?:guiaConsulta|guiaSP-SADT)/i);\n    const ns = nsMatch && nsMatch[1] ? nsMatch[1] : '';`,
  `    // Detect Namespace prefix used in this guide block (e.g. "ans:" or "").\n    const tipoEscapadoParaNs = tipoGuiaAtual.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');\n    const nsMatch = bloco.match(new RegExp(\`<([a-zA-Z0-9_-]+:)?\${tipoEscapadoParaNs}\`, 'i'));\n    const ns = nsMatch && nsMatch[1] ? nsMatch[1] : '';`
);

// 4. if (/guiaConsulta/i.test(bloco))
content = content.replace(
  `    if (/guiaConsulta/i.test(bloco)) {`,
  `    if (ehConsulta) {`
);

// 5. } else if (/guia(?:SP-?)?SADT/i.test(bloco)) {
content = content.replace(
  `} else if (/guia(?:SP-?)?SADT/i.test(bloco)) {`,
  `} else if (ehSadt) {`
);
content = content.replace(
  `} else if (/<(?:[^:]+:)?guiaSP-SADT/i.test(bloco)) {`,
  `} else if (ehSadt) {`
);

// 6. sincronizarDadosGuia
content = content.replace(
  `    if (/<(?:[^:>]+:)?(?:guiaConsulta|guiaSP-SADT|guiaResumoInternacao|guiaHonorarioIndividual|guiaOutrasDespesas|guiaOdontologia)/i.test(trecho)) {`,
  `    if (new RegExp(\`<(?:[^:>]+:)?(?:\${TIPOS_GUIA_ALT})\`, 'i').test(trecho)) {`
);

// Write back
fs.writeFileSync('src/utils/tissAuditor.ts', content);
console.log('Patched tissAuditor.ts successfully');
