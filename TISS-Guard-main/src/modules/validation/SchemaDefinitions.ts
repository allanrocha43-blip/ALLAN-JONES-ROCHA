// Simplified Logical Schema for TISS 3.05+
// We check for presence of these keys at specific nesting levels.

export const REQUIRED_STRUCTURE = {
  // Root level must contain one of these message types
  root: ["ans:mensagemTISS", "mensagemTISS"],
  // Within mensagemTISS:
  header: ["cabecalho", "ans:cabecalho"],
  // Within cabecalho:
  headerFields: ["identificacaoTransacao", "origem", "destino"],
  // The simplified body often acts as a wrapper for loteGuias
  body: [
    "prestadorParaOperadora",
    "ans:prestadorParaOperadora",
    "operadoraParaPrestador",
    "ans:operadoraParaPrestador",
  ],
};

// We can extend this with specific guide types later
