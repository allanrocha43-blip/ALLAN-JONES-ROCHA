const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Revert the bad Editor button replacement
app = app.replace(
  '<button onClick={() => onApplyCorrection(inc)} className="rounded bg-primary px-2 py-1 text-primary-foreground font-medium hover:opacity-90 transition-opacity">\n              Salvar (Ctrl+S)\n            </button>',
  `{isEditing ? (
              <button onClick={handleSaveEdit} className="rounded bg-primary px-2 py-1 text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                Salvar (Ctrl+S)
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="rounded bg-primary px-2 py-1 text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                Editar XML
              </button>
            )}`
);

// 2. Add the onClick to the correct button in PainelAuditoria
app = app.replace(
  '{inc.seguro && (\n                  <button className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm">',
  '{inc.seguro && (\n                  <button onClick={() => onApplyCorrection(inc)} className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm">'
);

fs.writeFileSync('src/App.tsx', app);
console.log('Fixed the mess');
