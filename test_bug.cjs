const bloco = `<ans:procedimentoExecutado>
  <ans:codigoProcedimento>41501144</ans:codigoProcedimento>
  <ans:valorUnitario>150.50</ans:valorUnitario>
  <ans:valorTotal>150.50</ans:valorTotal>
  <ans:equipeSadt>...</ans:equipeSadt>
</ans:procedimentoExecutado>`;

let alterado = true; // Simulating that another tag was changed
function replaceTagValue(bloco, tagName, newValue) {
  let replaced = false;
  const openCloseReg = new RegExp(`(<(?:[^:>]+:)?${tagName}(?:[^>]*)>)(.*?)(</(?:[^:>]+:)?${tagName}>)`, 'gi');
  if (openCloseReg.test(bloco)) {
    bloco = bloco.replace(openCloseReg, `$1${newValue}$3`);
    replaced = true;
  }
  if (replaced) alterado = true;
  return bloco;
}

let blocoAlvo = bloco;
const oldAlterado = alterado;
blocoAlvo = replaceTagValue(blocoAlvo, 'valorTotal', '200.00');

if (alterado === oldAlterado) {
    const closeProcMatch = blocoAlvo.match(/(<\/(?:[^:>]+:)?(?:procedimentoExame|procedimentoExecutado)>)/i);
    if (closeProcMatch) {
      const tagFechamento = closeProcMatch[1];
      const nsMatch = tagFechamento.match(/<\/(.*?):/);
      const prefix = nsMatch ? `${nsMatch[1]}:` : 'ans:';
      blocoAlvo = blocoAlvo.replace(tagFechamento, `<${prefix}valorTotal>200.00</${prefix}valorTotal>\n${tagFechamento}`);
    }
}
console.log(blocoAlvo);
