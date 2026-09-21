/**
 * tissVersion.ts
 * -----------------------------------------------------------------------
 * PROBLEMA ORIGINAL (achado na auditoria):
 * O motor (tissAuditor.ts) já EXTRAI a versão declarada em <Padrao> /
 * <versaoPadrao>, mas nunca a usa para decidir nada. Todas as regras
 * (pensadas originalmente para 3.05.00/4.01.00, conforme os próprios
 * comentários do código) rodavam incondicionalmente para QUALQUER versão
 * declarada no XML — inclusive 4.02.00, 4.03.00 ou uma versão futura ainda
 * não mapeada. Isso é o oposto do que a ANS exige: cada versão do padrão
 * TISS tem seu próprio conjunto de tags obrigatórias/opcionais, e aplicar
 * regras da versão errada gera falsos positivos e falsos negativos.
 *
 * ESTE MÓDULO fornece:
 *   1) Parsing e comparação robusta de versões TISS (formato x.y.zz).
 *   2) Uma tabela central de versões suportadas, do 3.02.00 ao 4.03.00.
 *   3) Um gate `regraAplicavel(versaoXml, regra)` que qualquer regra do
 *      motor pode consultar antes de disparar uma inconsistência, usando
 *      faixas [minVersao, maxVersao) — sem quebrar compatibilidade retroativa.
 *
 * ATUALIZAÇÃO (XSDs oficiais 4.02.00 e 4.03.00 conferidos):
 * Os XSDs oficiais da ANS para 4.02.00 e 4.03.00 (tissGuiasV4_02_00.xsd e
 * tissGuiasV4_03_00.xsd, pasta "Padrão TISS Comunicação 040200/040300")
 * foram comparados linha a linha contra a base 4.01.00 já em uso. Achados
 * estruturais relevantes para o motor de regras:
 *
 *   1) <caraterAtendimento> passou a ser OBRIGATÓRIO dentro de
 *      <dadosInternacao> da Guia de Honorário Individual
 *      (complexType ctm_honorarioIndividualGuia) a partir da 4.03.00.
 *      Em 4.01.00/4.02.00 esse bloco só continha <dataInicioFaturamento>
 *      e <dataFimFaturamento> — a tag não existia ali. Regra adicionada
 *      abaixo (`caraterAtendimentoHonorarioIndividualObrigatorio`) e
 *      aplicada em auditoria.ts no novo branch `ehHonorarioIndividual`.
 *   2) <centroConsumo> (opcional, dm_centroConsumo) foi adicionado em
 *      4.03.00 em <itensGuia> (Recurso de Glosa) e na seção de
 *      procedimento da guia de solicitação de SP/SADT. Como é opcional
 *      (minOccurs="0"), não gera regra de obrigatoriedade — nenhuma ação
 *      necessária no motor.
 *   3) Vários campos monetários (valorProcedimento, valorProc,
 *      valorFranquia, valorTotalInformadoGuia, valorTotalProcessadoGuia,
 *      valorTotalGlosaGuia, valorTotalFranquiaGuia, valorTotalLiberadoGuia,
 *      valorRecursado, valorSolicitado, valorInformado, valorProcessado,
 *      valorGlosaEstorno) tiveram o tipo ampliado de st_decimal8-2 (ou
 *      st_decimal7-2) para st_decimal10-2 a partir da 4.02.00 — permite
 *      valores maiores (até 8 dígitos inteiros ao invés de 6). Já <qtdUS>
 *      foi na direção oposta, de st_decimal8-2 para st_decimal7-2. Não
 *      implementei uma regra de validação de "estouro de dígitos" para
 *      isso: o motor atual é baseado em regex sobre texto bruto e não
 *      diferencia com segurança em qual dos vários contextos de "qtdUS"
 *      um valor aparece (guia normal vs. recurso de glosa), então uma
 *      regra de limite de dígitos por versão arriscaria falsos positivos.
 *      Registro aqui para uma futura extração estruturada (DOM real) do
 *      bloco correto antes de implementar esse limite.
 *
 * LIMITE HONESTO REMANESCENTE: as regras acima cobrem apenas as
 * diferenças estruturais que localizamos comparando os XSDs de guias e
 * tipos complexos. Não há, neste módulo, uma auditoria completa de TODAS
 * as diferenças entre 4.01.00 → 4.03.00 (ex.: mudanças em WSDLs de
 * webservices, tipos simples/domínios (dm_*) com novos valores válidos,
 * ou mensagens de erro/glosa). Cada nova exigência de negócio ainda deve
 * ser conferida contra o Manual de Especificações TISS vigente
 * (ans.gov.br) antes de virar regra automática de correção.
 */

export interface VersaoTiss {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

/** Versões formalmente conhecidas por este validador (atualizar conforme novas versões forem homologadas). */
export const VERSOES_SUPORTADAS = [
  '3.02.00', '3.02.01', '3.02.02', '3.03.00', '3.03.01', '3.03.02', '3.03.03', '3.03.04', '3.03.05',
  '3.04.00', '3.04.01', '3.04.02', '3.04.03', '3.04.04',
  '3.05.00', '3.05.01', '3.05.02', '3.05.03', '3.05.04',
  '4.00.00', '4.00.01', '4.01.00', '4.01.01',
  '4.02.00', '4.02.01',
  '4.03.00',
] as const;

export function parseVersaoTiss(versaoStr: string | null | undefined): VersaoTiss | null {
  if (!versaoStr) return null;
  const limpo = versaoStr.trim();
  const m = limpo.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return {
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
    raw: limpo,
  };
}

/** Retorna -1, 0 ou 1, comparando (a vs b) — semântica igual a Array.sort comparators. */
export function compararVersoes(a: VersaoTiss, b: VersaoTiss): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function versaoMaiorOuIgual(versao: VersaoTiss, referencia: string): boolean {
  const ref = parseVersaoTiss(referencia);
  if (!ref) return false;
  return compararVersoes(versao, ref) >= 0;
}

export function versaoMenorQue(versao: VersaoTiss, referencia: string): boolean {
  const ref = parseVersaoTiss(referencia);
  if (!ref) return false;
  return compararVersoes(versao, ref) < 0;
}

export function isVersaoConhecida(versao: VersaoTiss): boolean {
  return (VERSOES_SUPORTADAS as readonly string[]).includes(versao.raw);
}

/**
 * Gate central de regras versionadas.
 * `min` é inclusivo; `max` é exclusivo (mesma convenção de range usada em
 * changelogs da ANS: "válido a partir de X até antes de Y").
 * Se `versaoXml` não puder ser interpretada (tag ausente/corrompida),
 * o gate assume a postura mais conservadora: aplica a regra mesmo assim
 * (fail-safe para não silenciar erros reais em XML sem <Padrao> legível).
 */
export function regraAplicavel(
  versaoXmlStr: string | null | undefined,
  faixa: { min?: string; max?: string } = {}
): boolean {
  const versao = parseVersaoTiss(versaoXmlStr);
  if (!versao) return true; // fail-safe: sem versão legível, não deixamos de auditar

  if (faixa.min && versaoMenorQue(versao, faixa.min)) return false;
  if (faixa.max && versaoMaiorOuIgual(versao, faixa.max)) return false;
  return true;
}

/**
 * Regras conhecidas específicas de versão, extraídas dos comentários e do
 * comportamento original do motor. Cada entrada documenta a partir de qual
 * versão a exigência vale — usar via `regraAplicavel(versao, REGRAS_VERSIONADAS.xxx)`.
 */
export const REGRAS_VERSIONADAS = {
  /** <indicacaoAcidente> em guiaConsulta: obrigatório a partir da 3.05.00 (o código original já citava isso em comentário, mas nunca checava a versão de fato). */
  indicacaoAcidenteObrigatoria: { min: '3.05.00' } as const,
  /**
   * <caraterAtendimento> em <dadosInternacao> da Guia de Honorário
   * Individual (guiaHonorarios / guiaHonorarioIndividual): obrigatório a
   * partir da 4.03.00. Confirmado no XSD oficial ANS
   * (tissGuiasV4_03_00.xsd, complexType ctm_honorarioIndividualGuia) —
   * em 4.01.00/4.02.00 esse elemento não fazia parte deste sub-bloco.
   */
  caraterAtendimentoHonorarioIndividualObrigatoria: { min: '4.03.00' } as const,
} satisfies Record<string, { min?: string; max?: string }>;
