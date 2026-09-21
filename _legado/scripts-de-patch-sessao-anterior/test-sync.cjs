const fs = require('fs');
let code = fs.readFileSync('src/utils/tissAuditor.ts', 'utf-8');
const syncStart = code.indexOf('export function sincronizarProcedimento');
const syncEnd = code.indexOf('export function sincronizarDadosGuia');
console.log(code.substring(syncStart, syncEnd));
