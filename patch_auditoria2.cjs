const fs = require('fs');
const filePath = 'src/utils/tiss/auditoria.ts';
let code = fs.readFileSync(filePath, 'utf8');

const anchor = `      // 4. <codigoTabela> dentro de <procedimento> em <dadosAtendimento>`;
const insertion = `
      // NOVO: Remoção do <valorProcedimento> incorreto de dentro do <procedimento>
      const invalidValorProcMatch = bloco.match(/<([^:]+:)?procedimento(?:[^>]*)>[\\s\\S]*?(<([^:]+:)?valorProcedimento(?:[^>]*)>\\s*[0-9.,]+\\s*<\\/([^:]+:)?valorProcedimento>)[\\s\\S]*?<\\/([^:]+:)?procedimento>/i);
      if (invalidValorProcMatch) {
        const fullInvalidTag = invalidValorProcMatch[2];
        const localMatchStart = matchStart + bloco.indexOf(fullInvalidTag);
        const lineTarget = localizador.linhaDe(localMatchStart);
        // Find the line including whitespaces
        const linesAround = conteudo.split('\\n');
        const originalLine = linesAround[lineTarget - 1];
        
        inconsistencias.push({
          id: \`estrutura-valorProcedimento-\${guideCounter}-\${lineTarget}\`,
          linha: lineTarget,
          tipo: "Erro Estrutural",
          desc: \`\${prefix}Linha \${lineTarget}: A tag <valorProcedimento> não pertence ao bloco <procedimento>. O validador da operadora a rejeitará.\`,
          original: originalLine.includes(fullInvalidTag) ? originalLine : fullInvalidTag,
          sugestao: "",
          seguro: true
        });
      }

`;

if (code.includes(anchor) && !code.includes('estrutura-valorProcedimento-')) {
  code = code.replace(anchor, insertion + anchor);
  fs.writeFileSync(filePath, code);
  console.log("Patched auditoria.ts successfully.");
} else {
  console.log("Anchor not found or already patched.");
}
