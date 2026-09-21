const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Use central severidade
content = content.replace(
  `import { exportarXmlValidadoComHash, sincronizarDadosGuia, sincronizarProcedimento, aplicarCorrecaoIndividual, formatXmlBruto } from "./utils/tissAuditor";\nimport { GuidesTable } from "./components/GuidesTable";\n\ntype Severity = "crit" | "warn" | "info";\n\nconst sevToken: Record<Severity | "ok", { text: string; bg: string; border: string; dot: string }> = {\n  crit: { text: "text-crit", bg: "bg-crit-surface", border: "border-crit/40", dot: "bg-crit" },\n  warn: { text: "text-warn", bg: "bg-warn-surface", border: "border-warn/40", dot: "bg-warn" },\n  info: { text: "text-info", bg: "bg-info-surface", border: "border-info/40", dot: "bg-info" },\n  ok: { text: "text-ok", bg: "bg-ok-surface", border: "border-ok/40", dot: "bg-ok" },\n};`,
  `import { exportarXmlValidadoComHash, sincronizarDadosGuia, sincronizarProcedimento, aplicarCorrecaoIndividual, formatXmlBruto } from "./utils/tissAuditor";\nimport { GuidesTable } from "./components/GuidesTable";\nimport { Severity, getSeverity, sevToken } from "./utils/severidade";`
);

// Replace local isCrit with central getSeverity
content = content.replace(
  `const isCrit = (i: Inconsistency) => {
    const t = i.tipo.toLowerCase();
    return t.includes('erro') || t.includes('xsd') || t.includes('crítico') || t.includes('inválido');
  };
  const numCrit = inconsistencias.filter(isCrit).length;`,
  `const numCrit = inconsistencias.filter(i => getSeverity(i) === "crit").length;`
);

content = content.replace(
  `const sev: Severity = isCrit(inc) ? "crit" : "warn";`,
  `const sev: Severity = getSeverity(inc);`
);

fs.writeFileSync('src/App.tsx', content);
