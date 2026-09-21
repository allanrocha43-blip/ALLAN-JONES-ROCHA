const str = `
<ans:procedimentoExecutado>
  <ans:procedimento>
    <ans:codigoProcedimento>40805018</ans:codigoProcedimento>
  </ans:procedimento>
</ans:procedimentoExecutado>
`;
const procExameMatch = str.match(/<(?:[^:]+:)?(procedimentoExame|procedimento)(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?\1\s*>/i);
console.log(procExameMatch[0]);
