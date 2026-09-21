const CryptoJS = require('crypto-js');

const xml2Raw = `<?xml version='1.0' encoding='ISO-8859-1'?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>2010417</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>2026-08-10</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>09:03:22</ans:horaRegistroTransacao>
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
      <ans:numeroLote>3574721</ans:numeroLote>
      <ans:guiasTISS>
        <ans:guiaConsulta>
          <ans:cabecalhoConsulta>
            <ans:registroANS>324477</ans:registroANS>
            <ans:numeroGuiaPrestador>800112700</ans:numeroGuiaPrestador>
          </ans:cabecalhoConsulta>
          <ans:numeroGuiaOperadora>800112700</ans:numeroGuiaOperadora>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>033107700</ans:numeroCarteira>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:contratadoExecutante>
            <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            <ans:CNES>3891542</ans:CNES>
          </ans:contratadoExecutante>
          <ans:profissionalExecutante>
            <ans:nomeProfissional>GRACE PACHECO DE SOUZA</ans:nomeProfissional>
            <ans:conselhoProfissional>06</ans:conselhoProfissional>
            <ans:numeroConselhoProfissional>5355</ans:numeroConselhoProfissional>
            <ans:UF>32</ans:UF>
            <ans:CBOS>225265</ans:CBOS>
          </ans:profissionalExecutante>
          <ans:indicacaoAcidente>9</ans:indicacaoAcidente>
          <ans:dadosAtendimento>
            <ans:regimeAtendimento>01</ans:regimeAtendimento>
            <ans:dataAtendimento>2026-07-07</ans:dataAtendimento>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:procedimento>
              <ans:codigoTabela>22</ans:codigoTabela>
              <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
              <ans:valorProcedimento>92.47</ans:valorProcedimento>
            </ans:procedimento>
          </ans:dadosAtendimento>
        </ans:guiaConsulta>
        <ans:guiaConsulta>
          <ans:cabecalhoConsulta>
            <ans:registroANS>324477</ans:registroANS>
            <ans:numeroGuiaPrestador>800115214</ans:numeroGuiaPrestador>
          </ans:cabecalhoConsulta>
          <ans:numeroGuiaOperadora>800115214</ans:numeroGuiaOperadora>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>097632300</ans:numeroCarteira>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:contratadoExecutante>
            <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            <ans:CNES>3891542</ans:CNES>
          </ans:contratadoExecutante>
          <ans:profissionalExecutante>
            <ans:nomeProfissional>CESAR FRACALOSSI BARBIERI</ans:nomeProfissional>
            <ans:conselhoProfissional>06</ans:conselhoProfissional>
            <ans:numeroConselhoProfissional>5310</ans:numeroConselhoProfissional>
            <ans:UF>32</ans:UF>
            <ans:CBOS>225265</ans:CBOS>
          </ans:profissionalExecutante>
          <ans:indicacaoAcidente>9</ans:indicacaoAcidente>
          <ans:dadosAtendimento>
            <ans:regimeAtendimento>01</ans:regimeAtendimento>
            <ans:dataAtendimento>2026-07-14</ans:dataAtendimento>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:procedimento>
              <ans:codigoTabela>22</ans:codigoTabela>
              <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
              <ans:valorProcedimento>92.47</ans:valorProcedimento>
            </ans:procedimento>
          </ans:dadosAtendimento>
        </ans:guiaConsulta>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
  <ans:epilogo>
    <ans:hash>141fe237a2e73423d7523d4c00f368cd</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`;

const TARGET = "141fe237a2e73423d7523d4c00f368cd";

// Test 1: What if schemaLocation was present in the validator file?
const xml2WithSchema = xml2Raw.replace(
  'xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas"',
  'xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.ans.gov.br/padroes/tiss/schemas http://www.ans.gov.br/padroes/tiss/schemas/tissV4_01_00.xsd"'
);

function testStr(label, s) {
  s = s.replace(/<(?:[^:>]+:)?hash(?:\s*\/>|>[\s\S]*?<\/(?:[^:>]+:)?hash>)/gi, '');
  const clean = s.replace(/>\s+</g, '><').trim();
  const md5Lat = CryptoJS.MD5(CryptoJS.enc.Latin1.parse(clean)).toString().toLowerCase();
  const md5Utf = CryptoJS.MD5(CryptoJS.enc.Utf8.parse(clean)).toString().toLowerCase();
  if (md5Lat === TARGET || md5Utf === TARGET) {
    console.log(`!!! MATCH FOUND FOR: ${label} !!! (${md5Lat === TARGET ? 'Latin1' : 'Utf8'})`);
    return true;
  }
  return false;
}

console.log("Testing xml2Raw (PPO):", testStr("Raw PPO", xml2Raw.match(/(<([^:>]+:)?prestadorParaOperadora[\s>][\s\S]*?<\/\2prestadorParaOperadora>)/i)[1]));
console.log("Testing xml2Raw (MsgTISS):", testStr("Raw MsgTISS", xml2Raw.match(/(<([^:>]+:)?mensagemTISS[\s>][\s\S]*?<\/\2mensagemTISS>)/i)[1]));
console.log("Testing xml2WithSchema (PPO):", testStr("Schema PPO", xml2WithSchema.match(/(<([^:>]+:)?prestadorParaOperadora[\s>][\s\S]*?<\/\2prestadorParaOperadora>)/i)[1]));
console.log("Testing xml2WithSchema (MsgTISS):", testStr("Schema MsgTISS", xml2WithSchema.match(/(<([^:>]+:)?mensagemTISS[\s>][\s\S]*?<\/\2mensagemTISS>)/i)[1]));

