const fs = require('fs');
let code = fs.readFileSync('src/utils/tiss/correcoes.ts', 'utf8');

const targetContent = `    if (!anyReplaced) {
      // Nenhum foi substituído. Injetar tag de valor apenas se não for guia de consulta (que usa tag externa ao bloco de procedimento)
      const closeProcMatch = blocoAlvo.match(/(<\\/(?:[^:>]+:)?(?:procedimentoExame|procedimentoExecutado)>)/i);
      if (closeProcMatch) {
        const tagFechamento = closeProcMatch[1];
        // Descobrir o prefixo de namespace (ex: "ans:")
        const nsMatch = tagFechamento.match(/<\\/(.*?):/);
        const prefix = nsMatch ? \`\${nsMatch[1]}:\` : 'ans:';
        blocoAlvo = blocoAlvo.replace(tagFechamento, \`<\${prefix}valorTotal>\${nVal}</\${prefix}valorTotal>\\n\${tagFechamento}\`);
        alterado = true;
      }
    }`;

const replacement = `    if (!anyReplaced) {
      // Nenhum foi substituído. Injetar tag de valor apenas se não for guia de consulta (que usa tag externa ao bloco de procedimento)
      const closeProcMatch = blocoAlvo.match(/(<\\/(?:[^:>]+:)?(?:procedimentoExame|procedimentoExecutado)>)/i);
      if (closeProcMatch) {
        const tagFechamento = closeProcMatch[1];
        // Descobrir o prefixo de namespace (ex: "ans:")
        const nsMatch = tagFechamento.match(/<\\/(.*?):/);
        const prefix = nsMatch ? \`\${nsMatch[1]}:\` : 'ans:';
        
        // Em TISS 04.01.00, <valorTotal> deve vir ANTES de <equipeSadt>.
        const equipeSadtMatch = blocoAlvo.match(/(<(?:[^:>]+:)?equipeSadt[^>]*>)/i);
        if (equipeSadtMatch) {
           blocoAlvo = blocoAlvo.replace(equipeSadtMatch[1], \`<\${prefix}valorTotal>\${nVal}</\${prefix}valorTotal>\\n\${equipeSadtMatch[1]}\`);
        } else {
           blocoAlvo = blocoAlvo.replace(tagFechamento, \`<\${prefix}valorTotal>\${nVal}</\${prefix}valorTotal>\\n\${tagFechamento}\`);
        }
        alterado = true;
      }
    }`;

if (code.includes(targetContent)) {
  code = code.replace(targetContent, replacement);
  fs.writeFileSync('src/utils/tiss/correcoes.ts', code);
  console.log("Successfully replaced inject logic.");
} else {
  console.log("Could not find target content.");
}
