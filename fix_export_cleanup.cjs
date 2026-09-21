const fs = require('fs');
let code = fs.readFileSync('src/utils/tiss/hash.ts', 'utf8');

const targetContent = `  const conteudoSanitizado = conteudo.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/g, '');

  const audit = executarAuditoriaDinamica(conteudoSanitizado);`;

const replacement = `  let conteudoSanitizado = conteudo.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/g, '');

  // Limpeza Estrutural: Remover tags <valorTotal> inseridas erroneamente após <equipeSadt>
  conteudoSanitizado = conteudoSanitizado.replace(/(<(?:[^:>]+:)?equipeSadt(?:[^>]*)>(?:[\\s\\S]*?)<\\/(?:[^:>]+:)?equipeSadt>)\\s*(<(?:[^:>]+:)?valorTotal(?:[^>]*)>.*?<\\/(?:[^:>]+:)?valorTotal>\\s*)+/gi, "$1");
  // Limpeza Estrutural: Remover tags <valorTotal> duplicadas no final do bloco <procedimentoExecutado> (caso não haja equipeSadt)
  conteudoSanitizado = conteudoSanitizado.replace(/(<(?:[^:>]+:)?valorTotal(?:[^>]*)>.*?<\\/(?:[^:>]+:)?valorTotal>\\s*)+<\\/(?:[^:>]+:)?procedimentoExecutado>/gi, (match) => {
    // Mantém apenas um valorTotal no final se houver múltiplos antes do fechamento
    const tagVal = match.match(/(<(?:[^:>]+:)?valorTotal(?:[^>]*)>.*?<\\/(?:[^:>]+:)?valorTotal>)/i);
    const tagClose = match.match(/(<\\/(?:[^:>]+:)?procedimentoExecutado>)/i);
    return tagVal && tagClose ? \`\${tagVal[1]}\\n\${tagClose[1]}\` : match;
  });

  const audit = executarAuditoriaDinamica(conteudoSanitizado);`;

if (code.includes(targetContent)) {
  code = code.replace(targetContent, replacement);
  fs.writeFileSync('src/utils/tiss/hash.ts', code);
  console.log("Successfully replaced export cleanup logic.");
} else {
  console.log("Could not find target content in hash.ts.");
}
