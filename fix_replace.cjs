const fs = require('fs');
let code = fs.readFileSync('src/utils/tiss/correcoes.ts', 'utf8');

const targetContent = `  function replaceTagValue(bloco: string, tagName: string, newValue: string): string {
    let replaced = false;
    // Replace <tag>...</tag>
    const openCloseReg = new RegExp(\`(<(?:[^:>]+:)?\${tagName}(?:[^>]*)>)(.*?)(</(?:[^:>]+:)?\${tagName}>)\`, 'gi');
    if (openCloseReg.test(bloco)) {
      bloco = bloco.replace(openCloseReg, \`$1\${newValue}$3\`);
      replaced = true;
    } else {
      // Replace self-closing <tag/>
      const selfCloseReg = new RegExp(\`(<(?:[^:>]+:)?\${tagName}(?:[^>]*?))\\\\s*/>\`, 'gi');
      if (selfCloseReg.test(bloco)) {
        bloco = bloco.replace(selfCloseReg, (match, p1) => {
          const nameMatch = match.match(/<([^>/\\s]+)/);
          const fullTagName = nameMatch ? nameMatch[1] : tagName;
          return \`\${p1}>\${newValue}</\${fullTagName}>\`;
        });
        replaced = true;
      }
    }
    if (replaced) alterado = true;
    return bloco;
  }

  // 1. Sincronizar Código se alterado
  if (codigoMudou && novosDados.codigo !== undefined) {
    blocoAlvo = replaceTagValue(blocoAlvo, 'codigoProcedimento', novosDados.codigo);
  }

  // Sincronizar Quantidade
  if (quantidadeMudou && novosDados.quantidade !== undefined) {
    blocoAlvo = replaceTagValue(blocoAlvo, 'quantidadeExecutada', novosDados.quantidade.trim());
  }

  // Sincronizar Valor Unitario
  if (valorUnitarioMudou && novosDados.valorUnitario !== undefined) {
    blocoAlvo = replaceTagValue(blocoAlvo, 'valorUnitario', novosDados.valorUnitario.trim());
  }

  // Sincronizar ReducaoAcrescimo
  if (reducaoAcrescimoMudou && novosDados.reducaoAcrescimo !== undefined) {
    blocoAlvo = replaceTagValue(blocoAlvo, 'reducaoAcrescimo', novosDados.reducaoAcrescimo.trim());
  }

  // Sincronizar Data de Execução/Atendimento
  if (dataExecucaoMudou && novosDados.dataExecucao !== undefined) {
    const nData = novosDados.dataExecucao.trim();
    blocoAlvo = replaceTagValue(blocoAlvo, 'dataExecucao', nData);
    blocoAlvo = replaceTagValue(blocoAlvo, 'dataAtendimento', nData);
    blocoAlvo = replaceTagValue(blocoAlvo, 'data', nData);
  }

  // 2. Sincronizar Valor Total se alterado
  if (valorMudou && novosDados.valor !== undefined) {
    const nVal = novosDados.valor.trim();
    const oldAlterado = alterado;
    
    // Atualizar valorTotal, valorProcedimento, valorTotalGeral, valorConsulta
    blocoAlvo = replaceTagValue(blocoAlvo, 'valorTotal', nVal);
    blocoAlvo = replaceTagValue(blocoAlvo, 'valorProcedimento', nVal); // Usado em Odontologia
    blocoAlvo = replaceTagValue(blocoAlvo, 'valorTotalGeral', nVal);
    blocoAlvo = replaceTagValue(blocoAlvo, 'valorConsulta', nVal); // Usado em Consulta

    if (alterado === oldAlterado) {
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
    }
  }`;

const replacement = `  function replaceTagValue(bloco: string, tagName: string, newValue: string): { novoBloco: string, replaced: boolean } {
    let replaced = false;
    // Replace <tag>...</tag>
    const openCloseReg = new RegExp(\`(<(?:[^:>]+:)?\${tagName}(?:[^>]*)>)(.*?)(</(?:[^:>]+:)?\${tagName}>)\`, 'gi');
    if (openCloseReg.test(bloco)) {
      bloco = bloco.replace(openCloseReg, \`$1\${newValue}$3\`);
      replaced = true;
    } else {
      // Replace self-closing <tag/>
      const selfCloseReg = new RegExp(\`(<(?:[^:>]+:)?\${tagName}(?:[^>]*?))\\\\s*/>\`, 'gi');
      if (selfCloseReg.test(bloco)) {
        bloco = bloco.replace(selfCloseReg, (match, p1) => {
          const nameMatch = match.match(/<([^>/\\s]+)/);
          const fullTagName = nameMatch ? nameMatch[1] : tagName;
          return \`\${p1}>\${newValue}</\${fullTagName}>\`;
        });
        replaced = true;
      }
    }
    return { novoBloco: bloco, replaced };
  }

  // Helper to apply replace
  function applyReplace(tagName: string, newValue: string): boolean {
    const { novoBloco, replaced } = replaceTagValue(blocoAlvo, tagName, newValue);
    if (replaced) {
      blocoAlvo = novoBloco;
      alterado = true;
    }
    return replaced;
  }

  // 1. Sincronizar Código se alterado
  if (codigoMudou && novosDados.codigo !== undefined) {
    applyReplace('codigoProcedimento', novosDados.codigo);
  }

  // Sincronizar Quantidade
  if (quantidadeMudou && novosDados.quantidade !== undefined) {
    applyReplace('quantidadeExecutada', novosDados.quantidade.trim());
  }

  // Sincronizar Valor Unitario
  if (valorUnitarioMudou && novosDados.valorUnitario !== undefined) {
    applyReplace('valorUnitario', novosDados.valorUnitario.trim());
  }

  // Sincronizar ReducaoAcrescimo
  if (reducaoAcrescimoMudou && novosDados.reducaoAcrescimo !== undefined) {
    applyReplace('reducaoAcrescimo', novosDados.reducaoAcrescimo.trim());
  }

  // Sincronizar Data de Execução/Atendimento
  if (dataExecucaoMudou && novosDados.dataExecucao !== undefined) {
    const nData = novosDados.dataExecucao.trim();
    applyReplace('dataExecucao', nData);
    applyReplace('dataAtendimento', nData);
    applyReplace('data', nData);
  }

  // 2. Sincronizar Valor Total se alterado
  if (valorMudou && novosDados.valor !== undefined) {
    const nVal = novosDados.valor.trim();
    
    // Atualizar valorTotal, valorProcedimento, valorTotalGeral, valorConsulta
    const rep1 = applyReplace('valorTotal', nVal);
    const rep2 = applyReplace('valorProcedimento', nVal); // Usado em Odontologia
    const rep3 = applyReplace('valorTotalGeral', nVal);
    const rep4 = applyReplace('valorConsulta', nVal); // Usado em Consulta

    const anyReplaced = rep1 || rep2 || rep3 || rep4;

    if (!anyReplaced) {
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
    }
  }`;

if (code.includes(targetContent)) {
  code = code.replace(targetContent, replacement);
  fs.writeFileSync('src/utils/tiss/correcoes.ts', code);
  console.log("Successfully replaced.");
} else {
  console.log("Could not find target content.");
}
