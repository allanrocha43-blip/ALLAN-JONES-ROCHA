import fs from 'fs';
const consulta = `        <ans:guiaConsulta>
          <ans:cabecalhoConsulta>
            <ans:registroANS>123456</ans:registroANS>
            <ans:numeroGuiaPrestador>123</ans:numeroGuiaPrestador>
            <ans:numeroGuiaOperadora>456</ans:numeroGuiaOperadora>
          </ans:cabecalhoConsulta>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>123123</ans:numeroCarteira>
            <ans:nomeBeneficiario>TESTE</ans:nomeBeneficiario>
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
        </ans:guiaConsulta>`;
const lines = consulta.split('\n');
lines.forEach((l, i) => console.log(`${i+1}: ${l}`));
