const fs = require('fs');

let content = fs.readFileSync('src/components/GuidesTable.tsx', 'utf8');

// Replace Sincronizar text with Corrigir
content = content.replace(/title="Sincronizar alterações/g, 'title="Corrigir no XML"');
content = content.replace(/>Sincronizar</g, '>Corrigir<');

fs.writeFileSync('src/components/GuidesTable.tsx', content);
console.log('Sincronizar replaced with Corrigir');
