import format from 'xml-formatter';

const xmlConsulta = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>849201</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>2026-08-05</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>10:30:00</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:cnpjContratado>12345678000195</ans:cnpjContratado>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>358291</ans:registroANS>
    </ans:destino>
    <ans:Padrao>3.05.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>009182</ans:numeroLote>
      <ans:guiasTISS>
        <ans:guiaConsulta>
          <ans:cabecalhoConsulta>
            <ans:registroANS>358291</ans:registroANS>
            <ans:numeroGuiaOperadora>987654321</ans:numeroGuiaOperadora>
          </ans:cabecalhoConsulta>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>00112233445566</ans:numeroCarteira>
            <ans:nomeBeneficiario>CARLOS ALBERTO SILVA</ans:nomeBeneficiario>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:dadosContratadoExecutante>
            <ans:codigoPrestadorNaOperadora>123</ans:codigoPrestadorNaOperadora>
            <ans:nomeContratado>TESTE</ans:nomeContratado>
          </ans:dadosContratadoExecutante>
          <ans:profissionalExecutante>
            <ans:nomeProfissional>MEDICO</ans:nomeProfissional>
            <ans:conselhoProfissional>01</ans:conselhoProfissional>
            <ans:numeroConselhoProfissional>1234</ans:numeroConselhoProfissional>
            <ans:UF>SP</ans:UF>
            <ans:CBOS>12345</ans:CBOS>
          </ans:profissionalExecutante>
          <ans:dadosAtendimento>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:procedimento>
              <ans:codigoTabela>22</ans:codigoTabela>
              <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
              <ans:valorProcedimento>100.00</ans:valorProcedimento>
            </ans:procedimento>
          </ans:dadosAtendimento>
          <ans:observacao></ans:observacao>
        </ans:guiaConsulta>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

const formatted = format(xmlConsulta, {
  indentation: '  ',
  collapseContent: true,
  lineSeparator: '\n'
});
console.log(formatted.split('\n').map((l, i) => `${i+1}: ${l}`).join('\n'));
