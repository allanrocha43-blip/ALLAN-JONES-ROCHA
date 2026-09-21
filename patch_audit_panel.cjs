const fs = require('fs');
let panel = fs.readFileSync('src/components/AuditPanel.tsx', 'utf8');

panel = panel.replace(
  /if \(filtroTipo === 'criticos'\) return erro\.tipo === 'Crítico' \|\| erro\.tipo === 'XSD Schema' \|\| erro\.tipo === 'Erro Órfão';/g,
  "if (filtroTipo === 'criticos') return getSeverity(erro) === 'crit';"
);

panel = panel.replace(
  /if \(filtroTipo === 'avisos'\) return erro\.tipo === 'Aviso' \|\| erro\.tipo === 'Inconsistência' \|\| erro\.tipo === 'Erro Regra';/g,
  "if (filtroTipo === 'avisos') return getSeverity(erro) === 'warn';"
);

panel = panel.replace(
  /const getCorBorda = \(tipo: InconsistencyType\) => \{[\s\S]*?return "border-\[#e9c46a\]";\n  \};/g,
  `const getCorBorda = (inc: Inconsistency) => {
    const s = getSeverity(inc);
    if (s === "crit") return "border-crit";
    if (s === "warn") return "border-warn";
    return "border-info";
  };`
);

panel = panel.replace(
  /const getCorTextoBadge = \(tipo: InconsistencyType\) => \{[\s\S]*?return "text-\[#e9c46a\]";\n  \};/g,
  `const getCorTextoBadge = (inc: Inconsistency) => {
    const s = getSeverity(inc);
    if (s === "crit") return "text-crit";
    if (s === "warn") return "text-warn";
    return "text-info";
  };`
);

// We need to change the invocations as well
panel = panel.replace(/getCorBorda\(inc\.tipo\)/g, 'getCorBorda(inc)');
panel = panel.replace(/getCorTextoBadge\(inc\.tipo\)/g, 'getCorTextoBadge(inc)');

fs.writeFileSync('src/components/AuditPanel.tsx', panel);
