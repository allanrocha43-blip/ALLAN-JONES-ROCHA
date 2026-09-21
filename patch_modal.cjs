const fs = require('fs');
let content = fs.readFileSync('src/components/SaveAsModal.tsx', 'utf8');
content = content.replace('hashMD5: resHash.hashCalculado', 'hashMD5: resHash.hashCalculado ?? undefined');
fs.writeFileSync('src/components/SaveAsModal.tsx', content);
