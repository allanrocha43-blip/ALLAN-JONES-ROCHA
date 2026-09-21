const fs = require('fs');
let content = fs.readFileSync('src/components/GuidesTable.tsx', 'utf8');

// Fix the title attribute strings
content = content.replace(/title="Corrigir no XML" diretamente no bloco isolado deste XML"/g, 'title="Corrigir no XML"');
content = content.replace(/title="Corrigir no XML" do procedimento no XML"/g, 'title="Corrigir procedimento no XML"');

// Wait, I should also fix text-primarylack -> text-primary-foreground
content = content.replace(/text-primarylack/g, 'text-primary-foreground');

fs.writeFileSync('src/components/GuidesTable.tsx', content);
