const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  'function PainelAuditoria({ \n  avancado, \n  inconsistencias,\n  onApplySafe,\n  onViewInXml\n}: {',
  'function PainelAuditoria({ \n  avancado, \n  inconsistencias,\n  onApplySafe,\n  onApplyCorrection,\n  onViewInXml\n}: {'
);

fs.writeFileSync('src/App.tsx', app);
console.log('Fixed PainelAuditoria props');
