const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Primary buttons (bg-primary, bg-info, bg-ok, file upload label)
// Currently they use: transition-opacity hover:opacity-90
content = content.replace(
  /transition-opacity hover:opacity-90/g,
  'transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm'
);

// Secondary buttons (ghosts, borders)
// Currently they use: transition-colors hover:text-foreground OR hover:bg-info-surface OR hover:bg-primary/10
content = content.replace(
  /transition-colors hover:text-foreground/g,
  'transition-all duration-200 hover:text-foreground active:scale-[0.97]'
);

content = content.replace(
  /transition-colors hover:bg-info-surface/g,
  'transition-all duration-200 hover:bg-info-surface active:scale-[0.97]'
);

content = content.replace(
  /transition-colors hover:bg-primary\/10/g,
  'transition-all duration-200 hover:bg-primary/10 active:scale-[0.97]'
);

// Specifically handle the side nav buttons (XML files list)
// w-full rounded-lg border p-3 text-left transition-colors ...
// Let's just target the side nav transition-colors that are not replaced
content = content.replace(
  /w-full rounded-lg border p-3 text-left transition-colors/g,
  'w-full rounded-lg border p-3 text-left transition-all duration-200 active:scale-[0.98]'
);

// The top right header buttons:
// className="flex items-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
content = content.replace(
  /className="flex items-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1 text-\[11px\] text-muted-foreground hover:text-foreground"/g,
  'className="flex items-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-surface active:scale-[0.97]"'
);

content = content.replace(
  /className="flex items-center gap-1.5 rounded border border-info\/40 bg-info-surface\/20 px-2 py-1 text-\[11px\] text-info hover:bg-info-surface"/g,
  'className="flex items-center gap-1.5 rounded border border-info/40 bg-info-surface/20 px-2 py-1 text-[11px] text-info transition-all duration-200 hover:bg-info-surface hover:shadow-sm active:scale-[0.97]"'
);

// Apply corrections button disabled state animation fix
content = content.replace(
  /transition-colors hover:opacity-80 disabled:opacity-50/g,
  'transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:opacity-80 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none active:scale-[0.98]'
);
content = content.replace(
  /hover:opacity-80 disabled:opacity-50/g,
  'transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:opacity-90 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none active:scale-[0.98] disabled:active:scale-100'
);


fs.writeFileSync('src/App.tsx', content);
console.log('Animations applied');
