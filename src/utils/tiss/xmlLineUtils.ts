/**
 * xmlLineUtils.ts
 * -----------------------------------------------------------------------
 * Utilitários de baixo nível, sem dependência de regras de negócio TISS.
 * Extraído de tissAuditor.ts (SRP - Single Responsibility Principle):
 * este módulo só sabe "ler texto e mapear posições/bytes", nada sobre
 * guias, procedimentos ou o padrão TISS em si.
 */

/** Localiza rapidamente (O(log n)) o número da linha (1-based) para um offset de caractere. */
export class LocalizadorDeLinha {
  private offsets: number[];

  constructor(conteudo: string) {
    this.offsets = [];
    for (let i = 0; i < conteudo.length; i++) {
      if (conteudo.charCodeAt(i) === 10 /* '\n' */) this.offsets.push(i);
    }
  }

  linhaDe(pos: number): number {
    let lo = 0, hi = this.offsets.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.offsets[mid] < pos) lo = mid + 1; else hi = mid;
    }
    return lo + 1;
  }
}

/** Mascara comentários XML <!-- ... --> substituindo tudo exceto \n por espaços, preservando offsets/linhas. */
export const mascararComentarios = (texto: string): string =>
  texto.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));

/**
 * Converte uma string JS (UTF-16) para bytes Latin-1 (ISO-8859-1), exigência
 * do hash MD5 oficial da ANS.
 *
 * CORREÇÃO DE BUG (achado na auditoria original): a versão anterior misturava
 * `str.codePointAt(i)` (ciente de pares substitutos/surrogate pairs, que
 * "enxerga" 2 code units como 1 caractere) com um laço que sempre incrementa
 * `i` em 1 (por code unit). Isso fazia um único caractere fora do BMP (raro
 * em TISS, mas possível em nomes de pacientes com emoji/símbolos exóticos
 * colados por erro de digitação) gerar DOIS bytes de fallback '?' em vez de
 * um, desalinhando o tamanho do buffer e potencialmente o hash calculado.
 * Como iteramos por code unit (não por code point), o correto é usar
 * `charCodeAt` de forma consistente — mantém 1 byte de saída por 1 code unit
 * de entrada, que é o que o restante do motor (baseado em offsets de string)
 * espera.
 */
export function stringParaBytesISO88591(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const codeUnit = str.charCodeAt(i);
    bytes[i] = codeUnit > 0xFF ? 63 /* '?' fallback p/ fora do Latin-1 */ : codeUnit;
  }
  return bytes;
}

export function prepararParaExportacaoEHash(conteudo: string, eolOriginal?: string): Uint8Array {
  const comEolOriginal = eolOriginal === '\r\n'
    ? conteudo.replace(/\r?\n/g, '\r\n')
    : conteudo;
  return stringParaBytesISO88591(comEolOriginal);
}
