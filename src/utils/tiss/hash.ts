/**
 * hash.ts
 * -----------------------------------------------------------------------
 * Responsabilidade única: cálculo e gravação do hash MD5 oficial da ANS
 * (regra: concatenar valores de tag em ordem, codificar em Latin-1, MD5).
 */

import SparkMD5 from 'spark-md5';
import { executarAuditoriaDinamica } from './auditoria';

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

    // 5. Encodar em UTF-8 (conforme apontado pelo validador TISS) e calcular Hash MD5
    const md5Hash = SparkMD5.hash(stringValores).toLowerCase();

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
  let conteudoSanitizado = conteudo.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Limpeza Estrutural: Remover tags <valorTotal> inseridas erroneamente após <equipeSadt>
  conteudoSanitizado = conteudoSanitizado.replace(/(<(?:[^:>]+:)?equipeSadt(?:[^>]*)>(?:[\s\S]*?)<\/(?:[^:>]+:)?equipeSadt>)\s*(<(?:[^:>]+:)?valorTotal(?:[^>]*)>.*?<\/(?:[^:>]+:)?valorTotal>\s*)+/gi, "$1");
  // Limpeza Estrutural: Remover tags <valorTotal> duplicadas no final do bloco <procedimentoExecutado> (caso não haja equipeSadt)
  conteudoSanitizado = conteudoSanitizado.replace(/(<(?:[^:>]+:)?valorTotal(?:[^>]*)>.*?<\/(?:[^:>]+:)?valorTotal>\s*)+<\/(?:[^:>]+:)?procedimentoExecutado>/gi, (match) => {
    // Mantém apenas um valorTotal no final se houver múltiplos antes do fechamento
    const tagVal = match.match(/(<(?:[^:>]+:)?valorTotal(?:[^>]*)>.*?<\/(?:[^:>]+:)?valorTotal>)/i);
    const tagClose = match.match(/(<\/(?:[^:>]+:)?procedimentoExecutado>)/i);
    return tagVal && tagClose ? `${tagVal[1]}\n${tagClose[1]}` : match;
  });

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

