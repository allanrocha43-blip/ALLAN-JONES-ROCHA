/**
 * auditoria.ts
 * -----------------------------------------------------------------------
 * O MOTOR DE REGRAS em si: recebe o XML bruto e devolve um AuditResult
 * com todas as inconsistências encontradas. Esta é a parte mais complexa
 * e de maior risco do sistema (centenas de regras encadeadas via regex).
 *
 * DECISÃO DE ESCOPO NESTA REFATORAÇÃO: optei por NÃO quebrar esta função
 * em dezenas de "regras plugáveis" isoladas nesta entrega. O motor já
 * funciona e está coberto por testes de regressão (tissAuditor.test.ts)
 * com o XML real do usuário; fatiar cegamente ~1000 linhas de regex
 * fortemente interdependentes (offsets compartilhados, contexto de guia
 * atual, contadores de total) sem os XSDs oficiais da ANS para validar
 * cada extração teria alto risco de introduzir regressões sutis sem
 * ganho real — SOLID não significa "arquivos pequenos a qualquer custo".
 * O que FOI feito: isolar este motor do resto do app (hash, formatação,
 * sincronização de UI, extração de guias) em módulos próprios de
 * responsabilidade única, e blindá-lo contra exceções não tratadas via
 * `executarAuditoriaDinamica` (o wrapper público abaixo). Uma quebra
 * futura em "uma regra por arquivo" é o próximo passo natural e pode ser
 * feito incrementalmente, sempre validando contra os testes de regressão.
 */

import { AuditResult, Inconsistency } from '../../types/tiss';
import { isDescricaoValida, getDescricaoProcedimentoTISS } from '../tabelaTiss';
import { regraAplicavel, REGRAS_VERSIONADAS } from '../tissVersion';
import { LocalizadorDeLinha, mascararComentarios } from './xmlLineUtils';
import { REGEX_TODAS_GUIAS, REGEX_PROCEDIMENTO_EXECUTADO, clonarRegex } from './regexPatterns';
import { extrairGuias } from './guiaExtractor';
// Import circular intencional: calcularHashMD5Tiss é uma função pura (não
// depende de executarAuditoriaDinamica), então é seguro em módulos ES —
// ela só é *chamada* dentro do corpo de uma função aqui embaixo, nunca no
// top-level do módulo, então não há problema de ordem de inicialização.
import { calcularHashMD5Tiss } from './hash';

/**
 * Ponto de entrada público e à PROVA DE EXCEÇÃO do motor de auditoria.
 *
 * PROBLEMA ORIGINAL (achado na auditoria): a função interna
 * `executarAuditoriaDinamicaInterna` roda dezenas de regexes encadeadas
 * sobre o XML bruto e é chamada diretamente dentro de um `useMemo` no
 * App.tsx, sem try/catch em nenhum dos dois lados e sem nenhum
 * `ErrorBoundary` React em toda a árvore de componentes. Qualquer exceção
 * inesperada (ex.: XML extremamente grande causando estouro de pilha em
 * regex, ou um `.match()` retornando null onde o código não esperava)
 * derruba a renderização inteira e o usuário vê tela branca, sem
 * diagnóstico algum — justamente no cenário mais provável de acontecer:
 * XML malformado enviado pelo próprio usuário.
 *
 * Esta função encapsula a auditoria real e, se algo falhar, devolve um
 * AuditResult válido (não lança exceção) contendo uma inconsistência
 * explicando a falha, para a UI conseguir renderizar normalmente.
 */
export function executarAuditoriaDinamica(conteudoOriginal: string): AuditResult {
  try {
    return executarAuditoriaDinamicaInterna(conteudoOriginal);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      versaoTiss: "Desconhecida",
      cnpjBase: "-",
      totalLote: 0,
      valorConsulta: 0,
      valorSadt: 0,
      inconsistencias: [{
        id: `motor-falhou-${Date.now()}`,
        linha: 1,
        tipo: "Erro Estrutural",
        desc: `Não foi possível concluir a auditoria automática deste arquivo: ${msg}. Verifique se o XML está bem-formado (tags fechadas corretamente, sem caracteres binários). Corrija manualmente e tente novamente.`,
        original: "",
        sugestao: "",
        seguro: false
      }],
      guias: []
    };
  }
}

function executarAuditoriaDinamicaInterna(
  conteudoOriginal: string
): AuditResult {
  if (!conteudoOriginal || !conteudoOriginal.trim()) {
    return {
      versaoTiss: "Desconhecida",
      cnpjBase: "-",
      totalLote: 0,
      valorConsulta: 0,
      valorSadt: 0,
      inconsistencias: [],
      guias: []
    };
  }

  // Mascara comentários XML <!-- ... --> substituindo tudo exceto  por espaços.
  // Preserva offsets e contagem de linhas idênticos ao original, evitando falsos positivos.
  const conteudo = mascararComentarios(conteudoOriginal);
  const localizador = new LocalizadorDeLinha(conteudo);
  const linhas = conteudo.split('\n');
  const inconsistencias: Inconsistency[] = [];

  // MÓDULO CARACTERES INVÁLIDOS (Detecta ASCII de controle que quebram o parser PHP/SimpleXML)
  const invalidCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
  let invalidMatch: RegExpExecArray | null;
  while ((invalidMatch = invalidCharRegex.exec(conteudo)) !== null) {
    const charCode = invalidMatch[0].charCodeAt(0);
    const matchStart = invalidMatch.index;
    const linhaChar = localizador.linhaDe(matchStart);
    
    inconsistencias.push({
      id: `invalid-char-${linhaChar}-${matchStart}`,
      linha: linhaChar,
      tipo: "Caracter Inválido",
      desc: `Linha ${linhaChar}: Caractere de controle inválido (PCDATA invalid Char value ${charCode}) detectado, pode quebrar validadores operacionais.`,
      original: invalidMatch[0],
      sugestao: "", // Simplesmente remover o caractere
      seguro: true
    });
  }


  // MÓDULO PCDATA: 'element-only' content type validation
  const mixedContentRegex = /(<(\/?)([^>\s]+)[^>]*>)([^<]*[^\s<][^<]*)(?=<(\/?)([^>\s]+))/g;
  let mixedMatch;
  while ((mixedMatch = mixedContentRegex.exec(conteudo)) !== null) {
    const isPrecedingClosing = mixedMatch[2] === '/';
    const precedingTagName = mixedMatch[3].replace(/\/$/, '');
    const textContent = mixedMatch[4];
    const isFollowingClosing = mixedMatch[5] === '/';
    const followingTagName = mixedMatch[6];
    
    if (precedingTagName.startsWith('?')) continue;
    
    const isValid = !isPrecedingClosing && isFollowingClosing && precedingTagName === followingTagName;
    
    if (!isValid) {
      const matchStart = mixedMatch.index + mixedMatch[1].length; 
      const linhaMixed = localizador.linhaDe(matchStart);
      const invalidText = textContent.trim();
      
      const trailingMatch = textContent.match(/(\s+)$/);
      const trailingWs = trailingMatch ? trailingMatch[1] : '';
      const originalStr = mixedMatch[1] + textContent;
      const sugestaoStr = mixedMatch[1] + trailingWs;
      
      inconsistencias.push({
        id: `mixed-content-${linhaMixed}-${matchStart}`,
        linha: linhaMixed,
        tipo: "XSD Schema",
        desc: `Linha ${linhaMixed}: Character content other than whitespace is not allowed because the content type is 'element-only' ("${invalidText.length > 20 ? invalidText.substring(0, 20) + '...' : invalidText}").`,
        original: originalStr,
        sugestao: sugestaoStr,
        seguro: true
      });
    }
  }

  // Version extraction
  const padraoMatch = conteudo.match(/<(?:[^:]+:)?(?:Padrao|versaoPadrao)>([^<]+)<\//i);
  const versaoTiss = padraoMatch ? padraoMatch[1].trim() : "Desconhecida";

  // CNPJ Base extraction
  const cnpjMatch = conteudo.match(/<(?:[^:]+:)?(?:CNPJ|cnpjContratado|codigoPrestadorNaOperadora)>([^<]+)<\//i);
  const cnpjBase = cnpjMatch ? cnpjMatch[1].trim() : "-";

  // Total lot values calculated by inspecting each guide block individually (prevents SADT double/triple counting)
  let valorConsulta = 0;
  let valorSadt = 0;

  // Guia Line Range Mapping for precise error attribution
  interface GuiaLineRange {
    startLine: number;
    endLine: number;
    numeroGuia: string;
  }

  const guiaRanges: GuiaLineRange[] = [];
  const regexTodasGuias = clonarRegex(REGEX_TODAS_GUIAS);
  let matchRange: RegExpExecArray | null;

  while ((matchRange = regexTodasGuias.exec(conteudo)) !== null) {
    const startIdx = matchRange.index;
    const endIdx = startIdx + matchRange[0].length;
    const startLine = localizador.linhaDe(startIdx);
    const endLine = localizador.linhaDe(endIdx);
    const bloco = matchRange[1];

    const prestadorMatch = bloco.match(/<(?:[^:]+:)?numeroGuiaPrestador>([^<]+)<\//i);
    const operadoraMatch = bloco.match(/<(?:[^:]+:)?numeroGuiaOperadora>([^<]+)<\//i);
    const numeroGuia = (prestadorMatch && prestadorMatch[1].trim()) || (operadoraMatch && operadoraMatch[1].trim()) || '';

    if (numeroGuia) {
      guiaRanges.push({ startLine, endLine, numeroGuia });
    }
  }

  function getGuiaNumeroForLine(lineNum: number): string | null {
    const found = guiaRanges.find(r => lineNum >= r.startLine && lineNum <= r.endLine);
    return found ? found.numeroGuia : null;
  }

  // MÓDULO ESTRUTURAL (Elemento Órfão Tracker TISS 4.01.00 & 3.05.00) e CÁLCULO DE TOTAIS
  const regexTodasGuiasParaTotal = clonarRegex(REGEX_TODAS_GUIAS);
  let matchBloco: RegExpExecArray | null;
  let guideCounter = 0;

  while ((matchBloco = regexTodasGuiasParaTotal.exec(conteudo)) !== null) {
    guideCounter++;
    const bloco = matchBloco[0];
    const tipoGuiaAtual = matchBloco[2];
    const ehConsulta = /^guiaConsulta$/i.test(tipoGuiaAtual);
    const ehSadt = /^guia(?:SP-?)?SADT$/i.test(tipoGuiaAtual);
    // NOVO: Guia de Honorário Individual (XSD: complexType ctm_honorarioIndividualGuia).
    // Cobre os dois nomes de tag usados na prática ("guiaHonorarios" no
    // wrapper ctm_guiaLote/<guiasTISS> e "guiaHonorarioIndividual" em
    // outros contextos), ambos já reconhecidos por TIPOS_DE_GUIA.
    const ehHonorarioIndividual = /^guiaHonorario(?:s|Individual)$/i.test(tipoGuiaAtual);
    const matchStart = matchBloco.index;
    const linhaInicio = localizador.linhaDe(matchStart);
    const gNum = getGuiaNumeroForLine(linhaInicio);
    const prefix = gNum ? `Guia nº ${gNum} | ` : `Guia ${guideCounter} | `;

    // 0. Cálculo de Totais
    let valorGuia = 0;
    
    // Tenta encontrar o valorTotalGeral no final da guia (mais confiável para SADT, Internação, Odonto)
    const summaryMatch = bloco.match(/<(?:[^:]+:)?(?:valorTotalGeral|valorTotalGuia|valorGeral|valorTotalExames)(?:[^>]*)>\s*([0-9.,]+)\s*<\//i);
    if (summaryMatch) {
      valorGuia = parseFloat(summaryMatch[1].replace(',', '.')) || 0;
    } else {
      // Tenta encontrar o valorConsulta (comum em guiaConsulta)
      const consultaMatch = bloco.match(/<(?:[^:]+:)?valorConsulta(?:[^>]*)>\s*([0-9.,]+)\s*<\//i);
      if (consultaMatch) {
        valorGuia = parseFloat(consultaMatch[1].replace(',', '.')) || 0;
      } else {
        // Fallback: se não achar os totais gerais, busca tags de valor geral perdidas ou soma os procedimentos
        const fallbackMatch = bloco.match(/<(?:[^:]+:)?(?:valorTotal|valorProcedimento)(?:[^>]*)>\s*([0-9.,]+)\s*<\//i);
        if (fallbackMatch) {
          // Se tiver só um valor, provavelmente é da guiaConsulta sem <valorConsulta>
          valorGuia = parseFloat(fallbackMatch[1].replace(',', '.')) || 0;
        }
      }
    }

    if (ehConsulta) {
      valorConsulta += valorGuia;
    } else {
      valorSadt += valorGuia; // Agrupa outros tipos de guia no "SADT" pro lote
    }

    // Detect Namespace prefix used in this guide block (e.g. "ans:" or "").
    const tipoEscapadoParaNs = tipoGuiaAtual.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nsMatch = bloco.match(new RegExp(`<([a-zA-Z0-9_-]+:)?${tipoEscapadoParaNs}`, 'i'));
    const ns = nsMatch && nsMatch[1] ? nsMatch[1] : '';

    if (ehConsulta) {
      // 1. <profissionalExecutante>
      if (!/<(?:[^:]+:)?profissionalExecutante(?:\s[^>]*?)?(?:\/>|>[\s\S]*?<\/(?:[^:]+:)?profissionalExecutante\s*>)/i.test(bloco)) {
        inconsistencias.push({
          id: `orfao-prof-${guideCounter}-${linhaInicio}`,
          linha: linhaInicio,
          tipo: "Erro Órfão",
          desc: `${prefix}Linha ${linhaInicio}: Este elemento está órfão (<profissionalExecutante>). Falta informar.`,
          original: "[BLOCO INCOMPLETO]",
          sugestao: "",
          seguro: false
        });
      } else {
        // Sub-elementos de profissionalExecutante
        const profBlocoMatch = bloco.match(/<(?:[^:]+:)?profissionalExecutante(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?profissionalExecutante\s*>/i);
        if (profBlocoMatch) {
          const profBloco = profBlocoMatch[0];
          const profOffset = matchStart + (profBlocoMatch.index || 0);
          const profLine = localizador.linhaDe(profOffset);

          const reqProfSub = ['conselhoProfissional', 'numeroConselhoProfissional', 'UF', 'CBOS'];
          reqProfSub.forEach(subTag => {
            if (!new RegExp(`<([^:]+:)?${subTag}(?:\\s[^>]*)?>\\s*[^<\\s]+\\s*<\\/([^:]+:)?${subTag}\\s*>`, 'i').test(profBloco)) {
              inconsistencias.push({
                id: `orfao-prof-${subTag}-${guideCounter}-${profLine}`,
                linha: profLine,
                tipo: "Erro Órfão",
                desc: `${prefix}Linha ${profLine}: Este elemento está órfão (<${subTag}> em <profissionalExecutante>). Falta informar.`,
                original: "[SUB-ELEMENTO AUSENTE]",
                sugestao: "",
                seguro: false
              });
            }
          });
        }
      }

      // 2. <indicacaoAcidente> (Obrigatório a partir do Padrão TISS 3.05.00 para guiaConsulta)
      // ROTEAMENTO POR VERSÃO: esta regra só é aplicada se a versão declarada
      // no <Padrao> do próprio XML for >= 3.05.00. Em lotes legítimos de
      // versões anteriores (3.02.00-3.04.xx), a ausência da tag deixa de
      // gerar um falso positivo.
      if (
        regraAplicavel(versaoTiss, REGRAS_VERSIONADAS.indicacaoAcidenteObrigatoria) &&
        !/<(?:[^:]+:)?indicacaoAcidente(?:\s[^>]*?)?>\s*[^<\s]+\s*<\/(?:[^:]+:)?indicacaoAcidente\s*>/i.test(bloco)
      ) {
        let lineTarget = linhaInicio;
        let origSnippet = "";
        const dadosAtendMatch = bloco.match(/<(?:[^:]+:)?dadosAtendimento/i);
        if (dadosAtendMatch && dadosAtendMatch.index !== undefined) {
          lineTarget = localizador.linhaDe(matchStart + dadosAtendMatch.index);
          const lineStr = linhas[lineTarget - 1] || "";
          origSnippet = lineStr;
        }

        inconsistencias.push({
          id: `orfao-indicacaoAcidente-${guideCounter}-${lineTarget}`,
          linha: lineTarget,
          tipo: "Erro Órfão",
          desc: `${prefix}Linha ${lineTarget}: Este elemento está órfão (<indicacaoAcidente>). Falta informar.`,
          original: origSnippet || "[DADOS ATENDIMENTO]",
          sugestao: origSnippet ? `${origSnippet.substring(0, origSnippet.search(/\S/))}<${ns}indicacaoAcidente>9</${ns}indicacaoAcidente>${origSnippet}` : `<${ns}indicacaoAcidente>9</${ns}indicacaoAcidente>`,
          seguro: origSnippet !== ""
        });
      }

      // 3. <atendimentoRN> e <cpf> em <dadosBeneficiario>
      const benBlocoMatch = bloco.match(/<(?:[^:]+:)?dadosBeneficiario(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?dadosBeneficiario\s*>/i);
      if (benBlocoMatch) {
        const benBloco = benBlocoMatch[0];
        if (!/<(?:[^:]+:)?atendimentoRN(?:\s[^>]*?)?>\s*[^<\s]+\s*<\/(?:[^:]+:)?atendimentoRN\s*>/i.test(benBloco)) {
          const benOffset = matchStart + (benBlocoMatch.index || 0);
          const benLine = localizador.linhaDe(benOffset);
          const origSnippet = benBloco.split('\n')[0] || "";

          inconsistencias.push({
            id: `orfao-atendimentoRN-${guideCounter}-${benLine}`,
            linha: benLine,
            tipo: "Erro Órfão",
            desc: `${prefix}Linha ${benLine}: Este elemento está órfão (<atendimentoRN> em <dadosBeneficiario>). Falta informar.`,
            original: origSnippet,
            sugestao: origSnippet ? `${origSnippet}${origSnippet.substring(0, origSnippet.search(/\S/))}  <${ns}atendimentoRN>N</${ns}atendimentoRN>` : `<${ns}atendimentoRN>N</${ns}atendimentoRN>`,
            seguro: origSnippet !== ""
          });
        }

        // Correção de tag <cpfContratado> indevida em <dadosBeneficiario> (deve ser <cpf>)
        const benCpfContratadoMatch = benBloco.match(/<(?:[^:]+:)?cpfContratado/i);
        if (benCpfContratadoMatch && benCpfContratadoMatch.index !== undefined) {
          const cpfOffset = matchStart + (benBlocoMatch.index || 0) + benCpfContratadoMatch.index;
          const cpfLine = localizador.linhaDe(cpfOffset);
          const linhaErrada = linhas[cpfLine - 1] || "";
          const linhaLimpa = linhaErrada.replace(/<(\/?)((?:[^:>]+:)?)cpfContratado(\s*\/?>|>)/g, '<$1$2cpf$3');

          inconsistencias.push({
            id: `xsd-ben-cpfcontratado-${guideCounter}-${cpfLine}`,
            linha: cpfLine,
            tipo: "XSD Schema",
            desc: `${prefix}Linha ${cpfLine}: Tag <cpfContratado> indevida em <dadosBeneficiario>. O padrão TISS exige <cpf>.`,
            original: linhaErrada,
            sugestao: linhaLimpa,
            seguro: true
          });
        }
      }


      // 4. <codigoTabela> dentro de <procedimento> em <dadosAtendimento>
      const procBlocoMatch = bloco.match(/<(?:[^:]+:)?procedimento(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?procedimento\s*>/i);
      if (procBlocoMatch) {
        const procBloco = procBlocoMatch[0];
        if (!/<(?:[^:]+:)?codigoTabela(?:\s[^>]*?)?>\s*[^<\s]+\s*<\/(?:[^:]+:)?codigoTabela\s*>/i.test(procBloco)) {
          const procOffset = matchStart + (procBlocoMatch.index || 0);
          const procLine = localizador.linhaDe(procOffset);
          
          // Match codigoProcedimento line inside procedimento
          const codProcMatch = procBloco.match(/<(?:[^:]+:)?codigoProcedimento/i);
          let targetLine = procLine;
          let origSnippet = "";
          if (codProcMatch && codProcMatch.index !== undefined) {
            targetLine = localizador.linhaDe(procOffset + codProcMatch.index);
            origSnippet = linhas[targetLine - 1] || "";
          }

          inconsistencias.push({
            id: `orfao-codigoTabela-${guideCounter}-${targetLine}`,
            linha: targetLine,
            tipo: "Erro Órfão",
            desc: `${prefix}Linha ${targetLine}: Este elemento está órfão (<codigoTabela> em <procedimento>). Falta informar.`,
            original: origSnippet || "[PROCEDIMENTO]",
            sugestao: origSnippet ? `${origSnippet.substring(0, origSnippet.search(/\S/))}<${ns}codigoTabela>22</${ns}codigoTabela>${origSnippet}` : `<${ns}codigoTabela>22</${ns}codigoTabela>`,
            seguro: origSnippet !== ""
          });
        }
      }

      // 5. <CNES> em <contratadoExecutante>
      const contBlocoMatch = bloco.match(/<(?:[^:]+:)?contratadoExecutante(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?contratadoExecutante\s*>/i);
      if (contBlocoMatch) {
        const contBloco = contBlocoMatch[0];
        if (!/<(?:[^:]+:)?CNES(?:\s[^>]*?)?>\s*[^<\s]+\s*<\/(?:[^:]+:)?CNES\s*>/i.test(contBloco)) {
          const contOffset = matchStart + (contBlocoMatch.index || 0);
          const contLine = localizador.linhaDe(contOffset);
          const origSnippet = contBloco.split('\n')[0] || "";

          inconsistencias.push({
            id: `orfao-CNES-${guideCounter}-${contLine}`,
            linha: contLine,
            tipo: "Erro Órfão",
            desc: `${prefix}Linha ${contLine}: Este elemento está órfão (<CNES> em <contratadoExecutante>). Falta informar.`,
            original: origSnippet,
            sugestao: origSnippet ? `${origSnippet}${origSnippet.substring(0, origSnippet.search(/\S/))}  <${ns}CNES>0000000</${ns}CNES>` : `<${ns}CNES>0000000</${ns}CNES>`,
            seguro: origSnippet !== ""
          });
        }
      }

      // 6. <tipoConsulta> em <dadosAtendimento>
      if (!/<(?:[^:]+:)?tipoConsulta(?:\s[^>]*?)?>\s*[^<\s]+\s*<\/(?:[^:]+:)?tipoConsulta\s*>/i.test(bloco)) {
        let procLine = linhaInicio;
        const procMatch = bloco.match(/<(?:[^:]+:)?(procedimento|dadosAtendimento|procedimentoExecutado)/i);
        if (procMatch && procMatch.index !== undefined) {
          procLine = localizador.linhaDe(matchStart + procMatch.index);
        }
        inconsistencias.push({
          id: `orfao-tipoconsulta-${guideCounter}-${procLine}`,
          linha: procLine,
          tipo: "Erro Órfão",
          desc: `${prefix}Linha ${procLine}: Este elemento está órfão (<tipoConsulta>). Falta informar.`,
          original: "[ELEMENTO AUSENTE]",
          sugestao: "",
          seguro: false
        });
      }
    } else if (ehSadt) {
      // 1. <atendimentoRN> e <cpf> em <dadosBeneficiario>
      const benBlocoMatch = bloco.match(/<(?:[^:]+:)?dadosBeneficiario(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?dadosBeneficiario\s*>/i);
      if (benBlocoMatch) {
        const benBloco = benBlocoMatch[0];
        if (!/<(?:[^:]+:)?atendimentoRN(?:\s[^>]*?)?>\s*[^<\s]+\s*<\/(?:[^:]+:)?atendimentoRN\s*>/i.test(benBloco)) {
          const benOffset = matchStart + (benBlocoMatch.index || 0);
          const benLine = localizador.linhaDe(benOffset);
          const origSnippet = benBloco.split('\n')[0] || "";

          inconsistencias.push({
            id: `orfao-sadt-atendimentoRN-${guideCounter}-${benLine}`,
            linha: benLine,
            tipo: "Erro Órfão",
            desc: `${prefix}Linha ${benLine}: Este elemento está órfão (<atendimentoRN> em <dadosBeneficiario>). Falta informar.`,
            original: origSnippet,
            sugestao: origSnippet ? `${origSnippet}${origSnippet.substring(0, origSnippet.search(/\S/))}  <${ns}atendimentoRN>N</${ns}atendimentoRN>` : `<${ns}atendimentoRN>N</${ns}atendimentoRN>`,
            seguro: origSnippet !== ""
          });
        }

        // Correção de tag <cpfContratado> indevida em <dadosBeneficiario> (deve ser <cpf>)
        const benCpfContratadoMatch = benBloco.match(/<(?:[^:]+:)?cpfContratado/i);
        if (benCpfContratadoMatch && benCpfContratadoMatch.index !== undefined) {
          const cpfOffset = matchStart + (benBlocoMatch.index || 0) + benCpfContratadoMatch.index;
          const cpfLine = localizador.linhaDe(cpfOffset);
          const linhaErrada = linhas[cpfLine - 1] || "";
          const linhaLimpa = linhaErrada.replace(/<(\/?)((?:[^:>]+:)?)cpfContratado(\s*\/?>|>)/g, '<$1$2cpf$3');

          inconsistencias.push({
            id: `xsd-sadt-ben-cpfcontratado-${guideCounter}-${cpfLine}`,
            linha: cpfLine,
            tipo: "XSD Schema",
            desc: `${prefix}Linha ${cpfLine}: Tag <cpfContratado> indevida em <dadosBeneficiario>. O padrão TISS exige <cpf>.`,
            original: linhaErrada,
            sugestao: linhaLimpa,
            seguro: true
          });
        }
      }

      // 2. <codigoTabela> em procedimentoExame/procedimento
      const procExameMatch = bloco.match(/<(?:[^:]+:)?(procedimentoExame|procedimento)(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?\1\s*>/i);
      if (procExameMatch) {
        const pBloco = procExameMatch[0];
        if (!/<(?:[^:]+:)?codigoTabela(?:\s[^>]*?)?>\s*[^<\s]+\s*<\/(?:[^:]+:)?codigoTabela\s*>/i.test(pBloco)) {
          const pOffset = matchStart + (procExameMatch.index || 0);
          const pLine = localizador.linhaDe(pOffset);
          const codProcMatch = pBloco.match(/<(?:[^:]+:)?codigoProcedimento/i);
          let targetLine = pLine;
          let origSnippet = "";
          if (codProcMatch && codProcMatch.index !== undefined) {
            targetLine = localizador.linhaDe(pOffset + codProcMatch.index);
            origSnippet = linhas[targetLine - 1] || "";
          }

          inconsistencias.push({
            id: `orfao-sadt-codigoTabela-${guideCounter}-${targetLine}`,
            linha: targetLine,
            tipo: "Erro Órfão",
            desc: `${prefix}Linha ${targetLine}: Este elemento está órfão (<codigoTabela> em procedimento). Falta informar.`,
            original: origSnippet || "[PROCEDIMENTO EXAME]",
            sugestao: origSnippet ? `${origSnippet.substring(0, origSnippet.search(/\S/))}<${ns}codigoTabela>22</${ns}codigoTabela>${origSnippet}` : `<${ns}codigoTabela>22</${ns}codigoTabela>`,
            seguro: origSnippet !== ""
          });
        }
      }
    } else if (ehHonorarioIndividual) {
      // NOVO — baseado no XSD oficial tissGuiasV4_03_00.xsd
      // (complexType ctm_honorarioIndividualGuia): a partir da versão
      // 4.03.00, o bloco <dadosInternacao> desta guia passou a exigir
      // <caraterAtendimento> (eletivo/urgência/emergência). Em
      // 4.01.00/4.02.00 esse elemento não existia nesse sub-bloco —
      // só havia <dataInicioFaturamento> e <dataFimFaturamento>. O gate
      // de versão evita falso positivo em lotes legítimos anteriores à
      // 4.03.00.
      if (regraAplicavel(versaoTiss, REGRAS_VERSIONADAS.caraterAtendimentoHonorarioIndividualObrigatoria)) {
        const dadosIntMatch = bloco.match(/<(?:[^:]+:)?dadosInternacao(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?dadosInternacao\s*>/i);
        if (dadosIntMatch) {
          const dadosIntBloco = dadosIntMatch[0];
          if (!/<(?:[^:]+:)?caraterAtendimento(?:\s[^>]*?)?>\s*[^<\s]+\s*<\/(?:[^:]+:)?caraterAtendimento\s*>/i.test(dadosIntBloco)) {
            const dadosIntOffset = matchStart + (dadosIntMatch.index || 0);
            const dadosIntLine = localizador.linhaDe(dadosIntOffset);
            const origSnippet = dadosIntBloco.split('\n')[0] || "";

            inconsistencias.push({
              id: `orfao-caraterAtendimento-honorInd-${guideCounter}-${dadosIntLine}`,
              linha: dadosIntLine,
              tipo: "Erro Órfão",
              desc: `${prefix}Linha ${dadosIntLine}: Este elemento está órfão (<caraterAtendimento> em <dadosInternacao>). Exigido pelo Padrão TISS a partir da versão 4.03.00 para Guia de Honorário Individual. Falta informar.`,
              original: origSnippet,
              // Classificação clínica/negocial (eletivo x urgência x emergência):
              // nunca inferir automaticamente, mesmo padrão já usado para
              // <indicacaoAcidente> e grau de participação acima.
              sugestao: "",
              seguro: false
            });
          }
        }
      }
    }
  }

  // Fallback for XMLs without standard guide wrapper tags
  if (valorConsulta === 0 && valorSadt === 0) {
    const isSadtOnly = /guia(?:SP-?)?SADT/i.test(conteudo) || conteudo.includes('procedimentoExame') || conteudo.includes('valorTotalGeral');
    if (isSadtOnly) {
      const vSadtAll = Array.from(conteudo.matchAll(/<(?:[^:]+:)?(?:valorTotalGeral|valorTotalGuia)(?:[^>]*)>\s*([0-9.,]+)\s*<\//ig))
        .map(m => parseFloat(m[1].replace(',', '.')) || 0);
      valorSadt = vSadtAll.reduce((a, b) => a + b, 0);
    } else {
      const vConsAll = Array.from(conteudo.matchAll(/<(?:[^:]+:)?(?:valorConsulta|valorTotal|valorProcedimento)(?:[^>]*)>\s*([0-9.,]+)\s*<\//ig))
        .map(m => parseFloat(m[1].replace(',', '.')) || 0);
      valorConsulta = vConsAll.reduce((a, b) => a + b, 0);
    }
  }

  
  // Tenta extrair os valores declarados no epílogo ou cabeçalho do lote (o que o CRM gerou)
  let totalDeclaradoLote = 0;
  let qtdGuiasDeclaradas = 0;
  
  const loteMatch = conteudo.match(/<(?:[^:]+:)?valorTotalLote(?:[^>]*)>\s*([0-9.,]+)\s*<\//i);
  if (loteMatch) {
    totalDeclaradoLote = parseFloat(loteMatch[1].replace(',', '.')) || 0;
  }
  
  const qtdMatch = conteudo.match(/<(?:[^:]+:)?(?:quantidadeGuias|qtdGuias)(?:[^>]*)>\s*([0-9]+)\s*<\//i);
  if (qtdMatch) {
    qtdGuiasDeclaradas = parseInt(qtdMatch[1], 10) || 0;
  }

  const totalLote = totalDeclaradoLote > 0 ? totalDeclaradoLote : (valorConsulta + valorSadt);

  // MÓDULO ESTRUTURAL UNIVERSAL (TODAS AS VERSÕES): Validação Robusta de Elementos Obrigatórios
  // Verifica a falta de tags mandatórias em todos os blocos principais
  
  const validateBlockElements = (regexBloco: RegExp, tagsObrigatorias: string[], nomeBloco: string) => {
    let matchBloco: RegExpExecArray | null;
    const regexClone = new RegExp(regexBloco.source, regexBloco.flags);
    while ((matchBloco = regexClone.exec(conteudo)) !== null) {
      const bloco = matchBloco[0];
      const linhaInicio = localizador.linhaDe(matchBloco.index);
      const gNum = getGuiaNumeroForLine(linhaInicio);
      const prefix = gNum ? `Guia no ${gNum} | ` : '';
      
      for (const tag of tagsObrigatorias) {
        // Testa se a tag existe e não está completamente vazia ou apenas com espaços/newlines
        const tagRegex = new RegExp(`<(?:[^:]+:)?${tag}(?:\\s[^>]*)?>([^<]+)<\\/(?:[^:]+:)?${tag}\\s*>`, 'i');
        const tagMatch = tagRegex.exec(bloco);
        
        if (!tagMatch || tagMatch[1].trim() === '') {
          // Identificar a linha exata onde a tag deveria estar ou a linha do fechamento do bloco
          let errLine = linhaInicio;
          // Procurar o fechamento do bloco para ancorar o erro mais próximo do final do elemento incompleto
          const fechamentoMatch = bloco.match(new RegExp(`<\\/(?:[^:]+:)?${nomeBloco.split(' ')[0]}`, 'i'));
          if (fechamentoMatch && fechamentoMatch.index !== undefined) {
             errLine = localizador.linhaDe(matchBloco.index + fechamentoMatch.index);
          }
          
          inconsistencias.push({
            id: `missing-${tag}-${errLine}-${matchBloco.index}`,
            linha: errLine,
            tipo: "Erro Estrutural",
            desc: `${prefix}Linha ${errLine}: Faltando elemento obrigatório. Falta informar <${tag}> no bloco ${nomeBloco}.`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "", // Precisa preenchimento manual
            seguro: false
          });
        }
      }
    }
  };

  // Aplica a validação universal nos principais blocos
  const blocosEquipeRegex = /<(?:[^:]+:)?equipeSadt(?:\s[^>]*?)?(?:\/>|>[\s\S]*?<\/(?:[^:]+:)?equipeSadt\s*>)/gi;
  validateBlockElements(blocosEquipeRegex, ['nomeProf', 'conselho', 'numeroConselhoProfissional', 'UF', 'CBOS'], 'equipeSadt');
  
  const profissionalSolicitanteRegex = /<(?:[^:]+:)?profissionalSolicitante(?:\s[^>]*?)?(?:\/>|>[\s\S]*?<\/(?:[^:]+:)?profissionalSolicitante\s*>)/gi;
  validateBlockElements(profissionalSolicitanteRegex, ['nomeProfissional', 'conselhoProfissional', 'numeroConselhoProfissional', 'UF', 'CBOS'], 'profissionalSolicitante');
  
  // MÓDULO ESTRUTURAL 1.5.1: Regras Específicas
  // O tipo de consulta é obrigatório se o tipo de atendimento for consulta (ex: 01)
  const dadosAtendimentoRegex = /<(?:[^:]+:)?dadosAtendimento(?:\s[^>]*?)?(?:\/>|>[\s\S]*?<\/(?:[^:]+:)?dadosAtendimento\s*>)/gi;
  let matchAtend: RegExpExecArray | null;
  while ((matchAtend = dadosAtendimentoRegex.exec(conteudo)) !== null) {
    const bloco = matchAtend[0];
    const tipoAtendimentoMatch = bloco.match(/<(?:[^:]+:)?tipoAtendimento(?:\s[^>]*)?>([^<]+)</i);
    if (tipoAtendimentoMatch && tipoAtendimentoMatch[1].trim() === '01') {
       const tipoConsultaMatch = bloco.match(/<(?:[^:]+:)?tipoConsulta(?:\s[^>]*)?>([^<]+)</i);
       if (!tipoConsultaMatch || tipoConsultaMatch[1].trim() === '') {
          const linha = localizador.linhaDe(matchAtend.index);
          const gNum = getGuiaNumeroForLine(linha);
          inconsistencias.push({
            id: `missing-tipoconsulta-${linha}-${matchAtend.index}`,
            linha: linha,
            tipo: "Erro Estrutural",
            desc: gNum ? `Guia no ${gNum} | Linha ${linha}: Faltando elemento obrigatório. Falta informar <tipoConsulta> em atendimento de consulta (01).` : `Linha ${linha}: Faltando <tipoConsulta>.`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "", 
            seguro: false
          });
       }
    }
  }

  // MÓDULO ESTRUTURAL 1.6: Validação de Procedimentos (viaAcesso, Equipe SADT) e Regras Específicas
  const regexProcedimentoExecutado = clonarRegex(REGEX_PROCEDIMENTO_EXECUTADO);
  let matchProcExec: RegExpExecArray | null;
  while ((matchProcExec = regexProcedimentoExecutado.exec(conteudo)) !== null) {
    const bloco = matchProcExec[0];
    const matchStart = matchProcExec.index;
    const procLine = localizador.linhaDe(matchStart);


    // Remover <valorProcedimento> que estiver dentro de <procedimento> (XSD Incompleta)
    const procTagMatch = bloco.match(/(<([^:]+:)?procedimento(?:[^>]*)>[\s\S]*?<\/([^:]+:)?procedimento>)/i);
    if (procTagMatch) {
       const procInner = procTagMatch[1];
       const regexValorProc = /(<([^:]+:)?valorProcedimento(?:[^>]*)>\s*[0-9.,]+\s*<\/([^:]+:)?valorProcedimento>)/gi;
       let vMatch;
       while ((vMatch = regexValorProc.exec(procInner)) !== null) {
          const fullInvalidTag = vMatch[1];
          const localMatchStart = matchStart + bloco.indexOf(procInner) + vMatch.index;
          const lineTarget = localizador.linhaDe(localMatchStart);
          const linesAround = conteudo.split('\n');
          const originalLine = linesAround[lineTarget - 1];
          
          inconsistencias.push({
            id: `estrutura-valorProcedimento-${lineTarget}-${localMatchStart}`,
            linha: lineTarget,
            tipo: "Erro Estrutural",
            desc: `Linha ${lineTarget}: A tag <valorProcedimento> não pertence ao bloco <procedimento>. O validador da operadora a rejeitará.`,
            original: originalLine && originalLine.includes(fullInvalidTag) ? originalLine : fullInvalidTag,
            sugestao: "",
            seguro: true
          });
       }
    }
    // Detectar código do procedimento
    const codProcMatch = bloco.match(/<(?:[^:]+:)?codigoProcedimento(?:[^>]*)>\s*(\d+)\s*<\//i);
    
    if (codProcMatch) {
      const gNum = getGuiaNumeroForLine(procLine);
      const prefix = gNum ? `Guia nº ${gNum} | ` : '';
      const cod = codProcMatch[1];
      const isSurgery = cod.startsWith('3');
      

      // Validação de codigoTabela (se presente e for CBHPM/TUSS, deve ser 22)
      const tabelaMatch = bloco.match(/<([^:]+:)?codigoTabela(?:[^>]*)>\s*(\d+)\s*<\/([^:]+:)?codigoTabela>/i);
      if (tabelaMatch) {
        const tabelaCode = tabelaMatch[2];
        if (tabelaCode !== '22') {
          const tissItem = getDescricaoProcedimentoTISS(cod);
          if (tissItem) {
             const originalLineMatch = bloco.match(new RegExp(`<([^:]+:)?codigoTabela(?:[^>]*)>\\s*${tabelaCode}\\s*<\\/([^:]+:)?codigoTabela>`, 'i'));
             if (originalLineMatch) {
                const lineTarget = localizador.linhaDe(matchStart + bloco.indexOf(originalLineMatch[0]));
                const nsTabela = originalLineMatch[1] || "";
                const tagFull = originalLineMatch[0];
                inconsistencias.push({
                  id: `tabela-invalida-${lineTarget}-${matchStart}`,
                  linha: lineTarget,
                  tipo: "Erro Regra",
                  desc: `${prefix}Linha ${lineTarget}: Código da Tabela informado (${tabelaCode}) não corresponde ao padrão do procedimento (${cod}). Use 22 para Tabela TUSS.`,
                  original: tagFull,
                  sugestao: `<${nsTabela}codigoTabela>22</${nsTabela}codigoTabela>`,
                  seguro: true
                });
             }
          }
        }
      }
      // 1. Falta de viaAcesso (Apenas para Cirurgias / Procedimentos Invasivos)
      if (isSurgery && !/<(?:[^:]+:)?viaAcesso/i.test(bloco)) {
        // Encontrar onde inserir viaAcesso (após quantidadeExecutada ou procedimento)
        const nsMatch = bloco.match(/<([^:]+:)?procedimentoExecutado/i);
        const ns = nsMatch ? (nsMatch[1] || "") : "";
        
        const qtdMatch = bloco.match(/(<\/(?:[^:]+:)?quantidadeExecutada\s*>)/i);
        const procEndMatch = bloco.match(/(<\/(?:[^:]+:)?procedimento\s*>)/i);
        
        let originalMatch = "";
        let lineTarget = procLine;
        
        if (qtdMatch) {
          originalMatch = qtdMatch[1];
          lineTarget = localizador.linhaDe(matchStart + bloco.indexOf(qtdMatch[1]));
        } else if (procEndMatch) {
          originalMatch = procEndMatch[1];
          lineTarget = localizador.linhaDe(matchStart + bloco.indexOf(procEndMatch[1]));
        }

        if (originalMatch) {
          inconsistencias.push({
            id: `orfao-viaacesso-${lineTarget}-${matchStart}`,
            linha: lineTarget,
            tipo: "Erro Regra",
            desc: `${prefix}Linha ${lineTarget}: Tag nao preenchida: _viaAcesso_ para o Procedimento: _${cod}_.`, // Alert for all procedures
            original: originalMatch,
            sugestao: `${originalMatch}              <${ns}viaAcesso>1</${ns}viaAcesso>`, // 1 = Única
            seguro: true
          });
        }
      }

      // 2. Erro de Equipe SADT e Grau de Participação (Glosas 1115 e 1159)
      const equipeMatch = bloco.match(/(^[ \t]*<(?:[^:]+:)?equipeSadt(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?equipeSadt\s*>)/im);
      if (equipeMatch) {
        const fullEquipeBloco = equipeMatch[1];
        const grauMatch = fullEquipeBloco.match(/<(?:[^:]+:)?grau(?:Part|Participacao)(?:[^>]*)>\s*(\d+)\s*<\//i);
        const grau = grauMatch ? grauMatch[1] : null;
        
        // Só considera inválido se for realmente incompatível: ex. "01" (Cirurgião)
        // atribuído a um procedimento QUE NÃO é cirurgia (cod não começa com "3").
        // "12" (Clínico) é válido tanto em cirurgia quanto em exame — NUNCA deve
        // disparar este alerta sozinho.
        if (grau === "01" && !isSurgery) {
          let lineTarget = procLine;
          const indexEquipe = bloco.search(/<(?:[^:]+:)?equipeSadt/i);
          if (indexEquipe !== -1) {
            lineTarget = localizador.linhaDe(matchStart + indexEquipe);
          }
          
          inconsistencias.push({
            id: `regra-equipesadt-${lineTarget}-${matchStart}`,
            linha: lineTarget,
            tipo: "Erro Regra",
            desc: `${prefix}Linha ${lineTarget}: Grau de Participação "01" (Cirurgião) atribuído a procedimento não-cirúrgico (código _${cod}_). Revise manualmente — não delete sem confirmar.`,
            original: fullEquipeBloco,
            sugestao: "", // proposital: sem correção automática
            seguro: false // CRÍTICO: nunca true para exclusão de bloco inteiro
          });
        }
      }

      // 2.1 Verificação de <tecnicaUtilizada> indevida em procedimentos não-cirúrgicos / exames SADT
      const tecMatch = bloco.match(/(^[ \t]*<(?:[^:]+:)?tecnicaUtilizada(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?tecnicaUtilizada\s*>)/im);
      if (tecMatch && !isSurgery) {
        let lineTarget = procLine;
        const indexTec = bloco.search(/<(?:[^:]+:)?tecnicaUtilizada/i);
        if (indexTec !== -1) {
          lineTarget = localizador.linhaDe(matchStart + indexTec);
        }
        inconsistencias.push({
          id: `regra-tecnicautilizada-${lineTarget}-${matchStart}`,
          linha: lineTarget,
          tipo: "Erro Regra",
          desc: `${prefix}Linha ${lineTarget}: Tag <tecnicaUtilizada> indevida para o procedimento não-cirúrgico _${cod}_. Recomenda-se remover.`,
          original: tecMatch[1],
          sugestao: "",
          seguro: true
        });
      }

      // 3. Validação de Tabela TISS (Código x Descrição)
      const descProcMatch = bloco.match(/<(?:[^:]+:)?descricaoProcedimento(?:[^>]*)>([^<]*)<\//i);
      if (descProcMatch) {
        const descInfo = descProcMatch[1];
        if (!isDescricaoValida(cod, descInfo)) {
          const descCorreta = getDescricaoProcedimentoTISS(cod);
          if (descCorreta) {
            let lineTarget = procLine;
            const indexDesc = bloco.search(/<(?:[^:]+:)?descricaoProcedimento/i);
            if (indexDesc !== -1) {
              lineTarget = localizador.linhaDe(matchStart + indexDesc);
            }
            
            const originalMatch = descProcMatch[0];
            const novaDescricao = originalMatch.replace(descInfo, descCorreta);
            
            inconsistencias.push({
              id: `tabela-tiss-desc-${lineTarget}-${matchStart}`,
              linha: lineTarget,
              tipo: "Erro Regra",
              desc: `${prefix}Linha ${lineTarget}: A descrição do procedimento não bate com a Tabela TISS oficial. Código: _${cod}_, Informado: _${descInfo}_, Correto: _${descCorreta}_.`,
              original: originalMatch,
              sugestao: novaDescricao,
              seguro: true
            });
          }
        }
      }

      // 4. Validação Matemática: Quantidade * Valor Unitário = Valor Total
      const qtdProcMatch = bloco.match(/<(?:[^:]+:)?quantidadeExecutada(?:[^>]*)>\s*([\d.,]+)\s*<\//i);
      const valUnitProcMatch = bloco.match(/<(?:[^:]+:)?valorUnitario(?:[^>]*)>\s*([\d.,]+)\s*<\//i);
      const valTotalProcMatch = bloco.match(/<(?:[^:]+:)?(?:valorTotal|valorProcedimento|valorTotalGeral)(?:[^>]*)>\s*([\d.,]+)\s*<\//i);
      
      if (qtdProcMatch && valUnitProcMatch && valTotalProcMatch) {
        // TISS usa ponto como separador decimal geralmente, mas vamos cobrir a vírgula também se vier mal formatado.
        const qStr = qtdProcMatch[1].replace(',', '.');
        const vUnitStr = valUnitProcMatch[1].replace(',', '.');
        const vTotStr = valTotalProcMatch[1].replace(',', '.');
        
        const q = parseFloat(qStr);
        const u = parseFloat(vUnitStr);
        const t = parseFloat(vTotStr);
        
        if (!isNaN(q) && !isNaN(u) && !isNaN(t)) {
          // O TISS define o valor total do procedimento primariamente como (Quantidade * Unitário).
          // Usamos toFixed(2) para evitar problemas de ponto flutuante, como 0.1 * 3 = 0.300000000004
          const esperado = (q * u).toFixed(2);
          const reportado = t.toFixed(2);
          
          if (esperado !== reportado) {
            let lineTarget = procLine;
            const indexTotal = bloco.search(/<(?:[^:]+:)?(?:valorTotal|valorProcedimento|valorTotalGeral)/i);
            if (indexTotal !== -1) {
              lineTarget = localizador.linhaDe(matchStart + indexTotal);
            }
            
            const originalMatch = valTotalProcMatch[0];
            const tagNome = valTotalProcMatch[0].match(/<(?:[^:]+:)?(valorTotal|valorProcedimento|valorTotalGeral)/i)?.[1] || "valorTotal";
            const tagNs = valTotalProcMatch[0].match(/<([^:]+:)?(?:valorTotal|valorProcedimento|valorTotalGeral)/i)?.[1] || "";
            const formatedEsperado = qStr.includes(',') || vUnitStr.includes(',') ? esperado.replace('.', ',') : esperado;
            
            let calcText = `Qtde: ${q} * Unitário: ${u}`;

            inconsistencias.push({
              id: `matematica-valor-${lineTarget}-${matchStart}`,
              linha: lineTarget,
              tipo: "Erro de Cálculo",
              desc: `${prefix}Linha ${lineTarget}: Valor Total incompatível com cálculo. (${calcText} = Total Esperado: ${esperado}, mas no XML está: ${reportado})`,
              original: originalMatch,
              sugestao: `<${tagNs}${tagNome}>${formatedEsperado}</${tagNs}${tagNome}>`,
              seguro: true
            });
          }
        }
      }

      // 5. Regras específicas por versão
      if (versaoTiss.startsWith("4.0")) {
        if (!/<(?:[^:]+:)?sequencialItem/i.test(bloco)) {
          inconsistencias.push({
            id: `v4-sequencialItem-${procLine}-${matchStart}`,
            linha: procLine,
            tipo: "Erro Estrutural",
            desc: `${prefix}Na versão ${versaoTiss}, a tag <sequencialItem> é exigida por alguns validadores para ordenar os procedimentos. Falta informar.`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "", 
            seguro: false
          });
        }
      }

      if (versaoTiss.startsWith("4.0")) {
        if (isSurgery && !/<(?:[^:]+:)?tecnicaUtilizada/i.test(bloco)) {
          inconsistencias.push({
            id: `v4-tecnicaUtilizada-${procLine}-${matchStart}`,
            linha: procLine,
            tipo: "Erro Regra",
            desc: `${prefix}Nas versões 4.0x.xx, alguns códigos cirúrgicos exigem a tag <tecnicaUtilizada>.`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "",
            seguro: false
          });
        }
      }
    }
  }

  // MÓDULO ESTRUTURAL 2: Elementos Órfãos (Multi-line / Vazios)
  const emptyTagRegex = /(?:^[ \t]+)?(?:<([a-zA-Z0-9_-]+:)?([a-zA-Z0-9_-]+)(?:\s+[^>]*)?>[\s]*<\/([^>]+)>|<([a-zA-Z0-9_-]+:)?([a-zA-Z0-9_-]+)(?:\s+[^>]*)?\s*\/>)(?:[ \t]*\r?)?/gm;
  let matchEmpty: RegExpExecArray | null;

  // Lista de tags obrigatórias do TISS que não podem ser enviadas vazias
  const mandatoryTags = [
    'numeroGuiaPrestador', 'numeroGuiaOperadora', 'senha', 
    'codigoProcedimento', 'valorTotal', 'valorProcedimentos', 
    'registroANS', 'codigoPrestadorNaOperadora', 'numeroCarteira',
    'nomeProfissional', 'conselhoProfissional', 'numeroConselhoProfissional',
    'CBOS', 'dataExecucao', 'horaInicial', 'horaFinal',
    'cnpjContratado', 'cpfContratado', 'codigoProfissional', 'codigoTabela'
  ];

  while ((matchEmpty = emptyTagRegex.exec(conteudo)) !== null) {
    if (matchEmpty[0].includes('?xml')) continue;

    const openNs = matchEmpty[1] || '';
    const openTag = matchEmpty[2] || '';
    const closeFull = matchEmpty[3] || '';
    const selfNs = matchEmpty[4] || '';
    const selfTag = matchEmpty[5] || '';

    let nomeTag = '';
    let tagNameWithoutNs = '';
    if (closeFull) {
      const expectedClose = openNs + openTag;
      if (closeFull.trim() !== expectedClose.trim() && closeFull.trim() !== openTag.trim()) {
        continue;
      }
      nomeTag = openNs + openTag;
      tagNameWithoutNs = openTag;
    } else {
      nomeTag = selfNs + selfTag;
      tagNameWithoutNs = selfTag;
    }

    if (!nomeTag) continue;

    // IGNORAR tags que não são estritamente mandatórias para evitar poluir a auditoria (falso positivo)
    if (!mandatoryTags.includes(tagNameWithoutNs)) continue;

    const linhaInicio = localizador.linhaDe(matchEmpty.index);
    const guiaNum = getGuiaNumeroForLine(linhaInicio);
    const prefix = guiaNum ? `Guia nº ${guiaNum} | ` : '';

    inconsistencias.push({
      id: `orfao-empty-tag-${linhaInicio}-${matchEmpty.index}`,
      linha: linhaInicio,
      tipo: "Erro Órfão",
      desc: `${prefix}Linha ${linhaInicio}: Este elemento está órfão (<${nomeTag}>). Falta informar.`,
      original: matchEmpty[0],
      sugestao: "",
      seguro: true
    });
  }

  // MÓDULO ESTRUTURAL 3: Validação do Schema <codProfissional> (Erro 5001)
  const regexCodProf = /(<([^:]+:)?codProfissional(?:\s+[^>]*)?(?:\/>|>([\s\S]*?)<\/\2codProfissional>))/gi;
  let matchCodProf: RegExpExecArray | null;
  while ((matchCodProf = regexCodProf.exec(conteudo)) !== null) {
    const bloco = matchCodProf[0];
    const isSelfClosing = bloco.trim().endsWith('/>');
    const conteudoInterno = isSelfClosing ? '' : (matchCodProf[3] ?? '');
    const matchStart = matchCodProf.index;
    const linhaInicio = localizador.linhaDe(matchStart);

    // Cenário A: Tag <codProfissional> vazia ou self-closing
    if (!conteudoInterno.trim()) {
      inconsistencias.push({
        id: `xsd-codprof-vazio-${linhaInicio}-${matchStart}`,
        linha: linhaInicio,
        tipo: "XSD Schema",
        desc: "Tag <codProfissional> vazia gera Erro 5001.",
        original: bloco.replace(/\n/g, ''),
        sugestao: "",
        seguro: false
      });
    } else {
      // Cenário B: Tag <codProfissional> possui filhos vazios ou sem identificador válido
      const hasCpf = /<[^:]*:?cpfContratado(?:\s+[^>]*)?>([\s\S]*?)<\/[^:]*:?cpfContratado>/i.exec(conteudoInterno);
      const hasCodPrestador = /<[^:]*:?codigoPrestadorNaOperadora(?:\s+[^>]*)?>([\s\S]*?)<\/[^:]*:?codigoPrestadorNaOperadora>/i.exec(conteudoInterno);
      const hasCodProfissional = /<[^:]*:?codigoProfissional(?:\s+[^>]*)?>([\s\S]*?)<\/[^:]*:?codigoProfissional>/i.exec(conteudoInterno);
      
      const isCpfEmpty = hasCpf && !hasCpf[1].trim();
      const isCodPrestadorEmpty = hasCodPrestador && !hasCodPrestador[1].trim();
      const isCodProfEmpty = hasCodProfissional && !hasCodProfissional[1].trim();
      const hasOnlySelfClosing = /<[^:]*:(?:cpfContratado|codigoPrestadorNaOperadora|codigoProfissional)(?:\s+[^>]*)?\s*\/>/i.test(conteudoInterno);

      if ((isCpfEmpty || isCodPrestadorEmpty || isCodProfEmpty || hasOnlySelfClosing) && !hasCpf?.[1]?.trim() && !hasCodPrestador?.[1]?.trim() && !hasCodProfissional?.[1]?.trim()) {
        inconsistencias.push({
          id: `xsd-codprof-ident-invalida-${linhaInicio}-${matchStart}`,
          linha: linhaInicio,
          tipo: "XSD Schema",
          desc: "Tag <codProfissional> sem identificador válido preenchido (cpfContratado ou codigoPrestadorNaOperadora vazio) gera Erro 5001.",
          original: bloco.replace(/\n/g, ''),
          sugestao: "",
          seguro: false
        });
      }
    }
  }

  // MÓDULO DE REGRAS XSD (Linha a Linha)
  linhas.forEach((linha, i) => {
    const numLinha = i + 1;

    // Erros estruturais: Linha em branco
    // XML nodes cannot be completely empty lines between nodes (mostly safe to remove for formatting)
    if (linha.trim() === '' && i > 0 && i < linhas.length - 1) {
      // Check if previous or next line indicate we are inside a multi-line string content, very basic heuristic
      const prev = linhas[i-1].trim();
      const next = linhas[i+1].trim();
      if ((prev.includes('>') && !prev.endsWith('>')) || (next.includes('<') && !next.startsWith('<'))) {
        // likely inside text node, do not remove
      } else {
        inconsistencias.push({
          id: `linha-vazia-${numLinha}`,
          linha: numLinha,
          tipo: "Erro Estrutural",
          desc: "Linha em branco detectada. Linhas em branco invalidam a validação estrutural em validadores e quebram a geração do hash TISS.",
          original: linha, // we match the original line, if we delete it we delete its newline character on applying
          sugestao: "", // Removendo a linha
          seguro: true
        });
      }
    }

    // Erros estruturais: Linha incompleta
    if (linha.includes('<') && !linha.includes('>')) {
      inconsistencias.push({
        id: `linha-incompleta-${numLinha}`,
        linha: numLinha,
        tipo: "Erro Estrutural",
        desc: "Linha incompleta mal formatada detectada (ex: sinal de menor `<` sem fechamento `>`).",
        original: linha,
        sugestao: linha + '>',
        seguro: false
      });
    }

    // Fator comercial 0.70
    if (linha.includes('>0.70<') && linha.includes('reducaoAcrescimo')) {
      inconsistencias.push({
        id: `aviso-fator-${numLinha}`,
        linha: numLinha,
        tipo: "Aviso",
        desc: "Fator comercial 0.70 (redução por cumulatividade ANS) — confirme que é intencional para esta guia antes de faturar.",
        original: linha,
        sugestao: "", // sem autocorreção
        seguro: false // CRÍTICO: nunca sobrescrever um valor de negócio válido automaticamente
      });
    }

    // Separador decimal ilegal (vírgula em valores XSD)
    if (/<(?:[^:]+:)?valor[^>]*>\d+,\d+<\//.test(linha)) {
      const linhaLimpa = linha.replace(/(<(?:[^:]+:)?valor[^>]*>)(\d+),(\d+)(<\/)/g, '$1$2.$3$4');
      inconsistencias.push({
        id: `xsd-virgula-${numLinha}`,
        linha: numLinha,
        tipo: "XSD Schema",
        desc: "Separador decimal ilegal (vírgula).",
        original: linha,
        sugestao: linhaLimpa,
        seguro: true
      });
    }

  });

  // MÓDULO HASH MD5 TISS
  const hashTagMatch = conteudo.match(/<((?:[^:>]+:)?hash)>([^<]+)<\/((?:[^:>]+:)?hash)>/i);
  if (hashTagMatch) {
    const hashInformado = hashTagMatch[2].trim();
    const possuiErroEstrutural = inconsistencias.some(i => i.tipo === "Erro Estrutural");

    if (possuiErroEstrutural) {
      const hashIndex = conteudo.indexOf(hashTagMatch[0]);
      const linhaHash = hashIndex !== -1 ? localizador.linhaDe(hashIndex) : 1;
      
      inconsistencias.push({
        id: `hash-bloqueado-${linhaHash}`,
        linha: linhaHash,
        tipo: "Erro Regra",
        desc: `Geração do Hash bloqueada devido a erros estruturais (ex: linhas em branco ou incompletas). Corrija as linhas defeituosas antes de recalcular o Hash. Hash informado: ${hashInformado}`,
        original: hashTagMatch[0],
        sugestao: hashTagMatch[0], // Não aplica a correção do hash, mantém o mesmo até corrigir
        seguro: false
      });
    } else {
      const { hashCalculado } = calcularHashMD5Tiss(conteudo);

      if (hashCalculado && hashInformado.toLowerCase() !== hashCalculado.toLowerCase()) {
        const hashIndex = conteudo.indexOf(hashTagMatch[0]);
        const linhaHash = hashIndex !== -1 ? localizador.linhaDe(hashIndex) : 1;
        const tagAbertura = hashTagMatch[1];
        const tagFechamento = hashTagMatch[3];

        inconsistencias.push({
          id: `hash-invalido-${linhaHash}`,
          linha: linhaHash,
          tipo: "Erro Regra",
          desc: `Hash MD5 divergente do padrão TISS ANS. Informado: ${hashInformado} | Calculado: ${hashCalculado}`,
          original: hashTagMatch[0],
          sugestao: `<${tagAbertura}>${hashCalculado}</${tagFechamento}>`,
          seguro: true
        });
      }
    }
  }

  // Extract Guides for isolated editing
  const guias = extrairGuias(conteudo);

  // MÓDULO ESTRUTURAL 3: Validação Matemática de Totais da Guia
  for (const guia of guias) {
    if (guia.procedimentos.length > 0) {
      let sumProcStr = 0;
      guia.procedimentos.forEach(p => {
        sumProcStr += parseFloat(p.valor.replace(',', '.')) || 0;
      });
      const expectedSum = sumProcStr.toFixed(2);
      
      const blocoGuia = conteudo.substring(guia.startIdx, guia.endIdx);
      const linhaGuia = localizador.linhaDe(guia.startIdx);
      
      const valProcMatch = blocoGuia.match(/<(?:[^:]+:)?valorProcedimentos(?:[^>]*)>\s*([\d.,]+)\s*<\//i);
      if (valProcMatch) {
        const reportedVal = parseFloat(valProcMatch[1].replace(',', '.')).toFixed(2);
        if (expectedSum !== reportedVal) {
          const indexTotal = blocoGuia.search(/<(?:[^:]+:)?valorProcedimentos/i);
          const lineTarget = indexTotal !== -1 ? localizador.linhaDe(guia.startIdx + indexTotal) : linhaGuia;
          
          const tagNome = valProcMatch[0].match(/<(?:[^:]+:)?(valorProcedimentos)/i)?.[1] || "valorProcedimentos";
          const tagNs = valProcMatch[0].match(/<([^:]+:)?(?:valorProcedimentos)/i)?.[1] || "";
          const formatedEsperado = valProcMatch[1].includes(',') ? expectedSum.replace('.', ',') : expectedSum;
          
          inconsistencias.push({
            id: `matematica-guia-${lineTarget}-${guia.id}`,
            linha: lineTarget,
            tipo: "Erro de Cálculo",
            desc: `Guia nº ${guia.guia || guia.id} | Linha ${lineTarget}: O valor total de procedimentos da guia está incorreto. A soma dos procedimentos é ${expectedSum}, mas no XML está: ${reportedVal}.`,
            original: valProcMatch[0],
            sugestao: `<${tagNs}${tagNome}>${formatedEsperado}</${tagNs}${tagNome}>`,
            seguro: true
          });
        }
      }

      const valTotalGeralMatch = blocoGuia.match(/<(?:[^:]+:)?valorTotalGeral(?:[^>]*)>\s*([\d.,]+)\s*<\//i);
      if (valTotalGeralMatch && valProcMatch) {
        const reportedTotalGeral = parseFloat(valTotalGeralMatch[1].replace(',', '.')).toFixed(2);
        // Assumindo que taxa/materiais/medicamentos estão corretos
        // novoTotalGeral = (TotalGeralAntigo - ValorProcAntigo) + NovoValorProc
        const diferenca = sumProcStr - parseFloat(valProcMatch[1].replace(',', '.'));
        const expectedTotalGeral = (parseFloat(valTotalGeralMatch[1].replace(',', '.')) + diferenca).toFixed(2);
           
        if (expectedTotalGeral !== reportedTotalGeral) {
           const indexTotal = blocoGuia.search(/<(?:[^:]+:)?valorTotalGeral/i);
           const lineTarget = indexTotal !== -1 ? localizador.linhaDe(guia.startIdx + indexTotal) : linhaGuia;
           
           const tagNome = valTotalGeralMatch[0].match(/<(?:[^:]+:)?(valorTotalGeral)/i)?.[1] || "valorTotalGeral";
           const tagNs = valTotalGeralMatch[0].match(/<([^:]+:)?(?:valorTotalGeral)/i)?.[1] || "";
           const formatedEsperado = valTotalGeralMatch[1].includes(',') ? expectedTotalGeral.replace('.', ',') : expectedTotalGeral;
           
           inconsistencias.push({
             id: `matematica-guiageral-${lineTarget}-${guia.id}`,
             linha: lineTarget,
             tipo: "Erro de Cálculo",
             desc: `Guia nº ${guia.guia || guia.id} | Linha ${lineTarget}: O valor total geral da guia está incorreto ou defasado. O total geral correto (re-somando procedimentos) deve ser ${expectedTotalGeral}, mas no XML está: ${reportedTotalGeral}.`,
             original: valTotalGeralMatch[0],
             sugestao: `<${tagNs}${tagNome}>${formatedEsperado}</${tagNs}${tagNome}>`,
             seguro: true
           });
        }
      }
    }
  }

  // Sort inconsistencies by line number ascending
  inconsistencias.sort((a, b) => a.linha - b.linha);

  return {
    versaoTiss,
    cnpjBase,
    totalLote,
    valorConsulta,
    valorSadt,
    inconsistencias,
    guias,
    qtdGuiasDeclaradas
  };
}

// Extrair guias com coordenadas exatas
