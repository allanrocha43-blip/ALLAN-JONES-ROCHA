const fs = require('fs');

let content = fs.readFileSync('src/components/GuidesTable.tsx', 'utf8');

// Update styling colors
content = content.replace(/bg-\[#1a1d1e\]/g, 'bg-surface');
content = content.replace(/bg-\[#0e1111\]/g, 'bg-background');
content = content.replace(/border-\[#2d3235\]/g, 'border-border');
content = content.replace(/text-gray-400/g, 'text-muted-foreground');
content = content.replace(/text-gray-500/g, 'text-muted-foreground');
content = content.replace(/text-gray-300/g, 'text-foreground/90');
content = content.replace(/text-gray-200/g, 'text-foreground');
content = content.replace(/text-\[#00b4d8\]/g, 'text-primary');
content = content.replace(/text-\[#e63946\]/g, 'text-destructive');
content = content.replace(/text-\[#e9c46a\]/g, 'text-warn');
content = content.replace(/bg-\[#1e2224\]/g, 'bg-surface-2');
content = content.replace(/hover:bg-\[#1a1d1e\]/g, 'hover:bg-surface/50');
content = content.replace(/bg-\[#00b4d8\]\/10/g, 'bg-primary/10');
content = content.replace(/hover:bg-\[#00b4d8\]\/20/g, 'hover:bg-primary/20');

// Replace the old copy buttons with new unified bridge buttons
// The old inputs for Senha and Guia have complicated relative/absolute layouts. Let's simplify them.

content = content.replace(
  /const xmlStateRef = React.useRef/g,
  `const handleBridgeSync = (guideId: string, source: 'senha' | 'guia' | 'guiaPrestador', value: string) => {
    setFormState(prev => ({
      ...prev,
      [guideId]: {
        ...(prev[guideId] || { carteira: '', guia: '', senha: '', guiaPrestador: '' }),
        guia: value,
        senha: value,
        guiaPrestador: value,
      }
    }));
  };

  const xmlStateRef = React.useRef`
);

fs.writeFileSync('src/components/GuidesTable.tsx', content);
console.log('Styling and bridge handler added');
