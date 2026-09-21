const fs = require('fs');

// Patch App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/function Chip\(\{.*?\}\) \{[\s\S]*?\}\n/, ''); // Chip wasn't used in App.tsx (it was in routes index?)
fs.writeFileSync('src/App.tsx', app);

// Patch GuidesTable.tsx
let gt = fs.readFileSync('src/components/GuidesTable.tsx', 'utf8');
gt = gt.replace(/Layers,\s*/, '');
gt = gt.replace(/ArrowRightToLine,\s*/, '');
gt = gt.replace(/,\s*ArrowLeftToLine\s*/, '');
fs.writeFileSync('src/components/GuidesTable.tsx', gt);

