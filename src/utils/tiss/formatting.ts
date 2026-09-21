/**
 * formatting.ts
 * -----------------------------------------------------------------------
 * Responsabilidade única: indentação/formatação do XML e correção
 * estrutural em lote antes de formatar. Depende de `correcoes.ts` para o
 * passo de correção automática.
 */

import format from 'xml-formatter';
import { aplicarCorrecoesSegurasRecursivo } from './correcoes';

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
  // Normalize newlines
  let xmlClean = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Collapse whitespace between tags: >\s+< -> >\n<
  xmlClean = xmlClean.replace(/>\s*</g, '>\n<');

  let pad = 0;
  const lines = xmlClean.split('\n');
  let formatted = '';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Declarations, processing instructions, comments: <?xml ... ?>, <!-- ... -->
    if (trimmed.startsWith('<?') || trimmed.startsWith('<!--') || trimmed.startsWith('<!DOCTYPE')) {
      formatted += trimmed + '\n';
      continue;
    }

    // Closing tag: </tag>
    if (/^<\/[^>]+>$/.test(trimmed)) {
      if (pad > 0) pad -= 1;
      formatted += '  '.repeat(pad) + trimmed + '\n';
    }
    // Self-closing tag: <tag ... /> or single-line complete tag: <tag>content</tag>
    else if (/\/>$/.test(trimmed) || /<([^:>]+:)?([^>\s/]+)[^>]*>.*<\/\1?\2>$/s.test(trimmed)) {
      formatted += '  '.repeat(pad) + trimmed + '\n';
    }
    // Opening tag without closing on the same line: <tag ...>
    else if (/^<[^/][^>]*>/.test(trimmed)) {
      formatted += '  '.repeat(pad) + trimmed + '\n';
      pad += 1;
    }
    // Text content or other line
    else {
      formatted += '  '.repeat(pad) + trimmed + '\n';
    }
  }

  return formatted.trim();
}

export function formatXmlBruto(xml: string): string {
  if (!xml || !xml.trim()) return xml;
  try {
    let xmlTrabalho = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    xmlTrabalho = xmlTrabalho.split('\n').filter(l => l.trim() !== '').join('\n');
    let formatted = format(xmlTrabalho, {
      indentation: '  ',
      collapseContent: true,
      lineSeparator: '\n',
      whiteSpaceAtEndOfSelfclosingTag: false
    });
    // Ensure newline after <?xml ... ?>
    formatted = formatted.replace(/(<\?xml[^>]+>)\s*(<)/i, '$1\n$2');
    return formatted;
  } catch (e) {
    try {
      return formatarXmlFallbackLineByLine(xml);
    } catch {
      return xml;
    }
  }
}
