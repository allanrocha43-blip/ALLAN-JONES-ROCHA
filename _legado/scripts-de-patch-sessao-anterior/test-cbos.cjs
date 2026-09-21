const fs = require('fs');
let code = fs.readFileSync('src/utils/tissAuditor.ts', 'utf-8');
const start = code.indexOf('// MÓDULO ESTRUTURAL 1.5');
const end = code.indexOf('// MÓDULO ESTRUTURAL 1.6');
console.log(code.substring(start, end));
