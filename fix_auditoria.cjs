const fs = require('fs');
let code = fs.readFileSync('src/utils/tiss/auditoria.ts', 'utf8');

code = code.replace(/split\(''\)/g, "split('\\n')");
code = code.replace(/\.replace\(\/\/g/g, ".replace(/\\n/g");

// Wait, the build error was:
// 968|          sugestao: "",
// It said "Expected ')' but found ':'" because `.replace(//g, '')` is a comment!
// `//g, ''),` makes the rest of the line a comment!
code = code.replace(/\/\/g, ''\),/g, "/\\n/g, ''),");

fs.writeFileSync('src/utils/tiss/auditoria.ts', code);
