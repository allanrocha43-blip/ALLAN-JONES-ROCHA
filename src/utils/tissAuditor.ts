/**
 * tissAuditor.ts
 * -----------------------------------------------------------------------
 * BARRIL DE COMPATIBILIDADE (Facade). Este arquivo era, até esta
 * refatoração, um único módulo de 1786 linhas com o motor de regras, o
 * cálculo de hash, a formatação de XML e as rotinas de correção/sincronia
 * todos misturados no mesmo escopo (alto acoplamento).
 *
 * O código foi dividido em módulos de responsabilidade única dentro de
 * `src/utils/tiss/`:
 *   - tiss/xmlLineUtils.ts   → localizador de linha, encoding Latin-1
 *   - tiss/regexPatterns.ts  → padrões regex de guia/procedimento (fonte única)
 *   - tiss/guiaExtractor.ts  → extração estruturada de guias/procedimentos
 *   - tiss/auditoria.ts      → o motor de regras (executarAuditoriaDinamica)
 *   - tiss/correcoes.ts      → sincronização de edições e correção em lote
 *   - tiss/hash.ts           → hash MD5 oficial ANS
 *   - tiss/formatting.ts     → indentação/formatação do XML
 *
 * Este arquivo permanece como PONTO DE ENTRADA ÚNICO e re-exporta tudo,
 * para que nenhum import existente em components/*.tsx ou App.tsx precise
 * mudar. Import novo código diretamente de `utils/tiss/*` quando fizer
 * sentido (menos superfície de módulo carregada); o barril continua
 * válido para compatibilidade retroativa.
 */

export { prepararParaExportacaoEHash } from './tiss/xmlLineUtils';
export { executarAuditoriaDinamica } from './tiss/auditoria';
export {
  sincronizarProcedimento,
  sincronizarDadosGuia,
  aplicarCorrecoesSegurasRecursivo,
  aplicarCorrecaoIndividual,
} from './tiss/correcoes';
export { calcularHashMD5Tiss, exportarXmlValidadoComHash } from './tiss/hash';
export { formatarEHarmonizarXml, formatXmlBruto } from './tiss/formatting';
