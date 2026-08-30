import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, KeyRound, CheckCircle2, AlertTriangle, Copy, RefreshCw, FileText, Check, Code, Hash } from 'lucide-react';
import { calcularHashMD5Tiss } from '../utils/tissAuditor';

interface HashReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  conteudoXmlAtivo: string;
  nomeArquivoAtivo: string;
  onAtualizarXml: (novoConteudo: string, novoHash: string) => void;
}

// Exemplos enviados pelo usuário para teste rápido
const EXEMPLO_LOTE_3574742 = `<?xml version='1.0' encoding='ISO-8859-1'?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>2010420</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>2026-08-10</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>09:03:57</ans:horaRegistroTransacao>
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
      <ans:numeroLote>3574742</ans:numeroLote>
      <ans:guiasTISS>
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:registroANS>324477</ans:registroANS>
            <ans:numeroGuiaPrestador>000120260600006829</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosAutorizacao>
            <ans:numeroGuiaOperadora>000120260600006829</ans:numeroGuiaOperadora>
            <ans:dataAutorizacao>2026-06-26</ans:dataAutorizacao>
            <ans:senha>852354665</ans:senha>
            <ans:dataValidadeSenha>2026-08-25</ans:dataValidadeSenha>
          </ans:dadosAutorizacao>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>033107700</ans:numeroCarteira>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:dadosSolicitante>
            <ans:contratadoSolicitante>
              <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            </ans:contratadoSolicitante>
            <ans:nomeContratadoSolicitante>CCOLHOS - CENTRO CAPIXABA DE OLHOS LTDA</ans:nomeContratadoSolicitante>
            <ans:profissionalSolicitante>
              <ans:nomeProfissional>GRACE PACHECO DE SOUZA</ans:nomeProfissional>
              <ans:conselhoProfissional>06</ans:conselhoProfissional>
              <ans:numeroConselhoProfissional>5355</ans:numeroConselhoProfissional>
              <ans:UF>32</ans:UF>
              <ans:CBOS>225265</ans:CBOS>
            </ans:profissionalSolicitante>
          </ans:dadosSolicitante>
          <ans:dadosSolicitacao>
            <ans:dataSolicitacao>2026-06-26</ans:dataSolicitacao>
            <ans:caraterAtendimento>1</ans:caraterAtendimento>
            <ans:indicacaoClinica>H264 - POS-CATARATA</ans:indicacaoClinica>
          </ans:dadosSolicitacao>
          <ans:dadosExecutante>
            <ans:contratadoExecutante>
              <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            </ans:contratadoExecutante>
            <ans:CNES>3891542</ans:CNES>
          </ans:dadosExecutante>
          <ans:dadosAtendimento>
            <ans:tipoAtendimento>23</ans:tipoAtendimento>
            <ans:indicacaoAcidente>9</ans:indicacaoAcidente>
            <ans:regimeAtendimento>01</ans:regimeAtendimento>
          </ans:dadosAtendimento>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>1</ans:sequencialItem>
              <ans:dataExecucao>2026-06-26</ans:dataExecucao>
              <ans:horaInicial>09:56:34</ans:horaInicial>
              <ans:horaFinal>10:26:34</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>30306019</ans:codigoProcedimento>
                <ans:descricaoProcedimento>CAPSULOTOMIA YAG OU CIRURGICA</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:reducaoAcrescimo>1.00</ans:reducaoAcrescimo>
              <ans:valorUnitario>229.49</ans:valorUnitario>
              <ans:valorTotal>229.49</ans:valorTotal>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
          <ans:valorTotal>
            <ans:valorProcedimentos>229.49</ans:valorProcedimentos>
            <ans:valorTaxasAlugueis>0.00</ans:valorTaxasAlugueis>
            <ans:valorMateriais>0.00</ans:valorMateriais>
            <ans:valorMedicamentos>0.00</ans:valorMedicamentos>
            <ans:valorOPME>0.00</ans:valorOPME>
            <ans:valorGasesMedicinais>0.00</ans:valorGasesMedicinais>
            <ans:valorTotalGeral>229.49</ans:valorTotalGeral>
          </ans:valorTotal>
        </ans:guiaSP-SADT>
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:registroANS>324477</ans:registroANS>
            <ans:numeroGuiaPrestador>800112702</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosAutorizacao>
            <ans:numeroGuiaOperadora>800112702</ans:numeroGuiaOperadora>
            <ans:dataAutorizacao>2026-07-07</ans:dataAutorizacao>
          </ans:dadosAutorizacao>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>033107700</ans:numeroCarteira>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:dadosSolicitante>
            <ans:contratadoSolicitante>
              <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            </ans:contratadoSolicitante>
            <ans:nomeContratadoSolicitante>CCOLHOS - CENTRO CAPIXABA DE OLHOS LTDA</ans:nomeContratadoSolicitante>
            <ans:profissionalSolicitante>
              <ans:nomeProfissional>GRACE PACHECO DE SOUZA</ans:nomeProfissional>
              <ans:conselhoProfissional>06</ans:conselhoProfissional>
              <ans:numeroConselhoProfissional>5355</ans:numeroConselhoProfissional>
              <ans:UF>32</ans:UF>
              <ans:CBOS>225265</ans:CBOS>
            </ans:profissionalSolicitante>
          </ans:dadosSolicitante>
          <ans:dadosSolicitacao>
            <ans:dataSolicitacao>2026-07-07</ans:dataSolicitacao>
            <ans:caraterAtendimento>1</ans:caraterAtendimento>
            <ans:indicacaoClinica>Z010 - EXAME DOS OLHOS E DA VISAO</ans:indicacaoClinica>
          </ans:dadosSolicitacao>
          <ans:dadosExecutante>
            <ans:contratadoExecutante>
              <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            </ans:contratadoExecutante>
            <ans:CNES>3891542</ans:CNES>
          </ans:dadosExecutante>
          <ans:dadosAtendimento>
            <ans:tipoAtendimento>23</ans:tipoAtendimento>
            <ans:indicacaoAcidente>9</ans:indicacaoAcidente>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:regimeAtendimento>01</ans:regimeAtendimento>
          </ans:dadosAtendimento>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>1</ans:sequencialItem>
              <ans:dataExecucao>2026-07-07</ans:dataExecucao>
              <ans:horaInicial>08:07:43</ans:horaInicial>
              <ans:horaFinal>08:37:43</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>41301323</ans:codigoProcedimento>
                <ans:descricaoProcedimento>TONOMETRIA - BINOCULAR</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:viaAcesso>1</ans:viaAcesso>
              <ans:reducaoAcrescimo>1.00</ans:reducaoAcrescimo>
              <ans:valorUnitario>29.09</ans:valorUnitario>
              <ans:valorTotal>29.09</ans:valorTotal>
            </ans:procedimentoExecutado>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>2</ans:sequencialItem>
              <ans:dataExecucao>2026-07-07</ans:dataExecucao>
              <ans:horaInicial>08:47:43</ans:horaInicial>
              <ans:horaFinal>09:17:43</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>41301250</ans:codigoProcedimento>
                <ans:descricaoProcedimento>MAPEAMENTO DE RETINA (OFTALMOSCOPIA INDIRETA) - MONOCULAR</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:viaAcesso>1</ans:viaAcesso>
              <ans:reducaoAcrescimo>1.00</ans:reducaoAcrescimo>
              <ans:valorUnitario>49.51</ans:valorUnitario>
              <ans:valorTotal>49.51</ans:valorTotal>
            </ans:procedimentoExecutado>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>3</ans:sequencialItem>
              <ans:dataExecucao>2026-07-07</ans:dataExecucao>
              <ans:horaInicial>09:27:43</ans:horaInicial>
              <ans:horaFinal>09:57:43</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>41301250</ans:codigoProcedimento>
                <ans:descricaoProcedimento>MAPEAMENTO DE RETINA (OFTALMOSCOPIA INDIRETA) - MONOCULAR</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:viaAcesso>1</ans:viaAcesso>
              <ans:reducaoAcrescimo>1.00</ans:reducaoAcrescimo>
              <ans:valorUnitario>48.23</ans:valorUnitario>
              <ans:valorTotal>48.23</ans:valorTotal>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
          <ans:valorTotal>
            <ans:valorProcedimentos>126.83</ans:valorProcedimentos>
            <ans:valorTaxasAlugueis>0.00</ans:valorTaxasAlugueis>
            <ans:valorMateriais>0.00</ans:valorMateriais>
            <ans:valorMedicamentos>0.00</ans:valorMedicamentos>
            <ans:valorOPME>0.00</ans:valorOPME>
            <ans:valorGasesMedicinais>0.00</ans:valorGasesMedicinais>
            <ans:valorTotalGeral>126.83</ans:valorTotalGeral>
          </ans:valorTotal>
        </ans:guiaSP-SADT>
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:registroANS>324477</ans:registroANS>
            <ans:numeroGuiaPrestador>800115213</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosAutorizacao>
            <ans:numeroGuiaOperadora>800115213</ans:numeroGuiaOperadora>
            <ans:dataAutorizacao>2026-07-14</ans:dataAutorizacao>
          </ans:dadosAutorizacao>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>097632300</ans:numeroCarteira>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:dadosSolicitante>
            <ans:contratadoSolicitante>
              <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            </ans:contratadoSolicitante>
            <ans:nomeContratadoSolicitante>CCOLHOS - CENTRO CAPIXABA DE OLHOS LTDA</ans:nomeContratadoSolicitante>
            <ans:profissionalSolicitante>
              <ans:nomeProfissional>CESAR FRACALOSSI BARBIERI</ans:nomeProfissional>
              <ans:conselhoProfissional>06</ans:conselhoProfissional>
              <ans:numeroConselhoProfissional>5310</ans:numeroConselhoProfissional>
              <ans:UF>32</ans:UF>
              <ans:CBOS>225265</ans:CBOS>
            </ans:profissionalSolicitante>
          </ans:dadosSolicitante>
          <ans:dadosSolicitacao>
            <ans:dataSolicitacao>2026-07-14</ans:dataSolicitacao>
            <ans:caraterAtendimento>1</ans:caraterAtendimento>
            <ans:indicacaoClinica>H25 - CATARATA SENIL</ans:indicacaoClinica>
          </ans:dadosSolicitacao>
          <ans:dadosExecutante>
            <ans:contratadoExecutante>
              <ans:codigoPrestadorNaOperadora>01137028000138</ans:codigoPrestadorNaOperadora>
            </ans:contratadoExecutante>
            <ans:CNES>3891542</ans:CNES>
          </ans:dadosExecutante>
          <ans:dadosAtendimento>
            <ans:tipoAtendimento>23</ans:tipoAtendimento>
            <ans:indicacaoAcidente>9</ans:indicacaoAcidente>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:regimeAtendimento>01</ans:regimeAtendimento>
          </ans:dadosAtendimento>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>1</ans:sequencialItem>
              <ans:dataExecucao>2026-07-14</ans:dataExecucao>
              <ans:horaInicial>15:00:00</ans:horaInicial>
              <ans:horaFinal>15:30:00</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>41301080</ans:codigoProcedimento>
                <ans:descricaoProcedimento>CERATOSCOPIA COMPUTADORIZADA - MONOCULAR</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:viaAcesso>1</ans:viaAcesso>
              <ans:reducaoAcrescimo>1.00</ans:reducaoAcrescimo>
              <ans:valorUnitario>98.95</ans:valorUnitario>
              <ans:valorTotal>98.95</ans:valorTotal>
            </ans:procedimentoExecutado>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>2</ans:sequencialItem>
              <ans:dataExecucao>2026-07-14</ans:dataExecucao>
              <ans:horaInicial>15:40:00</ans:horaInicial>
              <ans:horaFinal>16:10:00</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>41301080</ans:codigoProcedimento>
                <ans:descricaoProcedimento>CERATOSCOPIA COMPUTADORIZADA - MONOCULAR</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:viaAcesso>1</ans:viaAcesso>
              <ans:reducaoAcrescimo>1.00</ans:reducaoAcrescimo>
              <ans:valorUnitario>90.92</ans:valorUnitario>
              <ans:valorTotal>90.92</ans:valorTotal>
            </ans:procedimentoExecutado>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>3</ans:sequencialItem>
              <ans:dataExecucao>2026-07-14</ans:dataExecucao>
              <ans:horaInicial>15:44:26</ans:horaInicial>
              <ans:horaFinal>16:14:26</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>41301242</ans:codigoProcedimento>
                <ans:descricaoProcedimento>GONIOSCOPIA - BINOCULAR</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:viaAcesso>1</ans:viaAcesso>
              <ans:reducaoAcrescimo>1.00</ans:reducaoAcrescimo>
              <ans:valorUnitario>27.28</ans:valorUnitario>
              <ans:valorTotal>27.28</ans:valorTotal>
            </ans:procedimentoExecutado>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>4</ans:sequencialItem>
              <ans:dataExecucao>2026-07-14</ans:dataExecucao>
              <ans:horaInicial>16:24:26</ans:horaInicial>
              <ans:horaFinal>16:54:26</ans:horaFinal>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>41301323</ans:codigoProcedimento>
                <ans:descricaoProcedimento>TONOMETRIA - BINOCULAR</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:viaAcesso>1</ans:viaAcesso>
              <ans:reducaoAcrescimo>1.00</ans:reducaoAcrescimo>
              <ans:valorUnitario>29.09</ans:valorUnitario>
              <ans:valorTotal>29.09</ans:valorTotal>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
          <ans:valorTotal>
            <ans:valorProcedimentos>246.24</ans:valorProcedimentos>
            <ans:valorTaxasAlugueis>0.00</ans:valorTaxasAlugueis>
            <ans:valorMateriais>0.00</ans:valorMateriais>
            <ans:valorMedicamentos>0.00</ans:valorMedicamentos>
            <ans:valorOPME>0.00</ans:valorOPME>
            <ans:valorGasesMedicinais>0.00</ans:valorGasesMedicinais>
            <ans:valorTotalGeral>246.24</ans:valorTotalGeral>
          </ans:valorTotal>
        </ans:guiaSP-SADT>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
  <ans:epilogo>
    <ans:hash>4b5e82cbdedbc406d7fb8bb42995ad52</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`;

const EXEMPLO_LOTE_3574721 = `<?xml version='1.0' encoding='ISO-8859-1'?>
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
    <ans:hash>75df509e502b0f46dfe7665ba94cb1f8</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`;

export const HashReaderModal: React.FC<HashReaderModalProps> = ({
  isOpen,
  onClose,
  conteudoXmlAtivo,
  nomeArquivoAtivo,
  onAtualizarXml,
}) => {
  const [xmlTrabalho, setXmlTrabalho] = useState(conteudoXmlAtivo);
  const [origem, setOrigem] = useState<'ativo' | 'lote_3574742' | 'lote_3574721' | 'manual'>('ativo');
  const [mostrarAmostra, setMostrarAmostra] = useState(false);
  const [copiadoHash, setCopiadoHash] = useState(false);
  const [copiadoString, setCopiadoString] = useState(false);

  useEffect(() => {
    if (origem === 'ativo') {
      setXmlTrabalho(conteudoXmlAtivo);
    }
  }, [conteudoXmlAtivo, origem]);

  if (!isOpen) return null;

  // Extrai o hash informado no XML
  const hashTagMatch = xmlTrabalho.match(/<((?:[^:>]+:)?hash)>([^<]+)<\/((?:[^:>]+:)?hash)>/i);
  const hashInformado = hashTagMatch ? hashTagMatch[2].trim() : null;

  // Calcula com o novo motor ANS
  const { hashCalculado, stringConcatenada, erroMsg } = calcularHashMD5Tiss(xmlTrabalho);

  const hashesConferem =
    hashInformado &&
    hashCalculado &&
    hashInformado.toLowerCase() === hashCalculado.toLowerCase();

  const handleCopiarHash = () => {
    if (hashCalculado) {
      navigator.clipboard.writeText(hashCalculado);
      setCopiadoHash(true);
      setTimeout(() => setCopiadoHash(false), 2000);
    }
  };

  const handleCopiarString = () => {
    if (stringConcatenada) {
      navigator.clipboard.writeText(stringConcatenada);
      setCopiadoString(true);
      setTimeout(() => setCopiadoString(false), 2000);
    }
  };

  const handleAplicarHash = () => {
    if (!hashCalculado) return;
    let novoXml = xmlTrabalho;
    if (hashTagMatch) {
      novoXml = novoXml.replace(hashTagMatch[0], `<${hashTagMatch[1]}>${hashCalculado}</${hashTagMatch[3]}>`);
    } else {
      const epilogoMatch = novoXml.match(/(<((?:[^:>]+:)?epilogo)>)/i);
      if (epilogoMatch) {
        const epilogoTag = epilogoMatch[1];
        const prefixoNs = epilogoMatch[2].includes(':') ? epilogoMatch[2].split(':')[0] + ':' : '';
        novoXml = novoXml.replace(epilogoTag, `${epilogoTag}\n    <${prefixoNs}hash>${hashCalculado}</${prefixoNs}hash>`);
      }
    }
    setXmlTrabalho(novoXml);
    onAtualizarXml(novoXml, hashCalculado);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#181a1b] border border-[#2d3235] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-gray-200"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#2d3235] bg-[#121415] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#00b4d8]/10 text-[#00b4d8] border border-[#00b4d8]/30">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Ferramenta de Leitura e Validação de HASH TISS
                  <span className="text-xs font-mono font-normal bg-[#2a9d8f]/20 text-[#2a9d8f] border border-[#2a9d8f]/40 px-2 py-0.5 rounded">
                    Motor ANS 4.01.00
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Verificação de integridade conforme manual oficial da Agência Nacional de Saúde Suplementar
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white bg-transparent hover:bg-[#25292b] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-sm">
            {/* Seletor de Origem do XML */}
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-2 uppercase tracking-wider">
                1. Selecione o XML para Análise do HASH:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    setOrigem('ativo');
                    setXmlTrabalho(conteudoXmlAtivo);
                  }}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                    origem === 'ativo'
                      ? 'bg-[#00b4d8]/10 border-[#00b4d8] text-white shadow-xs'
                      : 'bg-[#121415] border-[#2d3235] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#00b4d8]" />
                    Arquivo Ativo
                  </span>
                  <span className="text-[10px] truncate opacity-70">
                    {nomeArquivoAtivo || 'Sem arquivo'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setOrigem('lote_3574742');
                    setXmlTrabalho(EXEMPLO_LOTE_3574742);
                  }}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                    origem === 'lote_3574742'
                      ? 'bg-[#00b4d8]/10 border-[#00b4d8] text-white shadow-xs'
                      : 'bg-[#121415] border-[#2d3235] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="font-bold text-[#fca311] flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" />
                    Lote 3574742 (SADT)
                  </span>
                  <span className="text-[10px] text-gray-400">Guia SADT - 8 Proced.</span>
                </button>

                <button
                  onClick={() => {
                    setOrigem('lote_3574721');
                    setXmlTrabalho(EXEMPLO_LOTE_3574721);
                  }}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                    origem === 'lote_3574721'
                      ? 'bg-[#00b4d8]/10 border-[#00b4d8] text-white shadow-xs'
                      : 'bg-[#121415] border-[#2d3235] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="font-bold text-[#e9c46a] flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" />
                    Lote 3574721 (Consulta)
                  </span>
                  <span className="text-[10px] text-gray-400">Guia Consulta - 2 Guias</span>
                </button>

                <button
                  onClick={() => setOrigem('manual')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                    origem === 'manual'
                      ? 'bg-[#00b4d8]/10 border-[#00b4d8] text-white shadow-xs'
                      : 'bg-[#121415] border-[#2d3235] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="font-bold text-[#2a9d8f] flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Inserção Manual
                  </span>
                  <span className="text-[10px] text-gray-400">Colar XML direto</span>
                </button>
              </div>
            </div>

            {origem === 'manual' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Cole o código XML abaixo:</label>
                <textarea
                  value={xmlTrabalho}
                  onChange={(e) => setXmlTrabalho(e.target.value)}
                  rows={6}
                  placeholder="<ans:mensagemTISS>...</ans:mensagemTISS>"
                  className="w-full bg-[#0e1111] border border-[#2d3235] rounded-lg p-3 font-mono text-xs text-gray-200 focus:outline-none focus:border-[#00b4d8]"
                />
              </div>
            )}

            {/* Resultado do Confronto do HASH */}
            <div className="bg-[#111314] border border-[#222629] rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#00b4d8]" />
                2. Diagnóstico de Assinatura MD5 (Confronto de Hashes)
              </h4>

              {erroMsg ? (
                <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                  <span>{erroMsg}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hash Informado */}
                  <div className="bg-[#181a1b] p-4 rounded-lg border border-[#2a2d2e] flex flex-col justify-between space-y-2">
                    <span className="text-xs text-gray-400 font-medium">Hash informado no Arquivo XML:</span>
                    <span className="font-mono text-sm font-bold text-gray-200 break-all select-all">
                      {hashInformado || '<tag hash não encontrada>'}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Valor contido na tag <code className="text-[#00b4d8]">&lt;ans:hash&gt;</code>
                    </span>
                  </div>

                  {/* Hash Calculado pelo Validador */}
                  <div className="bg-[#181a1b] p-4 rounded-lg border border-[#2a2d2e] flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-medium">
                        Hash calculado pelo Validador ANS:
                      </span>
                      <button
                        onClick={handleCopiarHash}
                        title="Copiar Hash Calculado"
                        className="text-xs text-[#00b4d8] hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiadoHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiadoHash ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#2a9d8f] break-all select-all">
                      {hashCalculado}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Calculado via algoritmo oficial da ANS (Latin1 MD5)
                    </span>
                  </div>
                </div>
              )}

              {/* Status Banner */}
              {!erroMsg && (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    hashesConferem
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/40 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {hashesConferem ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 animate-bounce" />
                    )}
                    <div>
                      <h5 className="font-bold text-sm">
                        {hashesConferem
                          ? '::: Arquivo XML 100% VÁLIDO! Hash confere com o Validador ANS!'
                          : '::: HASH NÃO Confere! O arquivo possui MD5 divergente do cálculo oficial.'}
                      </h5>
                      <p className="text-xs opacity-80 mt-0.5">
                        {hashesConferem
                          ? 'A integridade do arquivo está assegurada conforme as diretrizes da ANS TISS.'
                          : 'Erro de HASH pode ocorrer devido a calculadoras que mantêm tags XML no cálculo ou alteração no conteúdo.'}
                      </p>
                    </div>
                  </div>

                  {!hashesConferem && hashCalculado && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAplicarHash}
                      className="hidden sm:flex items-center gap-2 bg-[#2a9d8f] hover:bg-[#21867a] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Corrigir & Aplicar Hash</span>
                    </motion.button>
                  )}
                </div>
              )}
            </div>

            {/* Explicação da Norma e Amostra de Concatenação */}
            <div className="bg-[#111314] border border-[#222629] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Code className="w-4 h-4 text-[#e9c46a]" />
                    3. Parâmetros e Inspeção da String Concatenada
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Norma ANS TISS: Concatenação estrita de todos os valores das tags XML (text nodes), excluindo o próprio nó de hash, codificado em ISO-8859-1 (Latin1).
                  </p>
                </div>
                <button
                  onClick={() => setMostrarAmostra(!mostrarAmostra)}
                  className="text-xs text-[#00b4d8] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>{mostrarAmostra ? 'Ocultar String' : 'Inspecionar String Concatenada'}</span>
                </button>
              </div>

              {mostrarAmostra && stringConcatenada && (
                <div className="space-y-2 pt-2 border-t border-[#222629]">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      Total de caracteres concatenados:{' '}
                      <strong className="text-white font-mono">{stringConcatenada.length}</strong>
                    </span>
                    <button
                      onClick={handleCopiarString}
                      className="text-xs text-[#00b4d8] hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiadoString ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiadoString ? 'Copiada!' : 'Copiar String'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-[#08090a] border border-[#222629] rounded-lg font-mono text-[11px] text-amber-200/90 break-all max-h-40 overflow-y-auto leading-relaxed select-all">
                    {stringConcatenada}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#2d3235] bg-[#121415] flex items-center justify-between">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#2a9d8f]" />
              Compatível com o Validador Oficial da ANS / Operadoras
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-[#222629] hover:bg-[#2d3235] rounded-lg transition-colors cursor-pointer"
              >
                Fechar
              </button>
              {hashCalculado && !hashesConferem && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAplicarHash}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#2a9d8f] hover:bg-[#21867a] rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Aplicar Hash Correta no XML</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
