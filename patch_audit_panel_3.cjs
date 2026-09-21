const fs = require('fs');
let content = fs.readFileSync('src/components/AuditPanel.tsx', 'utf8');
content = content.replace(/InconsistencyType/g, '');
content = content.replace(/, sevToken/g, '');
fs.writeFileSync('src/components/AuditPanel.tsx', content);
