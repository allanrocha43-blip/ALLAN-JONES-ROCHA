const fs = require('fs');
let content = fs.readFileSync('src/components/AuditPanel.tsx', 'utf8');
content = content.replace(
  "import { Inconsistency, InconsistencyType } from '../types/tiss';",
  "import { Inconsistency, InconsistencyType } from '../types/tiss';\nimport { getSeverity, sevToken } from '../utils/severidade';"
);
// Fix the invocation of getCorBorda and getCorTextoBadge: they were probably called as `getCorBorda(inc.tipo)`. Let's ensure it's `getCorBorda(inc)`.
content = content.replace(/getCorBorda\(inc\.tipo\)/g, 'getCorBorda(inc)');
content = content.replace(/getCorTextoBadge\(inc\.tipo\)/g, 'getCorTextoBadge(inc)');
fs.writeFileSync('src/components/AuditPanel.tsx', content);
