import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import {
  detectarPrefixoNamespace,
  detectarTagPai,
  tissCompletionSource,
} from './tissAutocomplete';

function queryCompletion(docWithCursor: string, explicit = false) {
  const cursorMarker = '|';
  const pos = docWithCursor.indexOf(cursorMarker);
  if (pos === -1) {
    throw new Error('Cursor marker "|" not found in test fixture');
  }
  const doc = docWithCursor.slice(0, pos) + docWithCursor.slice(pos + 1);
  const state = EditorState.create({ doc });
  const ctx = new CompletionContext(state, pos, explicit);
  return tissCompletionSource(ctx);
}

describe('tissAutocomplete', () => {
  it('detecta prefixo de namespace ans:, tiss: ou vazio corretamente', () => {
    expect(
      detectarPrefixoNamespace('<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">')
    ).toBe('ans:');
    expect(
      detectarPrefixoNamespace('<tiss:mensagemTISS xmlns:tiss="http://www.ans.gov.br/padroes/tiss/schemas">')
    ).toBe('tiss:');
    expect(
      detectarPrefixoNamespace('<mensagemTISS xmlns="http://www.ans.gov.br/padroes/tiss/schemas">')
    ).toBe('');
  });

  it('identifica a tag pai correta na pilha XML ignorando comentários e tags fechadas', () => {
    const doc = [
      '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">',
      '  <!-- <ans:ignorarComentario> -->',
      '  <ans:prestadorParaOperadora>',
      '    <ans:loteGuias>',
      '      <ans:numeroLote>123</ans:numeroLote>',
      '      <ans:guiasTISS>',
      '        <ans:guiaSP-SADT>',
      '          <ans:procedimentosExecutados>',
      '            <ans:procedimentoExecutado>',
      '              <',
    ].join('\n');

    expect(detectarTagPai(doc, doc.length - 1)).toBe('procedimentoExecutado');
  });

  it('sugere tags filhas de <procedimentoExecutado> com prefixo ans: ao digitar "<"', () => {
    const fixture = [
      '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">',
      '  <ans:procedimentosExecutados>',
      '    <ans:procedimentoExecutado>',
      '      <|',
      '    </ans:procedimentoExecutado>',
      '  </ans:procedimentosExecutados>',
      '</ans:mensagemTISS>',
    ].join('\n');

    const result = queryCompletion(fixture);
    expect(result).not.toBeNull();
    const labels = result!.options.map((o) => o.label);
    expect(labels).toContain('<ans:sequencialItem>');
    expect(labels).toContain('<ans:dataExecucao>');
    expect(labels).toContain('<ans:procedimento>');
    expect(labels).toContain('<ans:valorUnitario>');
    expect(labels).toContain('<ans:equipeSadt (bloco completo)');
  });

  it('sugere blocos completos de guiaConsulta e guiaSP-SADT dentro de <guiasTISS>', () => {
    const fixture = [
      '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">',
      '  <ans:guiasTISS>',
      '    <|',
      '  </ans:guiasTISS>',
      '</ans:mensagemTISS>',
    ].join('\n');

    const result = queryCompletion(fixture);
    expect(result).not.toBeNull();
    const labels = result!.options.map((o) => o.label);
    expect(labels).toContain('<ans:guiaConsulta (bloco completo)');
    expect(labels).toContain('<ans:guiaSP-SADT (bloco completo)');
  });

  it('sugere domínios oficiais (dm_*) dentro de tags como <codigoTabela> e <conselhoProfissional>', () => {
    const tabelaResult = queryCompletion('<ans:codigoTabela>|</ans:codigoTabela>', true);
    expect(tabelaResult).not.toBeNull();
    const tabelaValues = tabelaResult!.options.map((o) => o.label);
    expect(tabelaValues).toEqual(expect.arrayContaining(['22', '18', '19', '20', '90', '98', '00']));

    const conselhoResult = queryCompletion('<conselhoProfissional>0|</conselhoProfissional>');
    expect(conselhoResult).not.toBeNull();
    expect(conselhoResult!.options.some((o) => o.label === '06')).toBe(true);
  });

  it('pesquisa procedimentos TUSS/CBHPM por descrição ou código dentro de <codigoProcedimento>', () => {
    const byDesc = queryCompletion('<ans:codigoProcedimento>facectomia|</ans:codigoProcedimento>');
    expect(byDesc).not.toBeNull();
    expect(byDesc!.options.some((o) => o.label === '30306027')).toBe(true);
    expect(byDesc!.filter).toBe(false);

    const byCode = queryCompletion('<codigoProcedimento>10101012|</codigoProcedimento>');
    expect(byCode).not.toBeNull();
    expect(byCode!.options.some((o) => o.label === '10101012')).toBe(true);
  });

  it('oferece tags permitidas e snippets via acionamento explícito (Ctrl+Espaço) em linha em branco', () => {
    const fixture = [
      '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">',
      '  <ans:dadosAtendimento>',
      '    |',
      '  </ans:dadosAtendimento>',
      '</ans:mensagemTISS>',
    ].join('\n');

    const result = queryCompletion(fixture, true);
    expect(result).not.toBeNull();
    const labels = result!.options.map((o) => o.label);
    expect(labels).toContain('<ans:tipoAtendimento>');
    expect(labels).toContain('<ans:indicacaoAcidente>');
    expect(labels).toContain('<ans:tipoConsulta>');
    expect(labels).toContain('<ans:regimeAtendimento>');
  });
});
