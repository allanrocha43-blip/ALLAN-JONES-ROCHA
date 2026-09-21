const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add imports
if (!app.includes('@codemirror/search')) {
  app = `import { search, SearchQuery, setSearchQuery } from '@codemirror/search';\n` + app;
}

// 2. Add useEffect for highlighting
const searchEffect = `
  useEffect(() => {
    if (viewRef.current && viewRef.current.view) {
      const view = viewRef.current.view;
      view.dispatch({
        effects: setSearchQuery.of(new SearchQuery({ search: findText }))
      });
    }
  }, [findText]);
`;

app = app.replace(
  'const handleReplaceAll = () => {',
  searchEffect + '\n  const handleReplaceAll = () => {'
);

// 3. Add search() extension
app = app.replace(
  'extensions={[xml()]}',
  'extensions={[xml(), search({ top: true })]}'
);

fs.writeFileSync('src/App.tsx', app);
console.log("Fixed search logic in App.tsx");
