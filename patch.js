const fs = require('fs');

let content = fs.readFileSync('src/utils/tissAuditor.ts', 'utf8');

// BUGFIX 1: MÓDULO ESTRUTURAL (Elemento Órfão Tracker TISS 4.01.00 & 3.05.00) e CÁLCULO DE TOTAIS
const oldModEst = `  while ((matchBloco = regexTodasGuiasParaTotal.exec(conteudo)) !== null) {
    guideCounter++;
    const bloco = matchBloco[0];
    const ehConsulta = /guiaConsulta/i.test(bloco);
    const ehSadt = /guia(?:SP-?)?SADT/i.test(bloco);
    const matchStart = matchBloco.index;`;

const newModEst = `  while ((matchBloco = regexTodasGuiasParaTotal.exec(conteudo)) !== null) {
    guideCounter++;
    const bloco = matchBloco[0];
    const tipoGuiaAtual = matchBloco[2];
    const ehConsulta = /^guiaConsulta$/i.test(tipoGuiaAtual);
    const ehSadt = /^guia(?:SP-?)?SADT$/i.test(tipoGuiaAtual);
    const matchStart = matchBloco.index;`;

if (content.includes('const ehConsulta = /guiaConsulta/i.test(bloco);')) {
    content = content.replace(
      /const ehConsulta = \/guiaConsulta\/i\.test\(bloco\);\s*const ehSadt = \/guia(?:SP-\?)?\SADT\/i\.test\(bloco\);/g,
      `const tipoGuiaAtual = matchBloco[2];\n    const ehConsulta = /^guiaConsulta$/i.test(tipoGuiaAtual);\n    const ehSadt = /^guia(?:SP-?)?SADT$/i.test(tipoGuiaAtual);`
    );
}

// BUGFIX 2: Namespace
const oldNs = `    const nsMatch = bloco.match(/<([^:]+:)?(guiaConsulta|guiaSP-SADT|guiaResumoInternacao)/i);
    const ns = nsMatch ? (nsMatch[1] || "") : "";`;

const newNs = `    const tipoEscapadoParaNs = tipoGuiaAtual.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
    const nsMatch = bloco.match(new RegExp(\`<([a-zA-Z0-9_-]+:)?\${tipoEscapadoParaNs}\`, 'i'));
    const ns = nsMatch && nsMatch[1] ? nsMatch[1] : '';`;

if (content.includes('const nsMatch = bloco.match(/<([^:]+:)?(guiaConsulta|guiaSP-SADT|guiaResumoInternacao)/i);')) {
    content = content.replace(oldNs, newNs);
} else {
    // maybe it is slightly different
    content = content.replace(
      /const nsMatch = bloco\.match\(\/<([^:]+:\)?)[^/]*\/i\);\s*const ns = nsMatch \? \(nsMatch\[1\] \|\| ""\) : "";/g,
      newNs
    );
    // Let's do a more robust replace for namespace logic
    content = content.replace(
      /const nsMatch = bloco\.match\(\/<([^:]+:\)?)(?:[^)]*)\)\/i\);\s*const ns = nsMatch \? \(nsMatch\[1\] \|\| ""\) : "";/g,
      newNs
    );
}

// Let's just find where `const nsMatch = bloco.match(` is.
