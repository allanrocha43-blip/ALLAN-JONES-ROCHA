const fs = require('fs');
const filePath = 'src/utils/tiss/auditoria.ts';
let code = fs.readFileSync(filePath, 'utf8');

const anchor = `      // 1. Falta de viaAcesso (Apenas para Cirurgias / Procedimentos Invasivos)`;
const insertion = `
      // Validação de codigoTabela (se presente e for CBHPM/TUSS, deve ser 22)
      const tabelaMatch = bloco.match(/<([^:]+:)?codigoTabela(?:[^>]*)>\\s*(\\d+)\\s*<\\/([^:]+:)?codigoTabela>/i);
      if (tabelaMatch) {
        const tabelaCode = tabelaMatch[2];
        if (tabelaCode !== '22') {
          const tissItem = getDescricaoProcedimentoTISS(cod);
          if (tissItem) {
             const originalLineMatch = bloco.match(new RegExp(\`<([^:]+:)?codigoTabela(?:[^>]*)>\\\\s*\${tabelaCode}\\\\s*<\\\\/([^:]+:)?codigoTabela>\`, 'i'));
             if (originalLineMatch) {
                const lineTarget = localizador.linhaDe(matchStart + bloco.indexOf(originalLineMatch[0]));
                const nsTabela = originalLineMatch[1] || "";
                const tagFull = originalLineMatch[0];
                inconsistencias.push({
                  id: \`tabela-invalida-\${lineTarget}-\${matchStart}\`,
                  linha: lineTarget,
                  tipo: "Erro Regra",
                  desc: \`\${prefix}Linha \${lineTarget}: Código da Tabela informado (\${tabelaCode}) não corresponde ao padrão do procedimento (\${cod}). Use 22 para Tabela TUSS.\`,
                  original: tagFull,
                  sugestao: \`<\${nsTabela}codigoTabela>22</\${nsTabela}codigoTabela>\`,
                  seguro: true
                });
             }
          }
        }
      }
`;

if (code.includes(anchor) && !code.includes('tabela-invalida-')) {
  code = code.replace(anchor, insertion + anchor);
  fs.writeFileSync(filePath, code);
  console.log("Patched auditoria.ts successfully.");
} else {
  console.log("Anchor not found or already patched.");
}
