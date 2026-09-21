const fs = require('fs');
let content = fs.readFileSync('src/components/AuditPanel.tsx', 'utf8');
content = content.replace(/getCorBorda\(erro\.tipo\)/g, 'getCorBorda(erro)');
content = content.replace(/getCorTextoBadge\(erro\.tipo\)/g, 'getCorTextoBadge(erro)');
fs.writeFileSync('src/components/AuditPanel.tsx', content);
