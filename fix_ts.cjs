const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix Array.from(files)
content = content.replace(
  '    Array.from(files).forEach((file) => {',
  '    Array.from(files as Iterable<File>).forEach((file: File) => {'
);

// Fix handleExport Blob creation
content = content.replace(
  '    const blob = exportarXmlValidadoComHash(arquivoAtivo.conteudo);\n    const url = URL.createObjectURL(blob);',
  '    const exportResult = exportarXmlValidadoComHash(arquivoAtivo.conteudo);\n    if (!exportResult.sucesso) { alert(exportResult.erroMsg || "Erro ao exportar"); return; }\n    const blob = new Blob([exportResult.novoConteudo], { type: "text/xml" });\n    const url = URL.createObjectURL(blob);'
);

// Fix novoHash warning and Chip usage
content = content.replace(
  '        onAtualizarXml={(novoXml, novoHash) => {',
  '        onAtualizarXml={(novoXml, _novoHash) => {'
);

// We need to render Chip again if it was removed. Wait, it was removed because I replaced the entire top header.
// I will keep it in the file and just not use it if I don't need it, or I'll just remove the Chip definition.
content = content.replace(
  /function Chip\(\{[^}]+\}\) \{[\s\S]+?\}\s+/,
  ''
);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed TS issues');
