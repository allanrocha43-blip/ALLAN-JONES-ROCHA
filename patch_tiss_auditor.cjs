const fs = require('fs');

let content = fs.readFileSync('src/utils/tissAuditor.ts', 'utf8');

// 1. Fix stringParaBytesISO88591
content = content.replace(
  /function stringParaBytesISO88591[\s\S]*?return bytes;\n\}/,
  `function stringParaBytesISO88591(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const codeUnit = str.charCodeAt(i);
    if (codeUnit > 0xFF) {
      bytes[i] = 63;
    } else {
      bytes[i] = codeUnit;
    }
  }
  return bytes;
}`
);

// 2. Add imports for version
content = content.replace(
  `import { isDescricaoValida, getDescricaoProcedimentoTISS } from './tabelaTiss';`,
  `import { isDescricaoValida, getDescricaoProcedimentoTISS } from './tabelaTiss';\nimport { extrairVersaoTiss, regraAplicavel } from './tissVersion';`
);

// 3. Rename executing function to make it wrapable
content = content.replace(
  `export function executarAuditoriaDinamica(`,
  `function _executarAuditoriaDinamica(`
);

// Add the wrapper at the same place
content = content.replace(
  `function _executarAuditoriaDinamica(
  conteudoOriginal: string
): AuditResult {`,
  `export function executarAuditoriaDinamica(conteudoOriginal: string): AuditResult {
  try {
    return _executarAuditoriaDinamica(conteudoOriginal);
  } catch (err) {
    console.error("Erro fatal na auditoria:", err);
    return {
      versaoTiss: "Desconhecida",
      cnpjBase: "-",
      totalLote: 0,
      valorConsulta: 0,
      valorSadt: 0,
      inconsistencias: [{
        id: "fatal-error",
        linha: 1,
        tipo: "Erro Estrutural",
        desc: "Erro fatal ao processar XML: " + (err instanceof Error ? err.message : String(err)),
        original: "",
        sugestao: "",
        seguro: false
      }],
      guias: []
    };
  }
}

function _executarAuditoriaDinamica(
  conteudoOriginal: string
): AuditResult {`
);

// 4. Update versaoTiss extraction
content = content.replace(
  `// Version extraction
  const padraoMatch = conteudo.match(/<(?:[^:]+:)?(?:Padrao|versaoPadrao)>([^<]+)<\\//i);
  const versaoTiss = padraoMatch ? padraoMatch[1].trim() : "Desconhecida";`,
  `// Version extraction
  const versaoTiss = extrairVersaoTiss(conteudo);`
);

// 5. Update indicacaoAcidente with regraAplicavel (TISS 4.01.00+)
content = content.replace(
  `// 2. <indicacaoAcidente> (Obrigatório no Padrão TISS 4.01.00 para guiaConsulta)
      if (!/<(?:[^:]+:)?indicacaoAcidente(?:\\s[^>]*?)?>\\s*[^<\\s]+\\s*<\\/(?:[^:]+:)?indicacaoAcidente\\s*>/i.test(bloco)) {`,
  `// 2. <indicacaoAcidente> (Obrigatório no Padrão TISS 4.01.00 para guiaConsulta)
      if (regraAplicavel(versaoTiss, "4.01.00") && !/<(?:[^:]+:)?indicacaoAcidente(?:\\s[^>]*?)?>\\s*[^<\\s]+\\s*<\\/(?:[^:]+:)?indicacaoAcidente\\s*>/i.test(bloco)) {`
);

fs.writeFileSync('src/utils/tissAuditor.ts', content);
