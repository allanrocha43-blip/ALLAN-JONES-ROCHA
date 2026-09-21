const fs = require('fs');
const filePath = 'src/utils/tiss/auditoria.ts';
let code = fs.readFileSync(filePath, 'utf8');

// First remove the old bad patch
const badPatchRegex = /\/\/ NOVO: Remoção do <valorProcedimento> incorreto de dentro do <procedimento>[\s\S]*?(?=\/\/ 4\. <codigoTabela> dentro de <procedimento>)/;
code = code.replace(badPatchRegex, '');

// Now insert inside the PROCEDIMENTO EXECUTADO loop
const anchor2 = `    // Detectar código do procedimento\n    const codProcMatch = bloco.match(/<(?:[^:]+:)?codigoProcedimento(?:[^>]*)>\\s*(\\d+)\\s*<\\//i);`;
const insertion2 = `
    // Remover <valorProcedimento> que estiver dentro de <procedimento> (XSD Incompleta)
    const procTagMatch = bloco.match(/(<([^:]+:)?procedimento(?:[^>]*)>[\\s\\S]*?<\\/([^:]+:)?procedimento>)/i);
    if (procTagMatch) {
       const procInner = procTagMatch[1];
       const regexValorProc = /(<([^:]+:)?valorProcedimento(?:[^>]*)>\\s*[0-9.,]+\\s*<\\/([^:]+:)?valorProcedimento>)/gi;
       let vMatch;
       while ((vMatch = regexValorProc.exec(procInner)) !== null) {
          const fullInvalidTag = vMatch[1];
          const localMatchStart = matchStart + bloco.indexOf(procInner) + vMatch.index;
          const lineTarget = localizador.linhaDe(localMatchStart);
          const linesAround = conteudo.split('\\n');
          const originalLine = linesAround[lineTarget - 1];
          
          inconsistencias.push({
            id: \`estrutura-valorProcedimento-\${lineTarget}-\${localMatchStart}\`,
            linha: lineTarget,
            tipo: "Erro Estrutural",
            desc: \`Linha \${lineTarget}: A tag <valorProcedimento> não pertence ao bloco <procedimento>. O validador da operadora a rejeitará.\`,
            original: originalLine && originalLine.includes(fullInvalidTag) ? originalLine : fullInvalidTag,
            sugestao: "",
            seguro: true
          });
       }
    }
`;

if (code.includes(anchor2)) {
  code = code.replace(anchor2, insertion2 + '\\n' + anchor2);
  fs.writeFileSync(filePath, code);
  console.log("Patched auditoria.ts successfully.");
} else {
  console.log("Anchor 2 not found.");
}
