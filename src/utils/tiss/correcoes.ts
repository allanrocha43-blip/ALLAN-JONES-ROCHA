/**
 * correcoes.ts
 * -----------------------------------------------------------------------
 * Responsabilidade única: aplicar correções no texto XML (edição pontual
 * de tags, sincronização de campos editados na UI, motor recursivo de
 * "corrigir tudo que é seguro"). Não decide o que é uma inconsistência —
 * isso é responsabilidade de `auditoria.ts`; este módulo só sabe "como
 * reescrever o texto" dado um erro ou uma edição já decidida.
 */

import { Inconsistency, GuideItem, ProcedimentoItem } from '../../types/tiss';
import { REGEX_TODAS_GUIAS, REGEX_BLOCO_PROCEDIMENTO, clonarRegex } from './regexPatterns';
import { executarAuditoriaDinamica } from './auditoria';

export function sincronizarProcedimento(
  conteudo: string,
  proc: ProcedimentoItem,
  novosDados: { codigo?: string; quantidade?: string; valorUnitario?: string; reducaoAcrescimo?: string; valor?: string; dataExecucao?: string }
): { novoConteudo: string; alterado: boolean } {
  // --- Limpeza de Estruturas Corrompidas (Bug Anterior) ---
  // Se o XML já possuir tags <valorTotal> injetadas incorretamente DEPOIS de <equipeSadt> ou como duplicatas, remove-as globalmente antes de processar
  const cleanedConteudo = conteudo.replace(/(<(?:[^:>]+:)?equipeSadt(?:[^>]*)>(?:[\s\S]*?)<\/(?:[^:>]+:)?equipeSadt>)\s*(<(?:[^:>]+:)?valorTotal(?:[^>]*)>.*?<\/(?:[^:>]+:)?valorTotal>\s*)+/gi, "$1");
  if (cleanedConteudo !== conteudo) {
    // Se houve limpeza, precisamos re-localizar o bloco do procedimento para evitar desalinhamento de coordenadas
    conteudo = cleanedConteudo;
    proc.startIdx = -1; // Força re-localização
  }

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
    const regexBlocoProcedimento = clonarRegex(REGEX_BLOCO_PROCEDIMENTO);
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

  function replaceTagValue(bloco: string, tagName: string, newValue: string): { novoBloco: string, replaced: boolean } {
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
    return { novoBloco: bloco, replaced };
  }

  // Helper to apply replace
  function applyReplace(tagName: string, newValue: string): boolean {
    const { novoBloco, replaced } = replaceTagValue(blocoAlvo, tagName, newValue);
    if (replaced) {
      blocoAlvo = novoBloco;
      alterado = true;
    }
    return replaced;
  }

  // 1. Sincronizar Código se alterado
  if (codigoMudou && novosDados.codigo !== undefined) {
    applyReplace('codigoProcedimento', novosDados.codigo);
  }

  // Sincronizar Quantidade
  if (quantidadeMudou && novosDados.quantidade !== undefined) {
    applyReplace('quantidadeExecutada', novosDados.quantidade.trim());
  }

  // Sincronizar Valor Unitario
  if (valorUnitarioMudou && novosDados.valorUnitario !== undefined) {
    applyReplace('valorUnitario', novosDados.valorUnitario.trim());
  }

  // Sincronizar ReducaoAcrescimo
  if (reducaoAcrescimoMudou && novosDados.reducaoAcrescimo !== undefined) {
    applyReplace('reducaoAcrescimo', novosDados.reducaoAcrescimo.trim());
  }

  // Sincronizar Data de Execução/Atendimento
  if (dataExecucaoMudou && novosDados.dataExecucao !== undefined) {
    const nData = novosDados.dataExecucao.trim();
    applyReplace('dataExecucao', nData);
    applyReplace('dataAtendimento', nData);
    applyReplace('data', nData);
  }

  // 2. Sincronizar Valor Total se alterado
  if (valorMudou && novosDados.valor !== undefined) {
    const nVal = novosDados.valor.trim();
    
    // Atualizar valorTotal, valorProcedimento, valorTotalGeral, valorConsulta
    const rep1 = applyReplace('valorTotal', nVal);
    const rep2 = applyReplace('valorProcedimento', nVal); // Usado em Odontologia
    const rep3 = applyReplace('valorTotalGeral', nVal);
    const rep4 = applyReplace('valorConsulta', nVal); // Usado em Consulta

    const anyReplaced = rep1 || rep2 || rep3 || rep4;

    if (!anyReplaced) {
      // Nenhum foi substituído. Injetar tag de valor apenas se não for guia de consulta (que usa tag externa ao bloco de procedimento)
      const closeProcMatch = blocoAlvo.match(/(<\/(?:[^:>]+:)?(?:procedimentoExame|procedimentoExecutado)>)/i);
      if (closeProcMatch) {
        const tagFechamento = closeProcMatch[1];
        // Descobrir o prefixo de namespace (ex: "ans:")
        const nsMatch = tagFechamento.match(/<\/(.*?):/);
        const prefix = nsMatch ? `${nsMatch[1]}:` : 'ans:';
        
        // Em TISS 04.01.00, <valorTotal> deve vir ANTES de <equipeSadt>.
        const equipeSadtMatch = blocoAlvo.match(/(<(?:[^:>]+:)?equipeSadt[^>]*>)/i);
        if (equipeSadtMatch) {
           blocoAlvo = blocoAlvo.replace(equipeSadtMatch[1], `<${prefix}valorTotal>${nVal}</${prefix}valorTotal>\n${equipeSadtMatch[1]}`);
        } else {
           blocoAlvo = blocoAlvo.replace(tagFechamento, `<${prefix}valorTotal>${nVal}</${prefix}valorTotal>\n${tagFechamento}`);
        }
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
    const regexTodasGuias = clonarRegex(REGEX_TODAS_GUIAS);
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
    // Fallback pra replace global (apenas se original for uma string não-vazia para não corromper o texto)
    if (erro.original && erro.original.trim() !== "" && conteudo.includes(erro.original)) {
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

