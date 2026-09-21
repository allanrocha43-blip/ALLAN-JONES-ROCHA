/**
 * regexPatterns.ts
 * -----------------------------------------------------------------------
 * Padrões regex compartilhados para reconhecer blocos de guia e
 * procedimento no XML TISS. Centralizados aqui (SRP) para que
 * `auditoria.ts`, `guiaExtractor.ts` e `correcoes.ts` usem exatamente a
 * mesma definição de "o que é uma guia" — antes cada função reconstruía
 * `new RegExp(REGEX_TODAS_GUIAS.source, ...)` a partir de uma cópia
 * import da mesma constante; agora a fonte é uma só.
 *
 * NOTA: este motor ainda é baseado em regex sobre texto bruto (não um
 * parser XML/DOM real). Isso é rápido e funcionou bem nos testes com o
 * lote de exemplo, mas é estruturalmente frágil para casos como CDATA,
 * atributos com '>' em valores, ou tags de mesmo nome aninhadas em
 * profundidade — ver observações na resposta sobre limites arquiteturais.
 */

export const TIPOS_DE_GUIA = [
  'guiaConsulta',
  'guiaSP-SADT',
  'guiaResumoInternacao',
  'guiaHonorarioIndividual',
  'guiaHonorarios',
  'guiaOutrasDespesas',
  'guiaOdontologia',
  'guiaSADT',
  'guiaSPSADT',
  'guiaProrrogacao',
  'guiaOdontologica',
  'guiaTratamentoOdontologico',
] as const;

const TIPOS_GUIA_ALT = TIPOS_DE_GUIA.join('|');

export const REGEX_TODAS_GUIAS = new RegExp(
  `(<(?:[^:]+:)?(${TIPOS_GUIA_ALT})(?:\\s[^>]*?)?(?:\\/>|>[\\s\\S]*?<\\/(?:[^:]+:)?\\2\\s*>))`,
  'gi'
);

export const REGEX_PROCEDIMENTO_EXECUTADO =
  /<(?:[^:]+:)?procedimentoExecutado(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?procedimentoExecutado\s*>/gi;

export const REGEX_BLOCO_PROCEDIMENTO =
  /(<(?:[^:]+:)?(procedimentoExame|procedimentoExecutado|procedimento)(?:\s[^>]*?)?(?:\/>|>[\s\S]*?<\/(?:[^:]+:)?\2\s*>))/gi;

/** Sempre clone antes de `.exec()` em laço — RegExp com flag `g` é stateful (`lastIndex`). */
export function clonarRegex(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags);
}
