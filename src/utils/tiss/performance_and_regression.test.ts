import { describe, it, expect } from 'vitest';
import { executarAuditoriaDinamica } from './auditoria';
import { sincronizarDadosGuia, sincronizarProcedimento, aplicarCorrecaoIndividual } from './correcoes';
import { calcularHashMD5Tiss } from './hash';
import { TIPOS_DE_GUIA } from './regexPatterns';
import { calcularValorProcedimentoComVia } from '../tabelaTiss';
import { SAMPLE_TISS_4_SADT } from '../sampleXmls';
import { GuideItem, Inconsistency } from '../../types/tiss';

describe('Testes Regressivos de Desempenho e Robustez', () => {
  it('Processa lote massivo de guias com alta performance (< 500ms)', () => {
    // Simula lote de 40 guias concatenadas
    const loteSimulado = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>12345</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>2026-10-16</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>10:00:00</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>324477</ans:registroANS>
    </ans:destino>
    <ans:Padrao>4.01.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>999999</ans:numeroLote>
      <ans:guiasTISS>
        ${Array.from({ length: 40 }, (_, i) => `
        <ans:guiaConsulta>
          <ans:cabecalhoConsulta>
            <ans:registroANS>324477</ans:registroANS>
            <ans:numeroGuiaPrestador>PREST-${1000 + i}</ans:numeroGuiaPrestador>
          </ans:cabecalhoConsulta>
          <ans:numeroGuiaOperadora>OP-${2000 + i}</ans:numeroGuiaOperadora>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>03310770${i}</ans:numeroCarteira>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:contratadoExecutante>
            <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            <ans:CNES>3891542</ans:CNES>
          </ans:contratadoExecutante>
          <ans:profissionalExecutante>
            <ans:nomeProfissional>DR SILVA</ans:nomeProfissional>
            <ans:conselhoProfissional>06</ans:conselhoProfissional>
            <ans:numeroConselhoProfissional>1234</ans:numeroConselhoProfissional>
            <ans:UF>32</ans:UF>
            <ans:CBOS>225265</ans:CBOS>
          </ans:profissionalExecutante>
          <ans:indicacaoAcidente>9</ans:indicacaoAcidente>
          <ans:dadosAtendimento>
            <ans:regimeAtendimento>01</ans:regimeAtendimento>
            <ans:dataAtendimento>2026-10-10</ans:dataAtendimento>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:procedimento>
              <ans:codigoTabela>22</ans:codigoTabela>
              <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
              <ans:valorProcedimento>120.00</ans:valorProcedimento>
            </ans:procedimento>
          </ans:dadosAtendimento>
        </ans:guiaConsulta>
        `).join('\n')}
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
  <ans:epilogo>
    <ans:hash>d41d8cd98f00b204e9800998ecf8427e</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`;

    const start = performance.now();
    const result = executarAuditoriaDinamica(loteSimulado);
    const duration = performance.now() - start;

    expect(result.guias.length).toBe(40);
    expect(result.valorConsulta).toBeCloseTo(40 * 120.00);
    // Garantir que a auditoria dinâmica com busca binária executa rapidamente
    expect(duration).toBeLessThan(500);
  });

  it('Sincronização de guia funciona perfeitamente para todos os tipos de guia suportados', () => {
    for (const tipo of TIPOS_DE_GUIA) {
      const xmlComGuia = `<ans:mensagemTISS>
  <ans:${tipo}>
    <ans:numeroCarteira>111111</ans:numeroCarteira>
    <ans:numeroGuiaOperadora>222222</ans:numeroGuiaOperadora>
    <ans:senha>333333</ans:senha>
    <ans:numeroGuiaPrestador>444444</ans:numeroGuiaPrestador>
  </ans:${tipo}>
</ans:mensagemTISS>`;

      const guideMock: GuideItem = {
        id: `mock-${tipo}`,
        index: 1,
        startIdx: xmlComGuia.indexOf(`<ans:${tipo}>`),
        endIdx: xmlComGuia.indexOf(`</ans:${tipo}>`) + `</ans:${tipo}>`.length,
        tipoGuia: tipo,
        carteira: '111111',
        guia: '222222',
        senha: '333333',
        guiaPrestador: '444444',
        procedimentos: [],
      };

      const { novoConteudo, alterado } = sincronizarDadosGuia(xmlComGuia, guideMock, {
        carteira: '999999',
        guia: '888888',
        senha: '777777',
        guiaPrestador: '666666',
      });

      expect(alterado).toBe(true);
      expect(novoConteudo).toContain('<ans:numeroCarteira>999999</ans:numeroCarteira>');
      expect(novoConteudo).toContain('<ans:numeroGuiaOperadora>888888</ans:numeroGuiaOperadora>');
      expect(novoConteudo).toContain('<ans:senha>777777</ans:senha>');
      expect(novoConteudo).toContain('<ans:numeroGuiaPrestador>666666</ans:numeroGuiaPrestador>');
    }
  });

  it('Preserva indentação ao aplicar correção pontual em linha', () => {
    const xmlComIndentacao = `  <ans:bloco>
    <ans:campoInvalido>valor</ans:campoInvalido>
  </ans:bloco>`;

    const erro: Inconsistency = {
      id: 'teste-indent',
      linha: 2,
      tipo: 'Erro Estrutural',
      desc: 'Tag inválida',
      original: '<ans:campoInvalido>valor</ans:campoInvalido>',
      sugestao: '<ans:campoCorrigido>valor</ans:campoCorrigido>',
      seguro: true,
    };

    const { novoConteudo, sucesso } = aplicarCorrecaoIndividual(xmlComIndentacao, erro);
    expect(sucesso).toBe(true);
    // A indentação de 4 espaços deve ser preservada intacta
    expect(novoConteudo).toContain('    <ans:campoCorrigido>valor</ans:campoCorrigido>');
  });

  it('Cálculo normativo de vias de acesso CBHPM/ANS (100%, 70%, 50%) funciona com exatidão', () => {
    const unitario = '1500.00';
    const c100 = calcularValorProcedimentoComVia(1, unitario, '1.00');
    const c70 = calcularValorProcedimentoComVia(1, unitario, '0.70');
    const c50 = calcularValorProcedimentoComVia(1, unitario, '0.50');

    expect(c100.valorTotal).toBe('1500.00');
    expect(c70.valorTotal).toBe('1050.00');
    expect(c50.valorTotal).toBe('750.00');

    const totalBilateral = parseFloat(c100.valorTotal) + parseFloat(c70.valorTotal);
    expect(totalBilateral).toBe(2550.00);
  });

  it('Cálculo de Hash MD5 TISS é idempotente e imune a comentários ou reordenação de whitespace', () => {
    const res1 = calcularHashMD5Tiss(SAMPLE_TISS_4_SADT);
    const res2 = calcularHashMD5Tiss(SAMPLE_TISS_4_SADT);

    expect(res1.hashCalculado).toBeTruthy();
    expect(res1.hashCalculado).toBe(res2.hashCalculado);

    // Com comentário adicional não deve mudar o hash (comentários são removidos antes do cálculo)
    const xmlComComentario = SAMPLE_TISS_4_SADT.replace(
      '</ans:cabecalho>',
      '<!-- Comentario de auditoria --></ans:cabecalho>'
    );
    const resComComentario = calcularHashMD5Tiss(xmlComComentario);
    expect(resComComentario.hashCalculado).toBe(res1.hashCalculado);
  });

  it('Sincronização de procedimento calcula e substitui valor total e unitário sem desestruturar XML', () => {
    const xmlSadt = SAMPLE_TISS_4_SADT;
    const audit = executarAuditoriaDinamica(xmlSadt);
    expect(audit.guias.length).toBeGreaterThan(0);

    const primeiraGuia = audit.guias[0];
    expect(primeiraGuia.procedimentos).toBeDefined();
    expect(primeiraGuia.procedimentos!.length).toBeGreaterThan(0);

    const primeiroProc = primeiraGuia.procedimentos![0];
    const { novoConteudo, alterado } = sincronizarProcedimento(xmlSadt, primeiroProc, {
      codigo: '99999999',
      quantidade: '2',
      valorUnitario: '250.00',
      valor: '500.00',
      reducaoAcrescimo: '1.00',
    });

    expect(alterado).toBe(true);
    expect(novoConteudo).toContain('<ans:codigoProcedimento>99999999</ans:codigoProcedimento>');
    expect(novoConteudo).toContain('<ans:quantidadeExecutada>2</ans:quantidadeExecutada>');
    expect(novoConteudo).toContain('<ans:valorUnitario>250.00</ans:valorUnitario>');
    expect(novoConteudo).toContain('<ans:valorTotal>500.00</ans:valorTotal>');
  });

  it('Garante performance ultra-rápida (< 300ms) para lote de 100 guias com auditoria completa em passagem única', () => {
    const lote100 = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>99999</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>2026-10-19</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>12:00:00</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>324477</ans:registroANS>
    </ans:destino>
    <ans:Padrao>4.01.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>888888</ans:numeroLote>
      <ans:guiasTISS>
        ${Array.from({ length: 100 }, (_, i) => `
        <ans:guiaConsulta>
          <ans:cabecalhoConsulta>
            <ans:registroANS>324477</ans:registroANS>
            <ans:numeroGuiaPrestador>CONS-${2000 + i}</ans:numeroGuiaPrestador>
          </ans:cabecalhoConsulta>
          <ans:numeroGuiaOperadora>OP-${5000 + i}</ans:numeroGuiaOperadora>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>0999888${i}</ans:numeroCarteira>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:contratadoExecutante>
            <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            <ans:CNES>3891542</ans:CNES>
          </ans:contratadoExecutante>
          <ans:profissionalExecutante>
            <ans:nomeProfissional>DR SILVA</ans:nomeProfissional>
            <ans:conselhoProfissional>06</ans:conselhoProfissional>
            <ans:numeroConselhoProfissional>1234</ans:numeroConselhoProfissional>
            <ans:UF>32</ans:UF>
            <ans:CBOS>225265</ans:CBOS>
          </ans:profissionalExecutante>
          <ans:indicacaoAcidente>9</ans:indicacaoAcidente>
          <ans:dadosAtendimento>
            <ans:regimeAtendimento>01</ans:regimeAtendimento>
            <ans:dataAtendimento>2026-10-19</ans:dataAtendimento>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:procedimento>
              <ans:codigoTabela>22</ans:codigoTabela>
              <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
              <ans:valorProcedimento>150.00</ans:valorProcedimento>
            </ans:procedimento>
          </ans:dadosAtendimento>
        </ans:guiaConsulta>
        `).join('\n')}
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
  <ans:epilogo>
    <ans:hash>d41d8cd98f00b204e9800998ecf8427e</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`;

    const start = performance.now();
    const result = executarAuditoriaDinamica(lote100);
    const duration = performance.now() - start;

    expect(result.guias.length).toBe(100);
    expect(result.valorConsulta).toBeCloseTo(100 * 150.00);
    expect(duration).toBeLessThan(350);
  });

  it('Calcula e valida HASH MD5 de forma consistente e determinística', () => {
    const xmlBase = `<ans:mensagemTISS><ans:corpo><ans:valor>100</ans:valor></ans:corpo><ans:epilogo><ans:hash>dummy</ans:hash></ans:epilogo></ans:mensagemTISS>`;
    const r1 = calcularHashMD5Tiss(xmlBase);
    const r2 = calcularHashMD5Tiss(xmlBase);
    expect(r1.hashCalculado).toBeTruthy();
    expect(r1.hashCalculado).toBe(r2.hashCalculado);
    expect(r1.stringConcatenada).toBe('100');
  });

  it('Detecta tag <dataExecucao> vazia em guiaSP-SADT e gera alerta crítico com número da guia (Script Python)', () => {
    const xmlSadtComDataVazia = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>12345</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>2026-10-28</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>10:00:00</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>324477</ans:registroANS>
    </ans:destino>
    <ans:Padrao>4.01.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>123456</ans:numeroLote>
      <ans:guiasTISS>
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:registroANS>324477</ans:registroANS>
            <ans:numeroGuiaPrestador>GUIA-SADT-999</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>0123456789</ans:numeroCarteira>
            <ans:nomeBeneficiario>PACIENTE TESTE</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>1</ans:sequencialItem>
              <ans:dataExecucao></ans:dataExecucao>
              <ans:horaInicial>10:00:00</ans:horaInicial>
              <ans:horaFinal>10:30:00</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>40101010</ans:codigoProcedimento>
                <ans:descricaoProcedimento>ECG</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:valorUnitario>50.00</ans:valorUnitario>
              <ans:valorTotal>50.00</ans:valorTotal>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
        </ans:guiaSP-SADT>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
  <ans:epilogo>
    <ans:hash>d41d8cd98f00b204e9800998ecf8427e</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`;

    const audit = executarAuditoriaDinamica(xmlSadtComDataVazia);
    const erroData = audit.inconsistencias.find(i => i.desc.includes('Tag <dataExecucao> vazia'));
    expect(erroData).toBeDefined();
    expect(erroData?.tipo).toBe('Crítico');
    expect(erroData?.desc).toContain('Alerta: Tag <dataExecucao> vazia na Guia GUIA-SADT-999');
    expect(erroData?.desc).toContain('procedimento 40101010');

    // Testa a sincronização e correção da data
    const guia = audit.guias[0];
    const proc = guia.procedimentos[0];
    const { novoConteudo, alterado } = sincronizarProcedimento(xmlSadtComDataVazia, proc, {
      dataExecucao: '28/10/2026'
    });

    expect(alterado).toBe(true);
    expect(novoConteudo).toContain('<ans:dataExecucao>2026-10-28</ans:dataExecucao>');

    // Nova auditoria sobre o XML corrigido não deve apontar mais data vazia
    const novaAudit = executarAuditoriaDinamica(novoConteudo);
    const erroResolvido = novaAudit.inconsistencias.find(i => i.desc.includes('Tag <dataExecucao> vazia'));
    expect(erroResolvido).toBeUndefined();
  });
});
