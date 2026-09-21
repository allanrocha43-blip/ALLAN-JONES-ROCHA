const fs = require('fs');

let content = fs.readFileSync('src/components/GuidesTable.tsx', 'utf8');

content = content.replace(/bg-\[#2d3235\]/g, 'bg-surface-2');
content = content.replace(/hover:bg-\[#3d4245\]/g, 'hover:bg-surface-3');
content = content.replace(/bg-\[#121415\]/g, 'bg-surface');
content = content.replace(/bg-\[#161819\]/g, 'bg-surface/50');
content = content.replace(/hover:bg-\[#1f2325\]/g, 'hover:bg-surface-2');
content = content.replace(/bg-\[#00b4d8\]/g, 'bg-primary');
content = content.replace(/hover:bg-\[#0096c7\]/g, 'hover:bg-primary/90');
content = content.replace(/hover:text-[#00b4d8]/g, 'hover:text-primary');
content = content.replace(/focus:border-[#00b4d8]/g, 'focus:border-primary');
content = content.replace(/text-[#00b4d8]/g, 'text-primary');
content = content.replace(/hover:text-[#0096c7]/g, 'hover:text-primary/90');
content = content.replace(/hover:border-[#444]/g, 'hover:border-primary/50');

fs.writeFileSync('src/components/GuidesTable.tsx', content);
console.log('Fixed styling colors');
