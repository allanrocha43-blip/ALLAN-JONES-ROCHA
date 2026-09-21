/**
 * guiaExtractor.ts
 * -----------------------------------------------------------------------
 * Responsabilidade única: converter o XML bruto em objetos GuideItem /
 * ProcedimentoItem com coordenadas (startIdx/endIdx) exatas. Não decide
 * nada sobre o que é "erro" — isso é responsabilidade de `auditoria.ts`.
 */

import { GuideItem, ProcedimentoItem } from '../../types/tiss';
import { REGEX_TODAS_GUIAS, REGEX_BLOCO_PROCEDIMENTO, clonarRegex } from './regexPatterns';

export function extrairGuias(conteudo: string): GuideItem[] {
  const guias: GuideItem[] = [];
  const regexTodasGuias = clonarRegex(REGEX_TODAS_GUIAS);
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regexTodasGuias.exec(conteudo)) !== null) {
    index++;
    const startIdx = match.index;
    const endIdx = match.index + match[0].length;
    const bloco = match[1];
    const tipoGuia = match[2];

    const cartMatch = bloco.match(/<(?:[^:]+:)?numeroCarteira>([^<]*)<\//);
    const carteira = cartMatch ? cartMatch[1].trim() : "";

    const senhaMatch = bloco.match(/<(?:[^:]+:)?senha>([^<]*)<\//);
    const senha = senhaMatch ? senhaMatch[1].trim() : "";

    const guiaMatch = bloco.match(/<(?:[^:]+:)?numeroGuiaOperadora>([^<]*)<\//);
    const guia = guiaMatch ? guiaMatch[1].trim() : "";

    const prestadorMatch = bloco.match(/<(?:[^:]+:)?numeroGuiaPrestador>([^<]*)<\//);
    const guiaPrestador = prestadorMatch ? prestadorMatch[1].trim() : "";

    const procedimentos: ProcedimentoItem[] = [];
    const regexBlocoProcedimento = clonarRegex(REGEX_BLOCO_PROCEDIMENTO);
    let procMatch: RegExpExecArray | null;
    let pIndex = 0;
    while ((procMatch = regexBlocoProcedimento.exec(bloco)) !== null) {
      pIndex++;
      const pBloco = procMatch[1];
      const pStartIdx = startIdx + procMatch.index;
      const pEndIdx = pStartIdx + pBloco.length;

      const codMatch = pBloco.match(/<(?:[^:]+:)?codigoProcedimento(?:[^>]*)>([^<]*)<\//);
      const codigo = codMatch ? codMatch[1].trim() : "";

      const dtExecMatch = pBloco.match(/<(?:[^:]+:)?(?:dataExecucao|dataAtendimento|data)(?:[^>]*)>([^<]*)<\//);
      const dataExecucao = dtExecMatch ? dtExecMatch[1].trim() : undefined;

      const hrIniMatch = pBloco.match(/<(?:[^:]+:)?horaInicial(?:[^>]*)>([^<]*)<\//);
      const horaInicial = hrIniMatch ? hrIniMatch[1].trim() : undefined;

      const hrFimMatch = pBloco.match(/<(?:[^:]+:)?horaFinal(?:[^>]*)>([^<]*)<\//);
      const horaFinal = hrFimMatch ? hrFimMatch[1].trim() : undefined;

      const descMatch = pBloco.match(/<(?:[^:]+:)?descricaoProcedimento(?:[^>]*)>([^<]*)<\//);
      const descricao = descMatch ? descMatch[1].trim() : "";

      const qtdMatch = pBloco.match(/<(?:[^:]+:)?quantidadeExecutada(?:[^>]*)>([^<]*)<\//);
      const quantidade = qtdMatch ? qtdMatch[1].trim() : "1";

      const valUnitMatch = pBloco.match(/<(?:[^:]+:)?valorUnitario(?:[^>]*)>([^<]*)<\//i);
      const valorUnitario = valUnitMatch ? valUnitMatch[1].trim() : "";

      const redAcrescMatch = pBloco.match(/<(?:[^:]+:)?reducaoAcrescimo(?:[^>]*)>([^<]*)<\//i);
      const reducaoAcrescimo = redAcrescMatch ? redAcrescMatch[1].trim() : undefined;

      const valTotalMatch = pBloco.match(/<(?:[^:]+:)?(?:valorTotal|valorProcedimento|valorTotalGeral)(?:[^>]*)>([^<]*)<\//i);
      const valor = valTotalMatch ? valTotalMatch[1].trim() : valorUnitario;

      // ID estável baseado em posição + tamanho + código
      procedimentos.push({
        id: `proc-${index}-${pIndex}`,
        startIdx: pStartIdx,
        endIdx: pEndIdx,
        codigo,
        dataExecucao,
        horaInicial,
        horaFinal,
        descricao,
        quantidade,
        valorUnitario,
        reducaoAcrescimo,
        valor
      });
    }

    // ID estável baseado em offset + tamanho + número da guia/prestador
    guias.push({
      id: `guia-${index}`,
      index,
      startIdx,
      endIdx,
      tipoGuia,
      carteira,
      senha,
      guia,
      guiaPrestador,
      procedimentos
    });
  }

  return guias;
}
