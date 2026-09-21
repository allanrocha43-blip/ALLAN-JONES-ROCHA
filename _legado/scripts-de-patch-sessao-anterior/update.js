const fs = require('fs');

let content = fs.readFileSync('src/utils/tissAuditor.ts', 'utf8');

// Modifica exportarXmlValidadoComHash
content = content.replace(
  'const blocoHash = matchLote[1];',
  "let blocoHash = matchLote[1];\n\n  // Remove caracteres de formatação (espaço, tabulação, enter) entre as tags (Exigência ANS TISS)\n  blocoHash = blocoHash.replace(/>\\s+</g, '><');"
);

fs.writeFileSync('src/utils/tissAuditor.ts', content);
