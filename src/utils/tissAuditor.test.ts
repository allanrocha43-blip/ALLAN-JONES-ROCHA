import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { executarAuditoriaDinamica } from './tissAuditor';
import { isCritico, contarPorSeveridade } from './severidade';
import { parseVersaoTiss, regraAplicavel, REGRAS_VERSIONADAS } from './tissVersion';
import {
  SAMPLE_GUIA_SADT_SEM_HIFEN,
  SAMPLE_GUIA_SPSADT_SEM_NAMESPACE,
} from './regressionFixtures';

const XML_REAL_402 = readFileSync(
  join(__dirname, '__fixtures__', '3633084_SADTxml.xml'),
  'latin1'
);

describe('executarAuditoriaDinamica — robustez e contrato básico', () => {
  it('nunca lança exceção, mesmo para entrada vazia', () => {
    expect(() => executarAuditoriaDinamica('')).not.toThrow();
    expect(() => executarAuditoriaDinamica('   \n  ')).not.toThrow();
  });

  it('retorna AuditResult vazio e coerente para conteúdo vazio', () => {
    const r = executarAuditoriaDinamica('');
    expect(r.versaoTiss).toBe('Desconhecida');
    expect(r.inconsistencias).toEqual([]);
    expect(r.guias).toEqual([]);
  });

  it('nunca lança exceção para XML gravemente malformado (tags nunca fechadas)', () => {
    const quebrado = '<ans:mensagemTISS><ans:cabecalho><ans:Padrao>4.02.00';
    expect(() => executarAuditoriaDinamica(quebrado)).not.toThrow();
  });

  it('nunca lança exceção para lixo binário / caracteres de controle', () => {
    const lixo = '<ans:mensagemTISS>\x00\x01\x02<ans:Padrao>4.03.00</ans:Padrao></ans:mensagemTISS>';
    const r = executarAuditoriaDinamica(lixo);
    expect(r).toBeDefined();
    // Deve detectar os caracteres de controle como inconsistência, não travar.
    expect(r.inconsistencias.some(i => i.tipo === 'Caracter Inválido')).toBe(true);
  });

  it('nunca lança exceção para entrada absurdamente grande (guarda contra regex catastrófico)', () => {
    const guiaFake = SAMPLE_GUIA_SADT_SEM_HIFEN;
    const grande = guiaFake.repeat(40); // ~simula lote grande
    const inicio = Date.now();
    expect(() => executarAuditoriaDinamica(grande)).not.toThrow();
    const duracaoMs = Date.now() - inicio;
    // Não é um benchmark rígido, só uma rede de segurança contra regressão de performance grave.
    expect(duracaoMs).toBeLessThan(10_000);
  });
});

describe('executarAuditoriaDinamica — XML real anexado (lote 3633084, TISS 4.02.00)', () => {
  it('identifica corretamente a versão declarada no XML', () => {
    const r = executarAuditoriaDinamica(XML_REAL_402);
    expect(r.versaoTiss).toBe('4.02.00');
  });

  it('processa o arquivo real sem lançar exceção e devolve estrutura consistente', () => {
    const r = executarAuditoriaDinamica(XML_REAL_402);
    expect(r.guias.length).toBeGreaterThan(0);
    expect(Array.isArray(r.inconsistencias)).toBe(true);
    // toda inconsistência precisa ter uma linha válida (>=1) e um id único
    const ids = new Set<string>();
    for (const inc of r.inconsistencias) {
      expect(inc.linha).toBeGreaterThanOrEqual(1);
      expect(ids.has(inc.id)).toBe(false);
      ids.add(inc.id);
    }
  });

  it('contarPorSeveridade bate com a contagem manual via isCritico', () => {
    const r = executarAuditoriaDinamica(XML_REAL_402);
    const manual = r.inconsistencias.filter(isCritico).length;
    const { criticos } = contarPorSeveridade(r.inconsistencias);
    expect(criticos).toBe(manual);
    expect(criticos + (r.inconsistencias.length - criticos)).toBe(r.inconsistencias.length);
  });
});

describe('Roteamento por versão TISS (3.05.00 até 4.03.00)', () => {
  it('parseVersaoTiss interpreta corretamente as versões suportadas', () => {
    expect(parseVersaoTiss('4.02.00')).toEqual({ major: 4, minor: 2, patch: 0, raw: '4.02.00' });
    expect(parseVersaoTiss('3.05.00')).toEqual({ major: 3, minor: 5, patch: 0, raw: '3.05.00' });
    expect(parseVersaoTiss('4.03.00')).toEqual({ major: 4, minor: 3, patch: 0, raw: '4.03.00' });
    expect(parseVersaoTiss(null)).toBeNull();
    expect(parseVersaoTiss('')).toBeNull();
    expect(parseVersaoTiss('não-é-versão')).toBeNull();
  });

  it('regraAplicavel respeita o piso mínimo de versão', () => {
    const regra = REGRAS_VERSIONADAS.indicacaoAcidenteObrigatoria; // min 3.05.00
    expect(regraAplicavel('3.04.04', regra)).toBe(false); // anterior: não aplica
    expect(regraAplicavel('3.05.00', regra)).toBe(true);  // exatamente no piso: aplica
    expect(regraAplicavel('4.02.00', regra)).toBe(true);  // versão atual: aplica
    expect(regraAplicavel('4.03.00', regra)).toBe(true);  // versão mais nova: aplica
  });

  it('regraAplicavel é fail-safe quando a versão não pode ser lida', () => {
    const regra = REGRAS_VERSIONADAS.indicacaoAcidenteObrigatoria;
    expect(regraAplicavel(undefined, regra)).toBe(true);
    expect(regraAplicavel('Desconhecida', regra)).toBe(true);
  });

  it('auditoria em lote com <Padrao>3.02.00</Padrao> não acusa falsamente <indicacaoAcidente> ausente', () => {
    const xmlAntigo = SAMPLE_GUIA_SPSADT_SEM_NAMESPACE.replace(
      /<Padrao>[^<]+<\/Padrao>/,
      '<Padrao>3.02.00</Padrao>'
    );
    const r = executarAuditoriaDinamica(xmlAntigo);
    const acusouIndicacaoAcidente = r.inconsistencias.some(i => i.desc.includes('indicacaoAcidente'));
    expect(acusouIndicacaoAcidente).toBe(false);
  });
});

describe('Fixtures de regressão pré-existentes do projeto', () => {
  it('SAMPLE_GUIA_SADT_SEM_HIFEN (guiaSADT, variação sem hífen) é processado sem exceção', () => {
    expect(() => executarAuditoriaDinamica(SAMPLE_GUIA_SADT_SEM_HIFEN)).not.toThrow();
  });

  it('SAMPLE_GUIA_SPSADT_SEM_NAMESPACE (XML sem prefixo de namespace) é processado sem exceção', () => {
    const r = executarAuditoriaDinamica(SAMPLE_GUIA_SPSADT_SEM_NAMESPACE);
    expect(r.guias.length).toBeGreaterThan(0);
  });
});

describe('Formatação de XML (formatXmlBruto e formatarEHarmonizarXml)', () => {
  it('preserva valores de tags em linha única sem quebrar a estrutura (collapseContent: true)', async () => {
    const { formatXmlBruto, formatarEHarmonizarXml } = await import('./tissAuditor');
    const minified = '<ans:mensagemTISS><ans:cabecalho><ans:Padrao>4.02.00</ans:Padrao><ans:identificacaoPrestador><ans:CNPJ>01137028000138</ans:CNPJ></ans:identificacaoPrestador></ans:cabecalho></ans:mensagemTISS>';
    
    const formatted = formatXmlBruto(minified);
    expect(formatted).toContain('<ans:Padrao>4.02.00</ans:Padrao>');
    expect(formatted).toContain('<ans:CNPJ>01137028000138</ans:CNPJ>');
    expect(formatted).not.toContain('<ans:Padrao>\n');
    expect(formatted).not.toContain('<ans:CNPJ>\n');

    const harmonizado = formatarEHarmonizarXml(minified);
    expect(harmonizado.sucesso).toBe(true);
    expect(harmonizado.novoConteudo).toContain('<ans:Padrao>4.02.00</ans:Padrao>');
  });

  it('formatação não quebra a contagem de guias nem introduz erros artificiais em lote real', async () => {
    const { formatXmlBruto } = await import('./tissAuditor');
    const formatted = formatXmlBruto(XML_REAL_402);
    const auditOrig = executarAuditoriaDinamica(XML_REAL_402);
    const auditFmt = executarAuditoriaDinamica(formatted);

    expect(auditFmt.guias.length).toBe(auditOrig.guias.length);
    expect(auditFmt.inconsistencias.length).toBe(auditOrig.inconsistencias.length);
  });

  it('executarAuditoriaDinamica detecta inconsistência biológica de sexo e valor zerado em XML completo', () => {
    const xmlComErroBiologico = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:Padrao>4.01.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>001</ans:numeroLote>
      <ans:guiasTISS>
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:numeroGuiaPrestador>GUIA-BIO-01</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>123456</ans:numeroCarteira>
            <ans:sexo>M</ans:sexo>
          </ans:dadosBeneficiario>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:dataExecucao>2026-05-10</ans:dataExecucao>
              <ans:procedimento>
                <ans:codigoProcedimento>31309054</ans:codigoProcedimento>
              </ans:procedimento>
              <ans:valorTotal>1500.00</ans:valorTotal>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
        </ans:guiaSP-SADT>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

    const resultado = executarAuditoriaDinamica(xmlComErroBiologico);
    const erroSexo = resultado.inconsistencias.find(i => i.id.startsWith('regra-sexo-m'));
    expect(erroSexo).toBeDefined();
    expect(erroSexo?.tipo).toBe('Crítico');
    expect(erroSexo?.desc).toContain('exclusivo do sexo feminino');
  });

  it('detecta <CNES> órfão em <contratadoExecutante> quando falta <cnpjContratado>/<cpfContratado>/<codigoPrestadorNaOperadora> e corrige automaticamente', async () => {
    const { aplicarCorrecoesSegurasRecursivo } = await import('./tissAuditor');
    const xmlSemCnpjExecutante = `<?xml version='1.0' encoding='ISO-8859-1'?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:CNPJ>52945193000823</ans:CNPJ>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:Padrao>4.03.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>3757646</ans:numeroLote>
      <ans:guiasTISS>
        <ans:guiaConsulta>
          <ans:cabecalhoConsulta>
            <ans:registroANS>346659</ans:registroANS>
            <ans:numeroGuiaPrestador>32898016</ans:numeroGuiaPrestador>
          </ans:cabecalhoConsulta>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>0010000856010080</ans:numeroCarteira>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:contratadoExecutante>
            <ans:CNES>3160548</ans:CNES>
          </ans:contratadoExecutante>
          <ans:profissionalExecutante>
            <ans:nomeProfissional>RAPHAEL BARCELOS</ans:nomeProfissional>
            <ans:conselhoProfissional>06</ans:conselhoProfissional>
            <ans:numeroConselhoProfissional>228935</ans:numeroConselhoProfissional>
            <ans:UF>35</ans:UF>
            <ans:CBOS>225265</ans:CBOS>
          </ans:profissionalExecutante>
          <ans:indicacaoAcidente>9</ans:indicacaoAcidente>
          <ans:dadosAtendimento>
            <ans:regimeAtendimento>01</ans:regimeAtendimento>
            <ans:dataAtendimento>2026-10-16</ans:dataAtendimento>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:procedimento>
              <ans:codigoTabela>22</ans:codigoTabela>
              <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
              <ans:valorProcedimento>121.74</ans:valorProcedimento>
            </ans:procedimento>
          </ans:dadosAtendimento>
        </ans:guiaConsulta>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

    const antes = executarAuditoriaDinamica(xmlSemCnpjExecutante);
    const erroOrfao = antes.inconsistencias.find(i => i.id.startsWith('orfao-identificacao-contratado'));
    expect(erroOrfao).toBeDefined();
    expect(erroOrfao?.tipo).toBe('Erro Órfão');
    expect(erroOrfao?.linha).toBe(25);
    expect(erroOrfao?.seguro).toBe(true);

    const { novoConteudo, totalCorrigidos } = aplicarCorrecoesSegurasRecursivo(xmlSemCnpjExecutante);
    expect(totalCorrigidos).toBeGreaterThanOrEqual(1);
    expect(novoConteudo).toContain('<ans:cnpjContratado>52945193000823</ans:cnpjContratado>\n            <ans:CNES>3160548</ans:CNES>');

    const depois = executarAuditoriaDinamica(novoConteudo);
    expect(depois.inconsistencias.filter(i => i.id.startsWith('orfao-identificacao-contratado')).length).toBe(0);
  });
});
