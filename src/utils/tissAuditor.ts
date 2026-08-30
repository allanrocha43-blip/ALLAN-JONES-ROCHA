import SparkMD5 from 'spark-md5';
import format from 'xml-formatter';
import { AuditResult, GuideItem, Inconsistency, ProcedimentoItem } from '../types/tiss';
import { isDescricaoValida, getDescricaoProcedimentoTISS } from './tabelaTiss';

const TIPOS_DE_GUIA = [
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

const REGEX_TODAS_GUIAS = new RegExp(
  `(<(?:[^:]+:)?(${TIPOS_GUIA_ALT})(?:\\s[^>]*?)?(?:\\/>|>[\\s\\S]*?<\\/(?:[^:]+:)?\\2\\s*>))`,
  'gi'
);


const REGEX_PROCEDIMENTO_EXECUTADO = /<(?:[^:]+:)?procedimentoExecutado(?:\s[^>]*?)?>[\s\S]*?<\/(?:[^:]+:)?procedimentoExecutado\s*>/gi;

const REGEX_BLOCO_PROCEDIMENTO = /(<(?:[^:]+:)?(procedimentoExame|procedimentoExecutado|procedimento)(?:\s[^>]*?)?(?:\/>|>[\s\S]*?<\/(?:[^:]+:)?\2\s*>))/gi;

class LocalizadorDeLinha {
  private offsets: number[];

  constructor(conteudo: string) {
    this.offsets = [];
    for (let i = 0; i < conteudo.length; i++) {
      if (conteudo.charCodeAt(i) === 10 /* '\n' */) this.offsets.push(i);
    }
  }

  // Busca binária: O(log n) por chamada, em vez de O(n)
  linhaDe(pos: number): number {
    let lo = 0, hi = this.offsets.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.offsets[mid] < pos) lo = mid + 1; else hi = mid;
    }
    return lo + 1;
  }
}

const mascararComentarios = (texto: string): string =>
  texto.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));

function stringParaBytesISO88591(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const codePoint = str.codePointAt(i) || str.charCodeAt(i);
    if (codePoint > 0xFF) {
      bytes[i] = 63; // 63 = '?', fallback p/ caractere fora do Latin-1
    } else {
      bytes[i] = codePoint;
    }
  }
  return bytes;
}

export function prepararParaExportacaoEHash(conteudo: string, eolOriginal?: string): Uint8Array {
  const comEolOriginal = eolOriginal === '\r\n' 
    ? conteudo.replace(/\r?\n/g, '\r\n') 
    : conteudo;
  return stringParaBytesISO88591(comEolOriginal);
}

export function executarAuditoriaDinamica(
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

  // Mascara comentários XML <!-- ... --> substituindo tudo exceto \n por espaços.
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
  const regexTodasGuias = new RegExp(REGEX_TODAS_GUIAS.source, REGEX_TODAS_GUIAS.flags);
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
  const regexTodasGuiasParaTotal = new RegExp(REGEX_TODAS_GUIAS.source, REGEX_TODAS_GUIAS.flags);
  let matchBloco: RegExpExecArray | null;
  let guideCounter = 0;

  while ((matchBloco = regexTodasGuiasParaTotal.exec(conteudo)) !== null) {
    guideCounter++;
    const bloco = matchBloco[0];
    const tipoGuiaAtual = matchBloco[2];
    const ehConsulta = /^guiaConsulta$/i.test(tipoGuiaAtual);
    const ehSadt = /^guia(?:SP-?)?SADT$/i.test(tipoGuiaAtual);
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

      // 2. <indicacaoAcidente> (Obrigatório no Padrão TISS 4.01.00 para guiaConsulta)
      if (!/<(?:[^:]+:)?indicacaoAcidente(?:\s[^>]*?)?>\s*[^<\s]+\s*<\/(?:[^:]+:)?indicacaoAcidente\s*>/i.test(bloco)) {
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
          sugestao: origSnippet ? `${origSnippet.substring(0, origSnippet.search(/\S/))}<${ns}indicacaoAcidente>9</${ns}indicacaoAcidente>\n${origSnippet}` : `<${ns}indicacaoAcidente>9</${ns}indicacaoAcidente>`,
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
            sugestao: origSnippet ? `${origSnippet}\n${origSnippet.substring(0, origSnippet.search(/\S/))}  <${ns}atendimentoRN>N</${ns}atendimentoRN>` : `<${ns}atendimentoRN>N</${ns}atendimentoRN>`,
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
            sugestao: origSnippet ? `${origSnippet.substring(0, origSnippet.search(/\S/))}<${ns}codigoTabela>22</${ns}codigoTabela>\n${origSnippet}` : `<${ns}codigoTabela>22</${ns}codigoTabela>`,
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
            sugestao: origSnippet ? `${origSnippet}\n${origSnippet.substring(0, origSnippet.search(/\S/))}  <${ns}CNES>0000000</${ns}CNES>` : `<${ns}CNES>0000000</${ns}CNES>`,
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
            sugestao: origSnippet ? `${origSnippet}\n${origSnippet.substring(0, origSnippet.search(/\S/))}  <${ns}atendimentoRN>N</${ns}atendimentoRN>` : `<${ns}atendimentoRN>N</${ns}atendimentoRN>`,
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
            sugestao: origSnippet ? `${origSnippet.substring(0, origSnippet.search(/\S/))}<${ns}codigoTabela>22</${ns}codigoTabela>\n${origSnippet}` : `<${ns}codigoTabela>22</${ns}codigoTabela>`,
            seguro: origSnippet !== ""
          });
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
  const regexProcedimentoExecutado = new RegExp(REGEX_PROCEDIMENTO_EXECUTADO.source, REGEX_PROCEDIMENTO_EXECUTADO.flags);
  let matchProcExec: RegExpExecArray | null;
  while ((matchProcExec = regexProcedimentoExecutado.exec(conteudo)) !== null) {
    const bloco = matchProcExec[0];
    const matchStart = matchProcExec.index;
    const procLine = localizador.linhaDe(matchStart);

    // Detectar código do procedimento
    const codProcMatch = bloco.match(/<(?:[^:]+:)?codigoProcedimento(?:[^>]*)>\s*(\d+)\s*<\//i);
    
    if (codProcMatch) {
      const gNum = getGuiaNumeroForLine(procLine);
      const prefix = gNum ? `Guia nº ${gNum} | ` : '';
      const cod = codProcMatch[1];
      const isSurgery = cod.startsWith('3');
      
      // 1. Falta de viaAcesso (Apenas para Cirurgias / Procedimentos Invasivos)
      if (!/<(?:[^:]+:)?viaAcesso/i.test(bloco)) {
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
            sugestao: `${originalMatch}\n              <${ns}viaAcesso>1</${ns}viaAcesso>`, // 1 = Única
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
  const emptyTagRegex = /(?:^[ \t]+)?(?:<([a-zA-Z0-9_-]+:)?([a-zA-Z0-9_-]+)(?:\s+[^>]*)?>[\s]*<\/([^>]+)>|<([a-zA-Z0-9_-]+:)?([a-zA-Z0-9_-]+)(?:\s+[^>]*)?\s*\/>)(?:[ \t]*\r?\n)?/gm;
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
function extrairGuias(conteudo: string): GuideItem[] {
  const guias: GuideItem[] = [];
  const regexTodasGuias = new RegExp(REGEX_TODAS_GUIAS.source, REGEX_TODAS_GUIAS.flags);
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
    const regexBlocoProcedimento = new RegExp(REGEX_BLOCO_PROCEDIMENTO.source, REGEX_BLOCO_PROCEDIMENTO.flags);
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

export function sincronizarProcedimento(
  conteudo: string,
  proc: ProcedimentoItem,
  novosDados: { codigo?: string; quantidade?: string; valorUnitario?: string; reducaoAcrescimo?: string; valor?: string; dataExecucao?: string }
): { novoConteudo: string; alterado: boolean } {
  let { startIdx, endIdx, codigo } = proc;

  const codigoMudou = novosDados.codigo !== undefined && novosDados.codigo !== proc.codigo;
  const dataExecucaoMudou = novosDados.dataExecucao !== undefined && novosDados.dataExecucao !== proc.dataExecucao;
  const quantidadeMudou = novosDados.quantidade !== undefined && novosDados.quantidade !== proc.quantidade;
  const valorUnitarioMudou = novosDados.valorUnitario !== undefined && novosDados.valorUnitario !== proc.valorUnitario;
  const reducaoAcrescimoMudou = novosDados.reducaoAcrescimo !== undefined && novosDados.reducaoAcrescimo !== proc.reducaoAcrescimo;
  const valorMudou = novosDados.valor !== undefined && novosDados.valor !== proc.valor;

  if (!codigoMudou && !quantidadeMudou && !valorUnitarioMudou && !reducaoAcrescimoMudou && !valorMudou && !dataExecucaoMudou) {
    return { novoConteudo: conteudo, alterado: false };
  }

  // Validação dinâmica se coordenadas ainda apontam para o procedimento
  let blocoAlvo = "";
  let coordenadasValidas = startIdx >= 0 && endIdx <= conteudo.length && startIdx < endIdx;
  if (coordenadasValidas) {
    const trecho = conteudo.substring(startIdx, endIdx);
    if (/<(?:[^:>]+:)?(?:procedimentoExame|procedimentoExecutado|procedimento)/i.test(trecho)) {
      blocoAlvo = trecho;
    } else {
      coordenadasValidas = false;
    }
  }

  // Recalculo dinâmico caso o conteúdo tenha sofrido mudanças estruturais prévias
  if (!coordenadasValidas) {
    const regexBlocoProcedimento = new RegExp(REGEX_BLOCO_PROCEDIMENTO.source, REGEX_BLOCO_PROCEDIMENTO.flags);
    let match: RegExpExecArray | null;
    while ((match = regexBlocoProcedimento.exec(conteudo)) !== null) {
      const b = match[1];
      const codNoBloco = (b.match(/<(?:[^:]+:)?codigoProcedimento(?:[^>]*)>([^<]*)<\//) || ['', ''])[1].trim();
      if (codigo && codNoBloco === codigo) {
        startIdx = match.index;
        endIdx = match.index + b.length;
        blocoAlvo = b;
        coordenadasValidas = true;
        break;
      }
    }
  }

  if (!coordenadasValidas || !blocoAlvo) {
    return { novoConteudo: conteudo, alterado: false };
  }

  let alterado = false;

  function replaceTagValue(bloco: string, tagName: string, newValue: string): string {
    let replaced = false;
    // Replace <tag>...</tag>
    const openCloseReg = new RegExp(`(<(?:[^:>]+:)?${tagName}(?:[^>]*)>)(.*?)(</(?:[^:>]+:)?${tagName}>)`, 'gi');
    if (openCloseReg.test(bloco)) {
      bloco = bloco.replace(openCloseReg, `$1${newValue}$3`);
      replaced = true;
    } else {
      // Replace self-closing <tag/>
      const selfCloseReg = new RegExp(`(<(?:[^:>]+:)?${tagName}(?:[^>]*?))\\s*/>`, 'gi');
      if (selfCloseReg.test(bloco)) {
        bloco = bloco.replace(selfCloseReg, (match, p1) => {
          const nameMatch = match.match(/<([^>/\s]+)/);
          const fullTagName = nameMatch ? nameMatch[1] : tagName;
          return `${p1}>${newValue}</${fullTagName}>`;
        });
        replaced = true;
      }
    }
    if (replaced) alterado = true;
    return bloco;
  }

  // 1. Sincronizar Código se alterado
  if (codigoMudou && novosDados.codigo !== undefined) {
    blocoAlvo = replaceTagValue(blocoAlvo, 'codigoProcedimento', novosDados.codigo);
  }

  // Sincronizar Quantidade
  if (quantidadeMudou && novosDados.quantidade !== undefined) {
    blocoAlvo = replaceTagValue(blocoAlvo, 'quantidadeExecutada', novosDados.quantidade.trim());
  }

  // Sincronizar Valor Unitario
  if (valorUnitarioMudou && novosDados.valorUnitario !== undefined) {
    blocoAlvo = replaceTagValue(blocoAlvo, 'valorUnitario', novosDados.valorUnitario.trim());
  }

  // Sincronizar ReducaoAcrescimo
  if (reducaoAcrescimoMudou && novosDados.reducaoAcrescimo !== undefined) {
    blocoAlvo = replaceTagValue(blocoAlvo, 'reducaoAcrescimo', novosDados.reducaoAcrescimo.trim());
  }

  // Sincronizar Data de Execução/Atendimento
  if (dataExecucaoMudou && novosDados.dataExecucao !== undefined) {
    const nData = novosDados.dataExecucao.trim();
    blocoAlvo = replaceTagValue(blocoAlvo, 'dataExecucao', nData);
    blocoAlvo = replaceTagValue(blocoAlvo, 'dataAtendimento', nData);
    blocoAlvo = replaceTagValue(blocoAlvo, 'data', nData);
  }

  // 2. Sincronizar Valor Total se alterado
  if (valorMudou && novosDados.valor !== undefined) {
    const nVal = novosDados.valor.trim();
    const oldAlterado = alterado;
    
    // Atualizar valorTotal, valorProcedimento, valorTotalGeral
    blocoAlvo = replaceTagValue(blocoAlvo, 'valorTotal', nVal);
    blocoAlvo = replaceTagValue(blocoAlvo, 'valorProcedimento', nVal);
    blocoAlvo = replaceTagValue(blocoAlvo, 'valorTotalGeral', nVal);

    if (alterado === oldAlterado) {
      // Nenhum foi substituído
      const closeProcMatch = blocoAlvo.match(/(<\/(?:[^:>]+:)?(?:procedimentoExame|procedimentoExecutado|procedimento)>)/i);
      if (closeProcMatch) {
        const tagFechamento = closeProcMatch[1];
        blocoAlvo = blocoAlvo.replace(tagFechamento, `<ans:valorProcedimento>${nVal}</ans:valorProcedimento>\n${tagFechamento}`);
        alterado = true;
      }
    }
  }

  if (alterado) {
    const result = conteudo.substring(0, startIdx) + blocoAlvo + conteudo.substring(endIdx);
    return { novoConteudo: result, alterado: true };
  }

  return { novoConteudo: conteudo, alterado: false };
}

// Sincronizar dados de uma guia no XML de forma isolada sem colateral
export function sincronizarDadosGuia(
  conteudo: string,
  guide: GuideItem,
  novosDados: { carteira: string; guia: string; senha: string; guiaPrestador: string }
): { novoConteudo: string; alterado: boolean } {
  let { startIdx, endIdx, carteira: o_c, guia: o_g, senha: o_s, guiaPrestador: o_cn } = guide;
  const { carteira: n_c, guia: n_g, senha: n_s, guiaPrestador: n_cn } = novosDados;

  // Verificação de desalinhamento: se as coordenadas não baterem mais com uma tag de guia
  let blocoAlvo = "";
  let coordenadasValidas = startIdx >= 0 && endIdx <= conteudo.length && startIdx < endIdx;

  if (coordenadasValidas) {
    const trecho = conteudo.substring(startIdx, endIdx);
    if (/<(?:[^:>]+:)?(?:guiaConsulta|guiaSP-SADT|guiaResumoInternacao|guiaHonorarioIndividual|guiaOdontologia)/i.test(trecho)) {
      blocoAlvo = trecho;
    } else {
      coordenadasValidas = false;
    }
  }

  // Recalculo dinâmico da posição ATUAL da guia sobre o xmlContent mais recente
  if (!coordenadasValidas) {
    const regexTodasGuias = new RegExp(REGEX_TODAS_GUIAS.source, REGEX_TODAS_GUIAS.flags);
    let match: RegExpExecArray | null;
    while ((match = regexTodasGuias.exec(conteudo)) !== null) {
      const b = match[1];
      const nGuia = (b.match(/<(?:[^:]+:)?numeroGuiaOperadora>([^<]*)</) || ['', ''])[1].trim();
      const nPrest = (b.match(/<(?:[^:]+:)?numeroGuiaPrestador>([^<]*)</) || ['', ''])[1].trim();
      const nCart = (b.match(/<(?:[^:]+:)?numeroCarteira>([^<]*)</) || ['', ''])[1].trim();

      if ((o_g && nGuia === o_g) || (o_cn && nPrest === o_cn) || (o_c && nCart === o_c)) {
        startIdx = match.index;
        endIdx = match.index + b.length;
        blocoAlvo = b;
        coordenadasValidas = true;
        break;
      }
    }
  }

  if (!coordenadasValidas || !blocoAlvo) {
    return { novoConteudo: conteudo, alterado: false };
  }

  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function swap(s: string, tag: string, oldVal: string, newVal: string): { result: string; changed: boolean } {
    if (oldVal === newVal) return { result: s, changed: false };
    
    if (oldVal !== "") {
      const padrao = new RegExp('(<([^:]+:)?' + tag + '>)(' + escapeRegExp(oldVal) + ')(</([^:]+:)?' + tag + '>)', 'g');
      const sNew = s.replace(padrao, `$1${newVal}$4`);
      return { result: sNew, changed: sNew !== s };
    } else {
      // Tags vazias
      const padraoVazio = new RegExp('(<([^:]+:)?' + tag + '>)\\s*(</([^:]+:)?' + tag + '>)', 'g');
      let sNew = s.replace(padraoVazio, `$1${newVal}$3`);
      if (sNew !== s) return { result: sNew, changed: true };

      const padraoSelf = new RegExp('<([^:]+:)?' + tag + '\\s*/>', 'g');
      sNew = s.replace(padraoSelf, (_, p1) => `<${p1 || ''}${tag}>${newVal}</${p1 || ''}${tag}>`);
      if (sNew !== s) return { result: sNew, changed: true };
    }
    return { result: s, changed: false };
  }

  let m1 = false, m2 = false, m3 = false, m4 = false;
  ({ result: blocoAlvo, changed: m1 } = swap(blocoAlvo, 'numeroCarteira', o_c, n_c));
  ({ result: blocoAlvo, changed: m2 } = swap(blocoAlvo, 'numeroGuiaOperadora', o_g, n_g));
  ({ result: blocoAlvo, changed: m3 } = swap(blocoAlvo, 'senha', o_s, n_s));
  ({ result: blocoAlvo, changed: m4 } = swap(blocoAlvo, 'numeroGuiaPrestador', o_cn, n_cn));

  if (m1 || m2 || m3 || m4) {
    const novoConteudo = conteudo.substring(0, startIdx) + blocoAlvo + conteudo.substring(endIdx);
    return { novoConteudo, alterado: true };
  }

  return { novoConteudo: conteudo, alterado: false };
}

// Motor Recursivo de Correção em Lote Segura
export function aplicarCorrecoesSegurasRecursivo(
  conteudo: string, 
  
): { novoConteudo: string; totalCorrigidos: number } {
  let currentContent = conteudo;
  let totalCorrigidosGlobal = 0;
  let iteracoes = 0;
  const MAX_ITERS = 5;

  while (iteracoes < MAX_ITERS) {
    iteracoes++;
    const audit = executarAuditoriaDinamica(currentContent);
    const errosSeguros = audit.inconsistencias.filter(e => e.seguro);

    if (errosSeguros.length === 0) break;

    // Sort descending by line so that structural shifts don't affect previous lines
    errosSeguros.sort((a, b) => b.linha - a.linha);
    
    let iterCorrigidos = 0;

    for (const erroTarget of errosSeguros) {
      const res = aplicarCorrecaoIndividual(currentContent, erroTarget);
      if (res.sucesso) {
        currentContent = res.novoConteudo;
        iterCorrigidos++;
      }
    }

    if (iterCorrigidos === 0) break;
    totalCorrigidosGlobal += iterCorrigidos;
  }

  return { novoConteudo: currentContent, totalCorrigidos: totalCorrigidosGlobal };
}

// Aplicar uma correção individual
export function aplicarCorrecaoIndividual(
  conteudo: string, 
  erro: Inconsistency
): { novoConteudo: string; sucesso: boolean } {
  const sugestaoVazia = !erro.sugestao || erro.sugestao.trim() === "";

  // Para erros estruturais multilinhas (como tags vazias que capturam o \n)
  if (sugestaoVazia && erro.original.includes('\n')) {
    if (conteudo.includes(erro.original)) {
      // First try to replace original + trailing newline to prevent empty lines
      if (conteudo.includes(erro.original + '\n')) {
        return { novoConteudo: conteudo.replace(erro.original + '\n', ''), sucesso: true };
      }
      return { novoConteudo: conteudo.replace(erro.original, ''), sucesso: true };
    }
  }

  const linhas = conteudo.split('\n');
  const idx = erro.linha - 1;

  if (idx >= 0 && idx < linhas.length && (linhas[idx] === erro.original || linhas[idx].trim() === erro.original.trim())) {
    if (sugestaoVazia) {
      // Linha substituída por vazia: remove para que a linha de baixo suba e preencha o espaço
      linhas.splice(idx, 1);
    } else {
      linhas[idx] = erro.sugestao;
    }
    return { novoConteudo: linhas.join('\n'), sucesso: true };
  } else {
    // Fallback pra replace global
    if (conteudo.includes(erro.original)) {
      if (sugestaoVazia) {
        if (conteudo.includes(erro.original + '\r\n')) {
          return { novoConteudo: conteudo.replace(erro.original + '\r\n', ''), sucesso: true };
        }
        if (conteudo.includes(erro.original + '\n')) {
          return { novoConteudo: conteudo.replace(erro.original + '\n', ''), sucesso: true };
        }
        if (conteudo.includes('\r\n' + erro.original)) {
          return { novoConteudo: conteudo.replace('\r\n' + erro.original, ''), sucesso: true };
        }
        if (conteudo.includes('\n' + erro.original)) {
          return { novoConteudo: conteudo.replace('\n' + erro.original, ''), sucesso: true };
        }
      }
      return { novoConteudo: conteudo.replace(erro.original, erro.sugestao), sucesso: true };
    }
  }
  return { novoConteudo: conteudo, sucesso: false };
}

// Calculador do Hash MD5 do Padrão ANS TISS (Regra Oficial da ANS)
export function calcularHashMD5Tiss(conteudo: string): { 
  hashCalculado: string | null; 
  stringConcatenada?: string; 
  erroMsg?: string 
} {
  if (!conteudo || !conteudo.trim()) {
    return { hashCalculado: null, erroMsg: "Conteúdo XML vazio." };
  }

  try {
    // 1. Remover comentários XML
    let semHash = conteudo.replace(/<!--[\s\S]*?-->/g, '');

    // 2. REGRA ANS TISS: Remover a própria tag <hash>...</hash> ou <ans:hash>...</ans:hash> antes de gerar o MD5
    semHash = semHash.replace(/<(?:[^:>]+:)?hash(?:\s*\/>|>[\s\S]*?<\/(?:[^:>]+:)?hash>)/gi, '');

    // Remove apenas os espaços entre as tags (indentação e quebras de linha puros da marcação XML)
    semHash = semHash.replace(/>\s+</g, '><');

    // 3. Extrair os valores de todas as tags (conteúdo entre > e <) de forma ordenada
    const matches: string[] = [];
    const regex = />([^<]+)</g;
    let m: RegExpExecArray | null;

    while ((m = regex.exec(semHash)) !== null) {
      const texto = m[1];
      if (texto.trim().length > 0) {
        matches.push(texto);
      }
    }

    if (matches.length === 0) {
      return { hashCalculado: null, erroMsg: "Nenhum valor de tag localizado no XML para cálculo do Hash." };
    }

    // 4. Concatenar todos os valores textuais preservando espaços internos e remover as margens da string unida
    const stringValores = matches.join('').trim();

    // 5. Encodar em Latin1 (ISO-8859-1) e calcular Hash MD5 conforme especificação oficial da ANS
    const bytesLatin1 = stringParaBytesISO88591(stringValores);
    const md5Hash = SparkMD5.ArrayBuffer.hash(bytesLatin1.buffer).toLowerCase();

    return { 
      hashCalculado: md5Hash, 
      stringConcatenada: stringValores 
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { hashCalculado: null, erroMsg: `Falha no cálculo do Hash: ${msg}` };
  }
}

// Gerador Criptográfico de Hash MD5 TISS ANS (Validação e Assinatura)
export function exportarXmlValidadoComHash(conteudo: string): { 
  novoConteudo: string; 
  hashCalculado: string | null; 
  sucesso: boolean; 
  erroMsg?: string 
} {
  // Limpeza de caracteres ASCII de controle inválidos em XML (0x00 - 0x1F, exceto tab, nl, cr)
  // Essencial para não quebrar o parser PHP do TISS da operadora
  const conteudoSanitizado = conteudo.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  const audit = executarAuditoriaDinamica(conteudoSanitizado);
  const possuiErroEstrutural = audit.inconsistencias.some(i => i.tipo === "Erro Estrutural");

  if (possuiErroEstrutural) {
    return {
      novoConteudo: conteudoSanitizado,
      hashCalculado: null,
      sucesso: false,
      erroMsg: "Falha na geração do Hash: O XML possui erros estruturais (ex: linhas em branco ou tags incompletas). Corrija a estrutura antes de gerar o Hash."
    };
  }

  const { hashCalculado, erroMsg } = calcularHashMD5Tiss(conteudoSanitizado);

  if (!hashCalculado) {
    return {
      novoConteudo: conteudoSanitizado,
      hashCalculado: null,
      sucesso: false,
      erroMsg: erroMsg || "Erro ao calcular Hash MD5."
    };
  }

  let conteudoFinal = conteudoSanitizado;

  // Substitui a tag <hash> ou <ns:hash> existente no XML mantendo seu namespace exato
  const hashTagMatch = conteudoFinal.match(/(<((?:[^:>]+:)?hash)>)(.*?)(<\/((?:[^:>]+:)?hash)>)/i);

  if (hashTagMatch) {
    const tagAbertura = hashTagMatch[1];
    const tagFechamento = hashTagMatch[4];
    conteudoFinal = conteudoFinal.replace(
      hashTagMatch[0],
      `${tagAbertura}${hashCalculado}${tagFechamento}`
    );
  } else {
    // Se não houver a tag <hash>, procura por <epilogo> para inserção
    const epilogoMatch = conteudoFinal.match(/(<((?:[^:>]+:)?epilogo)>)/i);
    if (epilogoMatch) {
      const epilogoTag = epilogoMatch[1];
      const prefixoNs = epilogoMatch[2].includes(':') ? epilogoMatch[2].split(':')[0] + ':' : '';
      const novaTagHash = `<${prefixoNs}hash>${hashCalculado}</${prefixoNs}hash>`;
      conteudoFinal = conteudoFinal.replace(epilogoTag, `${epilogoTag}\n    ${novaTagHash}`);
    } else {
      return {
        novoConteudo: conteudo,
        hashCalculado: hashCalculado,
        sucesso: false,
        erroMsg: "Erro Estrutural: A Tag <epilogo> não foi localizada para assinar o Hash."
      };
    }
  }

  return {
    novoConteudo: conteudoFinal,
    hashCalculado,
    sucesso: true
  };
}

// Formatação e Correção Estrutural do XML
export function formatarEHarmonizarXml(
  conteudo: string, 
  
): { novoConteudo: string; totalCorrigidos: number; sucesso: boolean; msg: string } {
  if (!conteudo || !conteudo.trim()) {
    return { novoConteudo: conteudo, totalCorrigidos: 0, sucesso: false, msg: "Conteúdo XML vazio." };
  }

  // 1. Corrige inconsistências de estrutura conhecidas (tags órfãs/vazias, vírgulas em números, etc.)
  const { novoConteudo: conteudoCorrigido, totalCorrigidos } = aplicarCorrecoesSegurasRecursivo(conteudo);

  // 2. Normaliza quebras de linha e limpa excesso de linhas vazias
  let xmlTrabalho = conteudoCorrigido.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Limpar linhas inteiramente vazias para que o xml-formatter não seja enganado e quebre os nós
  xmlTrabalho = xmlTrabalho.split('\n').filter(l => l.trim() !== '').join('\n');

  // 3. Formatação usando xml-formatter
  try {
    let formatted = format(xmlTrabalho, {
      indentation: '  ',
      collapseContent: true,
      lineSeparator: '\n',
      whiteSpaceAtEndOfSelfclosingTag: false,
    });
    
    // Fix: xml-formatter v3+ removes the newline after the XML declaration, which breaks many TISS validators.
    formatted = formatted.replace(/(<\?xml[^>]+>)\s*(<)/i, '$1\n$2');

    return {
      novoConteudo: formatted,
      totalCorrigidos,
      sucesso: true,
      msg: totalCorrigidos > 0 
        ? `✓ XML formatado e ${totalCorrigidos} erro(s) de estrutura corrigido(s)!`
        : `✓ XML formatado e identado com sucesso!`
    };
  } catch {
    // 4. Fallback de formatação linha a linha caso o parser encontre caracteres especiais ou sintaxe atípica
    try {
      const fallbackFormatted = formatarXmlFallbackLineByLine(xmlTrabalho);
      return {
        novoConteudo: fallbackFormatted,
        totalCorrigidos,
        sucesso: true,
        msg: totalCorrigidos > 0 
          ? `✓ XML formatado (motor seguro) e ${totalCorrigidos} erro(s) de estrutura corrigido(s)!`
          : `✓ XML formatado com sucesso!`
      };
    } catch {
      return {
        novoConteudo: xmlTrabalho,
        totalCorrigidos,
        sucesso: true,
        msg: totalCorrigidos > 0 
          ? `✓ ${totalCorrigidos} erro(s) de estrutura corrigido(s)!`
          : `✓ Estrutura mantida sem alterações.`
      };
    }
  }
}

function formatarXmlFallbackLineByLine(xml: string): string {
  // Replace only >< with >\n< to avoid breaking values
  let reg = /(>)\s*(<)(\/*)/g;
  let xmlClean = xml.replace(reg, '$1\n$2$3');
  let pad = 0;
  const lines = xmlClean.split('\n');
  let formatted = '';

  lines.forEach((line) => {
    let indent = 0;
    const trimmed = line.trim();
    if (!trimmed) return;

    // Se é uma tag de fechamento completa: </algumaCoisa>
    if (trimmed.match(/^<\/[^>]+>$/)) {
      if (pad !== 0) pad -= 1;
      indent = 0;
    } 
    // Se é uma tag de abertura pura sem fechamento na mesma linha: <algumaCoisa>
    else if (trimmed.match(/^<[^>?!/]+>$/) && !trimmed.startsWith('<?xml')) {
      indent = 1;
    } 
    // Se é tag vazia: <algumaCoisa/> ou tag com conteúdo: <tag>valor</tag>
    else {
      indent = 0;
    }

    let padding = '';
    for (let i = 0; i < pad; i++) {
      padding += '  ';
    }

    formatted += padding + trimmed + '\n';
    pad += indent;
  });

  return formatted.trim();
}

export function formatXmlBruto(xml: string): string {
  try {
    let xmlTrabalho = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    xmlTrabalho = xmlTrabalho.split('\n').filter(l => l.trim() !== '').join('\n');
    let formatted = format(xmlTrabalho, {
      indentation: '  ',
      collapseContent: true,
      lineSeparator: '\n',
      whiteSpaceAtEndOfSelfclosingTag: true
    });
    if (formatted.startsWith('<?xml') && !formatted.includes('<?xml version="1.0" encoding="ISO-8859-1"?>\n')) {
      formatted = formatted.replace(/(<\?xml[^>]+>)/, '$1\n');
    }
    return formatted;
  } catch (e) {
    return xml;
  }
}
