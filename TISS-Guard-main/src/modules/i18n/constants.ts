export const ERROR_CODES = {
  DATA_FUTURA: "DATA_FUTURA_DETECTADA",
  VALOR_NEGATIVO: "VALOR_NEGATIVO",
  INDICACAO_CLINICA_AUSENTE: "INDICACAO_CLINICA_AUSENTE",
  POSSIVEL_GLOSA_AUTORIZACAO: "POSSIVEL_GLOSA_AUTORIZACAO",
  NM_GUIA_VAZIO: "NM_GUIA_VAZIO",
  FALHA_ESTRUTURAL: "FALHA_ESTRUTURAL",
  VERSAO_TISS_INVALIDA: "VERSAO_TISS_INVALIDA",
  TUSS_INVALIDO: "TUSS_INVALIDO",
  TUSS_FORMATO_INVALIDO: "TUSS_FORMATO_INVALIDO",
  ERRO_XSD: "ERRO_XSD",
};

export const MESSAGES = {
  RPA_SUCCESS: (count: number) =>
    `TISS Guard: ${count} campos preenchidos com sucesso!`,
  RPA_WARNING_TITLE: "⚠️ Atenção: Preenchimento Incompleto",
  RPA_WARNING_SUBTITLE:
    "Os seguintes dados não puderam ser preenchidos automaticamente e exigem digitação manual:",
  MODAL_VALIDATION_ERROR: "⚠️ Falha na validação TISS",
  RPA_NO_FIELDS: "⚠️ [TISS Guard RPA] No matching fields found.",
};
