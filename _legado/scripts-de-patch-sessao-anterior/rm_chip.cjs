const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  /function Chip\(\{[^}]+\}\) \{[\s\S]+?\}\s+function Editor/,
  'function Editor'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Chip removed');
