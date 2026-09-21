const fs = require('fs');

// Patch App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/const icones = \{ crit: CircleAlert, warn: AlertTriangle, info: Info \};/g, 'const icones = { crit: CircleAlert, warn: AlertTriangle, info: Info, ok: Check };');
app = app.replace(/function Chip\(\{ children, tone \}: \{ children: React\.ReactNode; tone\?: "ok" | "info" \}\) \{[\s\S]*?\}\n/g, ''); // Try replacing Chip again
fs.writeFileSync('src/App.tsx', app);

// Patch AuditPanel.tsx
let panel = fs.readFileSync('src/components/AuditPanel.tsx', 'utf8');
panel = panel.replace(/import \{ Inconsistency, AuditResult \} from '\.\.\/types\/tiss';/, "import { Inconsistency, AuditResult } from '../types/tiss';\nimport { getSeverity, sevToken } from '../utils/severidade';");

panel = panel.replace(/const numCrit = inconsistencias\.filter\(i => i\.tipo === "Crítico"\)\.length;/g, 'const numCrit = inconsistencias.filter(i => getSeverity(i) === "crit").length;');
panel = panel.replace(/const numWarn = inconsistencias\.filter\(i => i\.tipo !== "Crítico" && i\.tipo !== "Inconsistência"\)\.length;/g, 'const numWarn = inconsistencias.filter(i => getSeverity(i) === "warn").length;');

panel = panel.replace(/const getSeverityClass = \(tipo: string\) => \{[\s\S]*?return 'bg-blue-500\/10 text-blue-400 border-blue-500\/20';\n  \};/g, `const getSeverityClass = (inc: Inconsistency) => {
    const s = getSeverity(inc);
    return \`\${sevToken[s].bg} \${sevToken[s].text} \${sevToken[s].border}\`;
  };`);
panel = panel.replace(/className={\`text-xs font-medium px-2 py-1 rounded-md border \${getSeverityClass\(inc\.tipo\)}\`}/g, 'className={`text-xs font-medium px-2 py-1 rounded-md border ${getSeverityClass(inc)}`}');
  
panel = panel.replace(/inc\.tipo === 'Crítico'/g, 'getSeverity(inc) === "crit"');

fs.writeFileSync('src/components/AuditPanel.tsx', panel);

