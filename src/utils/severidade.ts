/**
 * severidade.ts
 * -----------------------------------------------------------------------
 * FONTE ÚNICA DE VERDADE para classificação de severidade das inconsistências.
 *
 * PROBLEMA ORIGINAL (achado na auditoria):
 * O projeto tinha 4 definições diferentes e divergentes de "o que é crítico",
 * cada uma em um arquivo, nenhuma concordando com as outras nem com os
 * `tipo`s realmente emitidos pelo motor (tissAuditor.ts):
 *
 *   1) AuditPanel.tsx (filtro)      -> tipo === 'Crítico' || 'XSD Schema' || 'Erro Órfão'
 *   2) AuditPanel.tsx (cor da borda)-> (a mesma lista acima, duplicada)
 *   3) App.tsx > ResumoSimples      -> tipo.toLowerCase().includes('erro')
 *   4) App.tsx > PainelAuditoria    -> includes('erro') || includes('xsd') || includes('crítico') || includes('inválido')
 *   5) App.tsx > useEffect (popup)  -> includes('erro') || includes('xsd')
 *
 * Resultado prático: o card de resumo, o painel lateral e o popup de alerta
 * crítico podiam mostrar 3 números diferentes para o MESMO resultado de
 * auditoria — e "Crítico" / "Inconsistência" nunca são de fato gerados pelo
 * motor (são valores mortos em InconsistencyType), então parte da lógica de
 * filtro em AuditPanel.tsx nunca é alcançada.
 *
 * SOLUÇÃO: centralizar a regra aqui. Qualquer tela que precise saber se um
 * item é crítico, aviso ou informativo deve importar `getSeveridade` (ou os
 * helpers derivados) deste arquivo — nunca reimplementar a checagem inline.
 */

import { Inconsistency, InconsistencyType } from '../types/tiss';

export type Severidade = 'critico' | 'aviso' | 'info';

/**
 * Mapa explícito e exaustivo: cada tipo possível de InconsistencyType tem
 * uma severidade fixa e documentada. TypeScript garante (via o tipo Record)
 * que, se um novo `InconsistencyType` for adicionado em types/tiss.ts e
 * esquecerem de mapeá-lo aqui, o build quebra em tempo de compilação —
 * evitando que o bug de divergência volte a acontecer silenciosamente.
 */
const MAPA_SEVERIDADE: Record<InconsistencyType, Severidade> = {
  // Impedem o envio do lote / quebram parser da operadora
  'Caracter Inválido': 'critico',
  'XSD Schema': 'critico',
  'Erro Órfão': 'critico',
  'Erro Estrutural': 'critico',
  'Erro de Cálculo': 'critico',
  'Crítico': 'critico',

  // Merecem revisão, mas não bloqueiam necessariamente o envio
  'Erro Regra': 'aviso',
  'Inconsistência': 'aviso',
  'Aviso': 'aviso',
};

export function getSeveridade(tipo: InconsistencyType): Severidade {
  return MAPA_SEVERIDADE[tipo] ?? 'aviso';
}

export function isCritico(item: Pick<Inconsistency, 'tipo'>): boolean {
  return getSeveridade(item.tipo) === 'critico';
}

export function isAviso(item: Pick<Inconsistency, 'tipo'>): boolean {
  return getSeveridade(item.tipo) === 'aviso';
}

/** Conta críticos/avisos de uma lista de inconsistências em uma única passada. */
export function contarPorSeveridade(itens: Inconsistency[]): { criticos: number; avisos: number } {
  let criticos = 0;
  let avisos = 0;
  for (const item of itens) {
    if (isCritico(item)) criticos++;
    else avisos++;
  }
  return { criticos, avisos };
}

/** Cor de borda/tema padronizada, usada por AuditPanel e telas correlatas. */
export function corPorSeveridade(tipo: InconsistencyType): 'crit' | 'warn' {
  return isCritico({ tipo }) ? 'crit' : 'warn';
}
