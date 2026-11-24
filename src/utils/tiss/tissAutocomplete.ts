import {
  autocompletion,
  Completion,
  CompletionContext,
  CompletionResult,
  pickedCompletion,
} from '@codemirror/autocomplete';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { TABELA_CBHPM_5ED } from '../tabelaTiss';
import { VERSOES_SUPORTADAS } from '../tissVersion';

export interface DomainOption {
  value: string;
  label: string;
  detail: string;
  info?: string;
}

export interface TagSpec {
  tag: string;
  description: string;
  isContainer?: boolean;
  defaultValue?: string;
}

/**
 * Catálogo de tags padrão TISS ANS e suas descrições oficiais.
 */
export const TISS_TAG_META: Record<string, TagSpec> = {
  // Envelope e Cabeçalho
  mensagemTISS: { tag: 'mensagemTISS', description: 'Raiz da mensagem TISS ANS', isContainer: true },
  cabecalho: { tag: 'cabecalho', description: 'Cabeçalho da transação TISS', isContainer: true },
  identificacaoTransacao: { tag: 'identificacaoTransacao', description: 'Identificação e data/hora da transação', isContainer: true },
  tipoTransacao: { tag: 'tipoTransacao', description: 'Tipo da transação (ex: ENVIO_LOTE_GUIAS)' },
  sequencialTransacao: { tag: 'sequencialTransacao', description: 'Número sequencial único da transação' },
  dataRegistroTransacao: { tag: 'dataRegistroTransacao', description: 'Data de registro (AAAA-MM-DD)' },
  horaRegistroTransacao: { tag: 'horaRegistroTransacao', description: 'Hora de registro (HH:MM:SS)' },
  origem: { tag: 'origem', description: 'Identificação do prestador de origem', isContainer: true },
  identificacaoPrestador: { tag: 'identificacaoPrestador', description: 'CNPJ/CPF ou código do prestador', isContainer: true },
  destino: { tag: 'destino', description: 'Identificação da operadora destino', isContainer: true },
  Padrao: { tag: 'Padrao', description: 'Versão do padrão TISS (ex: 4.01.00, 4.03.00)' },
  versaoPadrao: { tag: 'versaoPadrao', description: 'Versão do padrão TISS (legado)' },
  prestadorParaOperadora: { tag: 'prestadorParaOperadora', description: 'Corpo de envio prestador → operadora', isContainer: true },
  loteGuias: { tag: 'loteGuias', description: 'Lote de guias TISS', isContainer: true },
  numeroLote: { tag: 'numeroLote', description: 'Número identificador do lote' },
  guiasTISS: { tag: 'guiasTISS', description: 'Lista de guias do lote', isContainer: true },
  epilogo: { tag: 'epilogo', description: 'Epílogo com assinatura MD5', isContainer: true },
  hash: { tag: 'hash', description: 'Hash MD5 oficial calculado sobre os valores das tags' },

  // Guias
  guiaConsulta: { tag: 'guiaConsulta', description: 'Guia de Consulta Médica', isContainer: true },
  'guiaSP-SADT': { tag: 'guiaSP-SADT', description: 'Guia de Serviço Profissional / SADT', isContainer: true },
  guiaResumoInternacao: { tag: 'guiaResumoInternacao', description: 'Guia de Resumo de Internação', isContainer: true },
  guiaHonorarios: { tag: 'guiaHonorarios', description: 'Guia de Honorário Individual', isContainer: true },
  guiaHonorarioIndividual: { tag: 'guiaHonorarioIndividual', description: 'Guia de Honorário Individual', isContainer: true },

  // Cabeçalho da Guia e Autorização
  cabecalhoConsulta: { tag: 'cabecalhoConsulta', description: 'Cabeçalho da guia de consulta', isContainer: true },
  cabecalhoGuia: { tag: 'cabecalhoGuia', description: 'Cabeçalho da guia SP-SADT / Internação', isContainer: true },
  registroANS: { tag: 'registroANS', description: 'Registro da operadora na ANS (6 dígitos)' },
  numeroGuiaPrestador: { tag: 'numeroGuiaPrestador', description: 'Número da guia atribuído pelo prestador' },
  numeroGuiaOperadora: { tag: 'numeroGuiaOperadora', description: 'Número da guia atribuído pela operadora' },
  guiaPrincipal: { tag: 'guiaPrincipal', description: 'Número da guia principal de referência' },
  dadosAutorizacao: { tag: 'dadosAutorizacao', description: 'Dados de autorização prévia', isContainer: true },
  dataAutorizacao: { tag: 'dataAutorizacao', description: 'Data da autorização (AAAA-MM-DD)' },
  senha: { tag: 'senha', description: 'Senha de autorização da operadora' },
  dataValidadeSenha: { tag: 'dataValidadeSenha', description: 'Data de validade da senha (AAAA-MM-DD)' },

  // Beneficiário
  dadosBeneficiario: { tag: 'dadosBeneficiario', description: 'Dados do paciente / beneficiário', isContainer: true },
  numeroCarteira: { tag: 'numeroCarteira', description: 'Número da carteira do beneficiário' },
  atendimentoRN: { tag: 'atendimentoRN', description: 'Atendimento a Recém-Nascido (S / N)' },
  nomeBeneficiario: { tag: 'nomeBeneficiario', description: 'Nome completo do beneficiário' },
  numeroCNS: { tag: 'numeroCNS', description: 'Cartão Nacional de Saúde (CNS)' },
  sexo: { tag: 'sexo', description: 'Sexo do paciente (1=Masc, 3=Fem, M/F)' },
  dataNascimento: { tag: 'dataNascimento', description: 'Data de nascimento (AAAA-MM-DD)' },
  identificadorBeneficiario: { tag: 'identificadorBeneficiario', description: 'Template biométrico / identificador' },

  // Solicitante & Executante
  dadosSolicitante: { tag: 'dadosSolicitante', description: 'Dados do contratado e profissional solicitante', isContainer: true },
  contratadoSolicitante: { tag: 'contratadoSolicitante', description: 'Identificação do contratado solicitante', isContainer: true },
  nomeContratadoSolicitante: { tag: 'nomeContratadoSolicitante', description: 'Razão social do contratado solicitante' },
  profissionalSolicitante: { tag: 'profissionalSolicitante', description: 'Dados do profissional solicitante', isContainer: true },
  dadosExecutante: { tag: 'dadosExecutante', description: 'Dados do contratado executante e CNES', isContainer: true },
  contratadoExecutante: { tag: 'contratadoExecutante', description: 'Identificação do contratado executante', isContainer: true },
  profissionalExecutante: { tag: 'profissionalExecutante', description: 'Dados do profissional executante', isContainer: true },
  cnpjContratado: { tag: 'cnpjContratado', description: 'CNPJ do contratado (14 dígitos)' },
  cpfContratado: { tag: 'cpfContratado', description: 'CPF do contratado / profissional (11 dígitos)' },
  codigoPrestadorNaOperadora: { tag: 'codigoPrestadorNaOperadora', description: 'Código do prestador na operadora' },
  CNPJ: { tag: 'CNPJ', description: 'CNPJ do prestador (cabeçalho)' },
  CPF: { tag: 'CPF', description: 'CPF do prestador (cabeçalho)' },
  CNES: { tag: 'CNES', description: 'Código CNES do estabelecimento (7 dígitos)' },
  nomeProfissional: { tag: 'nomeProfissional', description: 'Nome do profissional de saúde' },
  conselhoProfissional: { tag: 'conselhoProfissional', description: 'Código do conselho (ex: 06 = CRM)' },
  numeroConselhoProfissional: { tag: 'numeroConselhoProfissional', description: 'Número de inscrição no conselho' },
  UF: { tag: 'UF', description: 'Código IBGE da UF (ex: 35 = SP, 32 = ES)' },
  CBOS: { tag: 'CBOS', description: 'Código CBO-S da especialidade (6 dígitos)' },

  // Solicitação e Atendimento
  dadosSolicitacao: { tag: 'dadosSolicitacao', description: 'Data, caráter e indicação clínica', isContainer: true },
  dataSolicitacao: { tag: 'dataSolicitacao', description: 'Data da solicitação (AAAA-MM-DD)' },
  caraterAtendimento: { tag: 'caraterAtendimento', description: 'Caráter (1=Eletiva, 2=Urgência)' },
  indicacaoClinica: { tag: 'indicacaoClinica', description: 'Indicação clínica / CID' },
  dadosAtendimento: { tag: 'dadosAtendimento', description: 'Dados do atendimento realizado', isContainer: true },
  tipoAtendimento: { tag: 'tipoAtendimento', description: 'Tipo de atendimento TISS (dm_tipoAtendimento)' },
  indicacaoAcidente: { tag: 'indicacaoAcidente', description: 'Indicação de acidente (9=Não acidente)' },
  tipoConsulta: { tag: 'tipoConsulta', description: 'Tipo de consulta (1=Primeira, 2=Retorno...)' },
  regimeAtendimento: { tag: 'regimeAtendimento', description: 'Regime (01=Ambulatorial, 02=Domiciliar...)' },
  dataAtendimento: { tag: 'dataAtendimento', description: 'Data do atendimento (AAAA-MM-DD)' },
  motivoEncerramento: { tag: 'motivoEncerramento', description: 'Motivo de encerramento (dm_motivoSaida)' },

  // Procedimentos e Equipe
  procedimentosExecutados: { tag: 'procedimentosExecutados', description: 'Lista de procedimentos executados', isContainer: true },
  procedimentoExecutado: { tag: 'procedimentoExecutado', description: 'Item de procedimento executado', isContainer: true },
  sequencialItem: { tag: 'sequencialItem', description: 'Número sequencial do item (1, 2, 3...)' },
  dataExecucao: { tag: 'dataExecucao', description: 'Data de execução (AAAA-MM-DD)' },
  horaInicial: { tag: 'horaInicial', description: 'Hora inicial (HH:MM:SS)' },
  horaFinal: { tag: 'horaFinal', description: 'Hora final (HH:MM:SS)' },
  procedimento: { tag: 'procedimento', description: 'Identificação do procedimento TUSS', isContainer: true },
  codigoTabela: { tag: 'codigoTabela', description: 'Código da tabela (22=TUSS Procedimentos)' },
  codigoProcedimento: { tag: 'codigoProcedimento', description: 'Código TUSS do procedimento (8 dígitos)' },
  descricaoProcedimento: { tag: 'descricaoProcedimento', description: 'Descrição do procedimento' },
  quantidadeExecutada: { tag: 'quantidadeExecutada', description: 'Quantidade executada' },
  viaAcesso: { tag: 'viaAcesso', description: 'Via de acesso (1=Única, 2=Mesma via, 3=Diferentes)' },
  tecnicaUtilizada: { tag: 'tecnicaUtilizada', description: 'Técnica (1=Convencional, 2=Videolaparoscopia)' },
  reducaoAcrescimo: { tag: 'reducaoAcrescimo', description: 'Fator de redução/acréscimo (ex: 1.00, 0.70, 0.50)' },
  valorUnitario: { tag: 'valorUnitario', description: 'Valor unitário do procedimento (0.00)' },
  valorTotal: { tag: 'valorTotal', description: 'Valor total (do procedimento ou da guia)', isContainer: true },
  valorProcedimento: { tag: 'valorProcedimento', description: 'Valor do procedimento (guiaConsulta)' },
  equipeSadt: { tag: 'equipeSadt', description: 'Membro da equipe participante do SADT', isContainer: true },
  grauPart: { tag: 'grauPart', description: 'Grau de participação (00=Cirurgião, 12=Clínico...)' },
  codProfissional: { tag: 'codProfissional', description: 'Código/CPF do profissional na equipe', isContainer: true },
  nomeProf: { tag: 'nomeProf', description: 'Nome do profissional na equipe' },
  conselho: { tag: 'conselho', description: 'Código do conselho na equipe (ex: 06=CRM)' },

  // Outras Despesas e Totais
  outrasDespesas: { tag: 'outrasDespesas', description: 'Bloco de outras despesas (taxas, materiais, med)', isContainer: true },
  despesa: { tag: 'despesa', description: 'Item de despesa hospitalar', isContainer: true },
  codigoDespesa: { tag: 'codigoDespesa', description: 'Tipo da despesa (02=Med, 03=Mat, 05=Diárias...)' },
  servicosExecutados: { tag: 'servicosExecutados', description: 'Detalhes do serviço/despesa executado', isContainer: true },
  observacao: { tag: 'observacao', description: 'Observação livre da guia' },
  valorProcedimentos: { tag: 'valorProcedimentos', description: 'Soma dos valores de procedimentos da guia' },
  valorDiarias: { tag: 'valorDiarias', description: 'Soma dos valores de diárias' },
  valorTaxasAlugueis: { tag: 'valorTaxasAlugueis', description: 'Soma de taxas e aluguéis' },
  valorMateriais: { tag: 'valorMateriais', description: 'Soma de materiais médicos' },
  valorMedicamentos: { tag: 'valorMedicamentos', description: 'Soma de medicamentos' },
  valorOPME: { tag: 'valorOPME', description: 'Soma de órteses, próteses e materiais especiais' },
  valorGasesMedicinais: { tag: 'valorGasesMedicinais', description: 'Soma de gases medicinais' },
  valorTotalGeral: { tag: 'valorTotalGeral', description: 'Valor total geral da guia' },
};

/**
 * Mapa pai → filhos válidos conforme estrutura XSD do Padrão TISS ANS.
 */
export const TISS_PARENT_CHILDREN: Record<string, string[]> = {
  mensagemTISS: ['cabecalho', 'prestadorParaOperadora', 'epilogo'],
  cabecalho: ['identificacaoTransacao', 'origem', 'destino', 'Padrao'],
  identificacaoTransacao: ['tipoTransacao', 'sequencialTransacao', 'dataRegistroTransacao', 'horaRegistroTransacao'],
  origem: ['identificacaoPrestador'],
  identificacaoPrestador: ['CNPJ', 'CPF', 'codigoPrestadorNaOperadora'],
  destino: ['registroANS'],
  prestadorParaOperadora: ['loteGuias'],
  loteGuias: ['numeroLote', 'guiasTISS'],
  guiasTISS: ['guiaConsulta', 'guiaSP-SADT', 'guiaResumoInternacao', 'guiaHonorarios'],
  epilogo: ['hash'],

  guiaConsulta: [
    'cabecalhoConsulta',
    'numeroGuiaOperadora',
    'dadosBeneficiario',
    'contratadoExecutante',
    'profissionalExecutante',
    'dadosAtendimento',
    'observacao',
  ],
  cabecalhoConsulta: ['registroANS', 'numeroGuiaPrestador'],

  'guiaSP-SADT': [
    'cabecalhoGuia',
    'dadosAutorizacao',
    'dadosBeneficiario',
    'dadosSolicitante',
    'dadosSolicitacao',
    'dadosExecutante',
    'dadosAtendimento',
    'procedimentosExecutados',
    'outrasDespesas',
    'observacao',
    'valorTotal',
  ],
  cabecalhoGuia: ['registroANS', 'numeroGuiaPrestador', 'guiaPrincipal'],
  dadosAutorizacao: ['numeroGuiaOperadora', 'dataAutorizacao', 'senha', 'dataValidadeSenha'],
  dadosBeneficiario: [
    'numeroCarteira',
    'atendimentoRN',
    'nomeBeneficiario',
    'numeroCNS',
    'sexo',
    'dataNascimento',
    'identificadorBeneficiario',
  ],
  dadosSolicitante: ['contratadoSolicitante', 'nomeContratadoSolicitante', 'profissionalSolicitante'],
  contratadoSolicitante: ['cnpjContratado', 'cpfContratado', 'codigoPrestadorNaOperadora'],
  contratadoExecutante: ['cnpjContratado', 'cpfContratado', 'codigoPrestadorNaOperadora'],
  dadosExecutante: ['contratadoExecutante', 'CNES'],
  profissionalSolicitante: ['nomeProfissional', 'conselhoProfissional', 'numeroConselhoProfissional', 'UF', 'CBOS'],
  profissionalExecutante: ['nomeProfissional', 'conselhoProfissional', 'numeroConselhoProfissional', 'UF', 'CBOS'],
  dadosSolicitacao: ['dataSolicitacao', 'caraterAtendimento', 'indicacaoClinica'],
  dadosAtendimento: ['tipoAtendimento', 'indicacaoAcidente', 'tipoConsulta', 'regimeAtendimento', 'dataAtendimento', 'procedimento', 'motivoEncerramento'],
  procedimentosExecutados: ['procedimentoExecutado'],
  procedimentoExecutado: [
    'sequencialItem',
    'dataExecucao',
    'horaInicial',
    'horaFinal',
    'procedimento',
    'quantidadeExecutada',
    'viaAcesso',
    'tecnicaUtilizada',
    'reducaoAcrescimo',
    'valorUnitario',
    'valorTotal',
    'equipeSadt',
  ],
  procedimento: ['codigoTabela', 'codigoProcedimento', 'descricaoProcedimento', 'valorProcedimento'],
  equipeSadt: ['grauPart', 'codProfissional', 'nomeProf', 'conselho', 'numeroConselhoProfissional', 'UF', 'CBOS'],
  codProfissional: ['codigoPrestadorNaOperadora', 'cpfContratado'],
  outrasDespesas: ['despesa'],
  despesa: ['codigoDespesa', 'servicosExecutados'],
  valorTotal: [
    'valorProcedimentos',
    'valorDiarias',
    'valorTaxasAlugueis',
    'valorMateriais',
    'valorMedicamentos',
    'valorOPME',
    'valorGasesMedicinais',
    'valorTotalGeral',
  ],
};

/**
 * Domínios oficiais (dm_*) para preenchimento de valores dentro de tags TISS ANS.
 */
export const TISS_VALUE_DOMAINS: Record<string, DomainOption[]> = {
  codigoTabela: [
    { value: '22', label: '22', detail: 'TUSS - Procedimentos e Eventos em Saúde' },
    { value: '18', label: '18', detail: 'TUSS - Taxas hospitalares, diárias e gases' },
    { value: '19', label: '19', detail: 'TUSS - Materiais e OPME' },
    { value: '20', label: '20', detail: 'TUSS - Medicamentos' },
    { value: '90', label: '90', detail: 'Tabela própria da operadora' },
    { value: '98', label: '98', detail: 'Tabela própria de pacotes' },
    { value: '00', label: '00', detail: 'Tabela própria das operadoras (legado)' },
  ],
  conselhoProfissional: [
    { value: '06', label: '06', detail: 'CRM - Conselho Regional de Medicina' },
    { value: '08', label: '08', detail: 'CRO - Conselho Regional de Odontologia' },
    { value: '02', label: '02', detail: 'COREN - Conselho Regional de Enfermagem' },
    { value: '05', label: '05', detail: 'CREFITO - Fisioterapia e Terapia Ocupacional' },
    { value: '09', label: '09', detail: 'CRP - Conselho Regional de Psicologia' },
    { value: '07', label: '07', detail: 'CRN - Conselho Regional de Nutrição' },
    { value: '04', label: '04', detail: 'CRFA - Conselho Regional de Fonoaudiologia' },
    { value: '03', label: '03', detail: 'CRF - Conselho Regional de Farmácia' },
    { value: '01', label: '01', detail: 'CRAS - Conselho Regional de Assistência Social' },
    { value: '10', label: '10', detail: 'Outros Conselhos' },
  ],
  conselho: [
    { value: '06', label: '06', detail: 'CRM - Conselho Regional de Medicina' },
    { value: '08', label: '08', detail: 'CRO - Conselho Regional de Odontologia' },
    { value: '02', label: '02', detail: 'COREN - Conselho Regional de Enfermagem' },
    { value: '05', label: '05', detail: 'CREFITO - Fisioterapia e Terapia Ocupacional' },
    { value: '09', label: '09', detail: 'CRP - Conselho Regional de Psicologia' },
    { value: '07', label: '07', detail: 'CRN - Conselho Regional de Nutrição' },
    { value: '04', label: '04', detail: 'CRFA - Conselho Regional de Fonoaudiologia' },
    { value: '03', label: '03', detail: 'CRF - Conselho Regional de Farmácia' },
    { value: '10', label: '10', detail: 'Outros Conselhos' },
  ],
  tipoConsulta: [
    { value: '1', label: '1', detail: 'Primeira consulta' },
    { value: '2', label: '2', detail: 'Retorno' },
    { value: '3', label: '3', detail: 'Pré-natal' },
    { value: '4', label: '4', detail: 'Por encaminhamento' },
  ],
  caraterAtendimento: [
    { value: '1', label: '1', detail: 'Eletiva' },
    { value: '2', label: '2', detail: 'Urgência / Emergência' },
  ],
  indicacaoAcidente: [
    { value: '9', label: '9', detail: 'Não acidente' },
    { value: '0', label: '0', detail: 'Acidente ou doença relacionada ao trabalho' },
    { value: '1', label: '1', detail: 'Acidente de trabalho no trajeto' },
    { value: '2', label: '2', detail: 'Outros acidentes de trânsito' },
  ],
  tipoAtendimento: [
    { value: '04', label: '04', detail: 'Consulta' },
    { value: '05', label: '05', detail: 'Exame' },
    { value: '23', label: '23', detail: 'Exame Ambulatorial / SADT (TISS 4.x)' },
    { value: '03', label: '03', detail: 'Terapias' },
    { value: '02', label: '02', detail: 'Pequena cirurgia' },
    { value: '01', label: '01', detail: 'Remoção' },
    { value: '06', label: '06', detail: 'Atendimento domiciliar' },
    { value: '07', label: '07', detail: 'Internação' },
    { value: '08', label: '08', detail: 'Quimioterapia' },
    { value: '09', label: '09', detail: 'Radioterapia' },
    { value: '10', label: '10', detail: 'Terapia Renal Substitutiva (TRS)' },
    { value: '11', label: '11', detail: 'Pronto socorro' },
    { value: '21', label: '21', detail: 'Telessaúde' },
  ],
  regimeAtendimento: [
    { value: '01', label: '01', detail: 'Ambulatorial' },
    { value: '02', label: '02', detail: 'Domiciliar' },
    { value: '03', label: '03', detail: 'Internação' },
    { value: '04', label: '04', detail: 'Pronto Socorro' },
  ],
  atendimentoRN: [
    { value: 'N', label: 'N', detail: 'Não' },
    { value: 'S', label: 'S', detail: 'Sim (Recém-Nascido)' },
  ],
  sexo: [
    { value: '1', label: '1', detail: 'Masculino (Padrão numérico TISS)' },
    { value: '3', label: '3', detail: 'Feminino (Padrão numérico TISS)' },
    { value: 'M', label: 'M', detail: 'Masculino' },
    { value: 'F', label: 'F', detail: 'Feminino' },
  ],
  viaAcesso: [
    { value: '1', label: '1', detail: 'Única (100%)' },
    { value: '2', label: '2', detail: 'Mesma via' },
    { value: '3', label: '3', detail: 'Diferentes vias' },
  ],
  tecnicaUtilizada: [
    { value: '1', label: '1', detail: 'Convencional' },
    { value: '2', label: '2', detail: 'Videolaparoscopia' },
    { value: '3', label: '3', detail: 'Robótica' },
  ],
  reducaoAcrescimo: [
    { value: '1.00', label: '1.00', detail: '100% (Valor integral)' },
    { value: '0.70', label: '0.70', detail: '70% (Mesma via / redução 30%)' },
    { value: '0.50', label: '0.50', detail: '50% (Vias diferentes / redução 50%)' },
  ],
  grauPart: [
    { value: '12', label: '12', detail: 'Clínico / Executante' },
    { value: '00', label: '00', detail: 'Cirurgião' },
    { value: '01', label: '01', detail: 'Primeiro Auxiliar' },
    { value: '02', label: '02', detail: 'Segundo Auxiliar' },
    { value: '06', label: '06', detail: 'Anestesista' },
    { value: '03', label: '03', detail: 'Terceiro Auxiliar' },
  ],
  codigoDespesa: [
    { value: '01', label: '01', detail: 'Gases medicinais' },
    { value: '02', label: '02', detail: 'Medicamentos' },
    { value: '03', label: '03', detail: 'Materiais' },
    { value: '05', label: '05', detail: 'Diárias' },
    { value: '07', label: '07', detail: 'Taxas e aluguéis' },
    { value: '08', label: '08', detail: 'OPME' },
  ],
  tipoTransacao: [
    { value: 'ENVIO_LOTE_GUIAS', label: 'ENVIO_LOTE_GUIAS', detail: 'Envio de lote de guias' },
    { value: 'SOLICITACAO_PROCEDIMENTOS', label: 'SOLICITACAO_PROCEDIMENTOS', detail: 'Solicitação de procedimentos' },
    { value: 'RECURSO_GLOSA', label: 'RECURSO_GLOSA', detail: 'Recurso de glosa' },
    { value: 'CANCELAMENTO_GUIA', label: 'CANCELAMENTO_GUIA', detail: 'Cancelamento de guia' },
  ],
  Padrao: [...VERSOES_SUPORTADAS]
    .reverse()
    .map((v) => ({ value: v, label: v, detail: `Padrão TISS ANS ${v}` })),
  versaoPadrao: [...VERSOES_SUPORTADAS]
    .reverse()
    .map((v) => ({ value: v, label: v, detail: `Padrão TISS ANS ${v}` })),
  CBOS: [
    { value: '225125', label: '225125', detail: 'Médico clínico' },
    { value: '225265', label: '225265', detail: 'Médico oftalmologista' },
    { value: '225120', label: '225120', detail: 'Médico cardiologista' },
    { value: '225250', label: '225250', detail: 'Médico ginecologista e obstetra' },
    { value: '225124', label: '225124', detail: 'Médico pediatra' },
    { value: '225270', label: '225270', detail: 'Médico ortopedista e traumatologista' },
    { value: '225151', label: '225151', detail: 'Médico anestesiologista' },
    { value: '225320', label: '225320', detail: 'Médico em radiologia e diagnóstico por imagem' },
    { value: '225225', label: '225225', detail: 'Médico cirurgião geral' },
    { value: '225135', label: '225135', detail: 'Médico dermatologista' },
    { value: '225275', label: '225275', detail: 'Médico otorrinolaringologista' },
    { value: '225285', label: '225285', detail: 'Médico urologista' },
  ],
  UF: [
    { value: '35', label: '35', detail: 'SP - São Paulo' },
    { value: '33', label: '33', detail: 'RJ - Rio de Janeiro' },
    { value: '31', label: '31', detail: 'MG - Minas Gerais' },
    { value: '32', label: '32', detail: 'ES - Espírito Santo' },
    { value: '41', label: '41', detail: 'PR - Paraná' },
    { value: '42', label: '42', detail: 'SC - Santa Catarina' },
    { value: '43', label: '43', detail: 'RS - Rio Grande do Sul' },
    { value: '53', label: '53', detail: 'DF - Distrito Federal' },
    { value: '29', label: '29', detail: 'BA - Bahia' },
    { value: '26', label: '26', detail: 'PE - Pernambuco' },
    { value: '23', label: '23', detail: 'CE - Ceará' },
    { value: '52', label: '52', detail: 'GO - Goiás' },
    { value: '13', label: '13', detail: 'AM - Amazonas' },
    { value: '15', label: '15', detail: 'PA - Pará' },
    { value: '21', label: '21', detail: 'MA - Maranhão' },
    { value: '22', label: '22', detail: 'PI - Piauí' },
    { value: '24', label: '24', detail: 'RN - Rio Grande do Norte' },
    { value: '25', label: '25', detail: 'PB - Paraíba' },
    { value: '27', label: '27', detail: 'AL - Alagoas' },
    { value: '28', label: '28', detail: 'SE - Sergipe' },
    { value: '50', label: '50', detail: 'MS - Mato Grosso do Sul' },
    { value: '51', label: '51', detail: 'MT - Mato Grosso' },
    { value: '11', label: '11', detail: 'RO - Rondônia' },
    { value: '12', label: '12', detail: 'AC - Acre' },
    { value: '14', label: '14', detail: 'RR - Roraima' },
    { value: '16', label: '16', detail: 'AP - Amapá' },
    { value: '17', label: '17', detail: 'TO - Tocantins' },
  ],
  motivoEncerramento: [
    { value: '11', label: '11', detail: 'Alta curado' },
    { value: '12', label: '12', detail: 'Alta melhorado' },
    { value: '14', label: '14', detail: 'Alta a pedido' },
    { value: '21', label: '21', detail: 'Permanência por características próprias da doença' },
    { value: '31', label: '31', detail: 'Transferência para outro estabelecimento' },
    { value: '41', label: '41', detail: 'Óbito com declaração fornecida pelo médico assistente' },
  ],
};

/**
 * Snippets estruturais completos por tag pai.
 */
interface TissSnippetDef {
  label: string;
  detail: string;
  parentTags: string[];
  build: (ns: string, indent: string) => { text: string; cursorOffset: number };
}

const TISS_SNIPPETS: TissSnippetDef[] = [
  {
    label: 'procedimentoExecutado (bloco completo)',
    detail: 'Insere item completo de procedimento SADT',
    parentTags: ['procedimentosExecutados'],
    build: (ns, indent) => {
      const i1 = `${indent}  `;
      const i2 = `${indent}    `;
      const p = (t: string) => `${ns}${t}`;
      const beforeCursor =
        `<${p('procedimentoExecutado')}>\n` +
        `${i1}<${p('sequencialItem')}>1</${p('sequencialItem')}>\n` +
        `${i1}<${p('dataExecucao')}>`;
      const afterCursor =
        `</${p('dataExecucao')}>\n` +
        `${i1}<${p('procedimento')}>\n` +
        `${i2}<${p('codigoTabela')}>22</${p('codigoTabela')}>\n` +
        `${i2}<${p('codigoProcedimento')}></${p('codigoProcedimento')}>\n` +
        `${i2}<${p('descricaoProcedimento')}></${p('descricaoProcedimento')}>\n` +
        `${i1}</${p('procedimento')}>\n` +
        `${i1}<${p('quantidadeExecutada')}>1</${p('quantidadeExecutada')}>\n` +
        `${i1}<${p('reducaoAcrescimo')}>1.00</${p('reducaoAcrescimo')}>\n` +
        `${i1}<${p('valorUnitario')}>0.00</${p('valorUnitario')}>\n` +
        `${i1}<${p('valorTotal')}>0.00</${p('valorTotal')}>\n` +
        `${indent}</${p('procedimentoExecutado')}>`;
      return { text: beforeCursor + afterCursor, cursorOffset: beforeCursor.length };
    },
  },
  {
    label: 'equipeSadt (bloco completo)',
    detail: 'Insere membro da equipe executante SADT',
    parentTags: ['procedimentoExecutado'],
    build: (ns, indent) => {
      const i1 = `${indent}  `;
      const i2 = `${indent}    `;
      const p = (t: string) => `${ns}${t}`;
      const beforeCursor =
        `<${p('equipeSadt')}>\n` +
        `${i1}<${p('grauPart')}>12</${p('grauPart')}>\n` +
        `${i1}<${p('codProfissional')}>\n` +
        `${i2}<${p('cpfContratado')}>`;
      const afterCursor =
        `</${p('cpfContratado')}>\n` +
        `${i1}</${p('codProfissional')}>\n` +
        `${i1}<${p('nomeProf')}></${p('nomeProf')}>\n` +
        `${i1}<${p('conselho')}>06</${p('conselho')}>\n` +
        `${i1}<${p('numeroConselhoProfissional')}></${p('numeroConselhoProfissional')}>\n` +
        `${i1}<${p('UF')}>35</${p('UF')}>\n` +
        `${i1}<${p('CBOS')}>225125</${p('CBOS')}>\n` +
        `${indent}</${p('equipeSadt')}>`;
      return { text: beforeCursor + afterCursor, cursorOffset: beforeCursor.length };
    },
  },
  {
    label: 'guiaConsulta (bloco completo)',
    detail: 'Insere nova guia de Consulta padrão ANS',
    parentTags: ['guiasTISS'],
    build: (ns, indent) => {
      const i1 = `${indent}  `;
      const i2 = `${indent}    `;
      const p = (t: string) => `${ns}${t}`;
      const beforeCursor =
        `<${p('guiaConsulta')}>\n` +
        `${i1}<${p('cabecalhoConsulta')}>\n` +
        `${i2}<${p('registroANS')}>`;
      const afterCursor =
        `</${p('registroANS')}>\n` +
        `${i2}<${p('numeroGuiaPrestador')}></${p('numeroGuiaPrestador')}>\n` +
        `${i1}</${p('cabecalhoConsulta')}>\n` +
        `${i1}<${p('numeroGuiaOperadora')}></${p('numeroGuiaOperadora')}>\n` +
        `${i1}<${p('dadosBeneficiario')}>\n` +
        `${i2}<${p('numeroCarteira')}></${p('numeroCarteira')}>\n` +
        `${i2}<${p('atendimentoRN')}>N</${p('atendimentoRN')}>\n` +
        `${i1}</${p('dadosBeneficiario')}>\n` +
        `${i1}<${p('contratadoExecutante')}>\n` +
        `${i2}<${p('cnpjContratado')}></${p('cnpjContratado')}>\n` +
        `${i2}<${p('CNES')}></${p('CNES')}>\n` +
        `${i1}</${p('contratadoExecutante')}>\n` +
        `${i1}<${p('profissionalExecutante')}>\n` +
        `${i2}<${p('nomeProfissional')}></${p('nomeProfissional')}>\n` +
        `${i2}<${p('conselhoProfissional')}>06</${p('conselhoProfissional')}>\n` +
        `${i2}<${p('numeroConselhoProfissional')}></${p('numeroConselhoProfissional')}>\n` +
        `${i2}<${p('UF')}>35</${p('UF')}>\n` +
        `${i2}<${p('CBOS')}>225125</${p('CBOS')}>\n` +
        `${i1}</${p('profissionalExecutante')}>\n` +
        `${i1}<${p('dadosAtendimento')}>\n` +
        `${i2}<${p('dataAtendimento')}></${p('dataAtendimento')}>\n` +
        `${i2}<${p('tipoConsulta')}>1</${p('tipoConsulta')}>\n` +
        `${i2}<${p('regimeAtendimento')}>01</${p('regimeAtendimento')}>\n` +
        `${i2}<${p('indicacaoAcidente')}>9</${p('indicacaoAcidente')}>\n` +
        `${i2}<${p('procedimento')}>\n` +
        `${i2}  <${p('codigoTabela')}>22</${p('codigoTabela')}>\n` +
        `${i2}  <${p('codigoProcedimento')}>10101012</${p('codigoProcedimento')}>\n` +
        `${i2}  <${p('valorProcedimento')}>0.00</${p('valorProcedimento')}>\n` +
        `${i2}</${p('procedimento')}>\n` +
        `${i1}</${p('dadosAtendimento')}>\n` +
        `${indent}</${p('guiaConsulta')}>`;
      return { text: beforeCursor + afterCursor, cursorOffset: beforeCursor.length };
    },
  },
  {
    label: 'guiaSP-SADT (bloco completo)',
    detail: 'Insere nova guia SP-SADT padrão ANS',
    parentTags: ['guiasTISS'],
    build: (ns, indent) => {
      const i1 = `${indent}  `;
      const i2 = `${indent}    `;
      const i3 = `${indent}      `;
      const p = (t: string) => `${ns}${t}`;
      const beforeCursor =
        `<${p('guiaSP-SADT')}>\n` +
        `${i1}<${p('cabecalhoGuia')}>\n` +
        `${i2}<${p('registroANS')}>`;
      const afterCursor =
        `</${p('registroANS')}>\n` +
        `${i2}<${p('numeroGuiaPrestador')}></${p('numeroGuiaPrestador')}>\n` +
        `${i1}</${p('cabecalhoGuia')}>\n` +
        `${i1}<${p('dadosAutorizacao')}>\n` +
        `${i2}<${p('numeroGuiaOperadora')}></${p('numeroGuiaOperadora')}>\n` +
        `${i2}<${p('dataAutorizacao')}></${p('dataAutorizacao')}>\n` +
        `${i2}<${p('senha')}></${p('senha')}>\n` +
        `${i1}</${p('dadosAutorizacao')}>\n` +
        `${i1}<${p('dadosBeneficiario')}>\n` +
        `${i2}<${p('numeroCarteira')}></${p('numeroCarteira')}>\n` +
        `${i2}<${p('atendimentoRN')}>N</${p('atendimentoRN')}>\n` +
        `${i1}</${p('dadosBeneficiario')}>\n` +
        `${i1}<${p('dadosSolicitante')}>\n` +
        `${i2}<${p('contratadoSolicitante')}>\n` +
        `${i3}<${p('cnpjContratado')}></${p('cnpjContratado')}>\n` +
        `${i2}</${p('contratadoSolicitante')}>\n` +
        `${i2}<${p('profissionalSolicitante')}>\n` +
        `${i3}<${p('nomeProfissional')}></${p('nomeProfissional')}>\n` +
        `${i3}<${p('conselhoProfissional')}>06</${p('conselhoProfissional')}>\n` +
        `${i3}<${p('numeroConselhoProfissional')}></${p('numeroConselhoProfissional')}>\n` +
        `${i3}<${p('UF')}>35</${p('UF')}>\n` +
        `${i3}<${p('CBOS')}>225125</${p('CBOS')}>\n` +
        `${i2}</${p('profissionalSolicitante')}>\n` +
        `${i1}</${p('dadosSolicitante')}>\n` +
        `${i1}<${p('dadosSolicitacao')}>\n` +
        `${i2}<${p('dataSolicitacao')}></${p('dataSolicitacao')}>\n` +
        `${i2}<${p('caraterAtendimento')}>1</${p('caraterAtendimento')}>\n` +
        `${i1}</${p('dadosSolicitacao')}>\n` +
        `${i1}<${p('dadosExecutante')}>\n` +
        `${i2}<${p('contratadoExecutante')}>\n` +
        `${i3}<${p('cnpjContratado')}></${p('cnpjContratado')}>\n` +
        `${i2}</${p('contratadoExecutante')}>\n` +
        `${i2}<${p('CNES')}></${p('CNES')}>\n` +
        `${i1}</${p('dadosExecutante')}>\n` +
        `${i1}<${p('dadosAtendimento')}>\n` +
        `${i2}<${p('tipoAtendimento')}>23</${p('tipoAtendimento')}>\n` +
        `${i2}<${p('indicacaoAcidente')}>9</${p('indicacaoAcidente')}>\n` +
        `${i2}<${p('regimeAtendimento')}>01</${p('regimeAtendimento')}>\n` +
        `${i1}</${p('dadosAtendimento')}>\n` +
        `${i1}<${p('procedimentosExecutados')}>\n` +
        `${i2}<${p('procedimentoExecutado')}>\n` +
        `${i3}<${p('sequencialItem')}>1</${p('sequencialItem')}>\n` +
        `${i3}<${p('dataExecucao')}></${p('dataExecucao')}>\n` +
        `${i3}<${p('procedimento')}>\n` +
        `${i3}  <${p('codigoTabela')}>22</${p('codigoTabela')}>\n` +
        `${i3}  <${p('codigoProcedimento')}></${p('codigoProcedimento')}>\n` +
        `${i3}  <${p('descricaoProcedimento')}></${p('descricaoProcedimento')}>\n` +
        `${i3}</${p('procedimento')}>\n` +
        `${i3}<${p('quantidadeExecutada')}>1</${p('quantidadeExecutada')}>\n` +
        `${i3}<${p('reducaoAcrescimo')}>1.00</${p('reducaoAcrescimo')}>\n` +
        `${i3}<${p('valorUnitario')}>0.00</${p('valorUnitario')}>\n` +
        `${i3}<${p('valorTotal')}>0.00</${p('valorTotal')}>\n` +
        `${i2}</${p('procedimentoExecutado')}>\n` +
        `${i1}</${p('procedimentosExecutados')}>\n` +
        `${i1}<${p('valorTotal')}>\n` +
        `${i2}<${p('valorProcedimentos')}>0.00</${p('valorProcedimentos')}>\n` +
        `${i2}<${p('valorTotalGeral')}>0.00</${p('valorTotalGeral')}>\n` +
        `${i1}</${p('valorTotal')}>\n` +
        `${indent}</${p('guiaSP-SADT')}>`;
      return { text: beforeCursor + afterCursor, cursorOffset: beforeCursor.length };
    },
  },
];

/**
 * Detecta o prefixo de namespace predominante no XML (ex: "ans:", "tiss:", ou "").
 */
export function detectarPrefixoNamespace(docText: string): string {
  const xmlnsMatch = docText.match(/xmlns:([a-zA-Z0-9_-]+)=["'][^"']*ans\.gov\.br/i);
  if (xmlnsMatch) return `${xmlnsMatch[1]}:`;
  const tagPrefixMatch = docText.match(/<([a-zA-Z0-9_-]+):(?:mensagemTISS|cabecalho|guiaConsulta|guiaSP-SADT)\b/);
  if (tagPrefixMatch) return `${tagPrefixMatch[1]}:`;
  return '';
}

/**
 * Analisa a pilha de tags abertas até `pos` para descobrir o elemento pai atual.
 */
export function detectarTagPai(docText: string, pos: number): string | null {
  const slice = docText.slice(0, pos);
  const stack: string[] = [];
  const tagRegex = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([a-zA-Z0-9_:-]+)(?:\s[^>]*)?(\/?)>/g;
  let m: RegExpExecArray | null;

  while ((m = tagRegex.exec(slice)) !== null) {
    if (!m[2]) continue; // comentário ou PI <?xml ...?>
    const isClosing = m[1] === '/';
    const isSelfClosing = m[3] === '/';
    if (isSelfClosing) continue;

    const rawName = m[2];
    const localName = rawName.includes(':') ? rawName.split(':').slice(1).join(':') : rawName;

    if (!isClosing) {
      stack.push(localName);
    } else {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i] === localName) {
          stack.length = i;
          break;
        }
      }
    }
  }

  return stack.length > 0 ? stack[stack.length - 1] : null;
}

const DATE_TAGS = new Set([
  'dataExecucao',
  'dataAtendimento',
  'dataAutorizacao',
  'dataSolicitacao',
  'dataRegistroTransacao',
  'dataValidadeSenha',
]);

const TIME_TAGS = new Set(['horaInicial', 'horaFinal', 'horaRegistroTransacao']);

function formatTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatNowTime(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

function createTagCompletion(
  spec: TagSpec,
  nsPrefix: string,
  hasLeadingLt: boolean,
  hasClosingBracketAfter: boolean,
  boost: number,
  sectionName: string
): Completion {
  const fullTag = `${nsPrefix}${spec.tag}`;
  return {
    label: `<${fullTag}>`,
    detail: spec.description,
    type: spec.isContainer ? 'class' : 'property',
    boost,
    section: sectionName,
    apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
      const insertFrom = hasLeadingLt ? from - 1 : from;
      if (hasClosingBracketAfter) {
        const snippet = `<${fullTag}`;
        view.dispatch({
          changes: { from: insertFrom, to, insert: snippet },
          selection: EditorSelection.cursor(insertFrom + snippet.length),
          annotations: pickedCompletion.of(_completion),
        });
        return;
      }

      if (spec.isContainer) {
        const line = view.state.doc.lineAt(insertFrom);
        const indentMatch = line.text.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        const openPart = `<${fullTag}>\n${indent}  `;
        const closePart = `\n${indent}</${fullTag}>`;
        view.dispatch({
          changes: { from: insertFrom, to, insert: openPart + closePart },
          selection: EditorSelection.cursor(insertFrom + openPart.length),
          annotations: pickedCompletion.of(_completion),
        });
      } else {
        const openPart = `<${fullTag}>`;
        const closePart = `</${fullTag}>`;
        view.dispatch({
          changes: { from: insertFrom, to, insert: openPart + closePart },
          selection: EditorSelection.cursor(insertFrom + openPart.length),
          annotations: pickedCompletion.of(_completion),
        });
      }
    },
  };
}

/**
 * Fonte principal de autocomplete TISS ANS para CodeMirror 6.
 */
export function tissCompletionSource(context: CompletionContext): CompletionResult | null {
  const docText = context.state.doc.toString();
  const pos = context.pos;
  const line = context.state.doc.lineAt(pos);
  const textBeforeOnLine = line.text.slice(0, pos - line.from);
  const textAfterOnLine = line.text.slice(pos - line.from);
  const nsPrefix = detectarPrefixoNamespace(docText);

  // 1. Modo Tag: usuário digitou "<" ou "<ans:..."
  const openTagMatch = textBeforeOnLine.match(/<([a-zA-Z0-9_:-]*)$/);
  if (openTagMatch) {
    const typed = openTagMatch[1];
    const from = pos - typed.length;
    const hasClosingBracketAfter = /^\s*>/.test(textAfterOnLine);
    const parentTag = detectarTagPai(docText, from - 1);
    const allowedChildren = parentTag ? TISS_PARENT_CHILDREN[parentTag] || [] : [];
    const allowedSet = new Set(allowedChildren);

    const options: Completion[] = [];

    // Snippets completos para o pai atual
    if (parentTag && !hasClosingBracketAfter) {
      for (const snip of TISS_SNIPPETS) {
        if (snip.parentTags.includes(parentTag)) {
          const indentMatch = line.text.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          options.push({
            label: `<${nsPrefix}${snip.label}`,
            detail: snip.detail,
            type: 'keyword',
            boost: 95,
            section: 'Blocos TISS',
            apply: (view, completion, sFrom, sTo) => {
              const built = snip.build(nsPrefix, indent);
              const insertFrom = sFrom - 1;
              view.dispatch({
                changes: { from: insertFrom, to: sTo, insert: built.text },
                selection: EditorSelection.cursor(insertFrom + built.cursorOffset),
                annotations: pickedCompletion.of(completion),
              });
            },
          });
        }
      }
    }

    // Tags filhas válidas do bloco pai atual
    for (const childName of allowedChildren) {
      const spec = TISS_TAG_META[childName] || { tag: childName, description: `Elemento TISS <${childName}>` };
      options.push(
        createTagCompletion(
          spec,
          nsPrefix,
          true,
          hasClosingBracketAfter,
          80,
          parentTag ? `Permitido em <${parentTag}>` : 'Tags TISS ANS'
        )
      );
    }

    // Catálogo geral TISS como alternativa secundária
    for (const key of Object.keys(TISS_TAG_META)) {
      if (allowedSet.has(key)) continue;
      options.push(
        createTagCompletion(
          TISS_TAG_META[key],
          nsPrefix,
          true,
          hasClosingBracketAfter,
          10,
          'Catálogo TISS ANS'
        )
      );
    }

    return {
      from,
      options,
      validFor: /^[a-zA-Z0-9_:-]*$/,
    };
  }

  // 2. Modo Valor Interno: cursor dentro de <tagName>texto|</tagName> (ou sem fechar ainda)
  const insideValueMatch = textBeforeOnLine.match(/<([a-zA-Z0-9_:-]+)>([^<]*)$/);
  if (insideValueMatch) {
    const rawTag = insideValueMatch[1];
    const localTag = rawTag.includes(':') ? rawTag.split(':').slice(1).join(':') : rawTag;
    const typedVal = insideValueMatch[2];
    const from = pos - typedVal.length;

    // Procedimentos TUSS / CBHPM em <codigoProcedimento>
    if (localTag === 'codigoProcedimento') {
      const query = typedVal.trim().toLowerCase();
      if (!context.explicit && query.length === 0) {
        // Quando usuário acabou de entrar ou está vazio mas explícito, ou começou a digitar
        // Ainda assim oferecemos os principais quando explícito ou ao digitar >= 1 caractere
        return null;
      }

      const items = Object.values(TABELA_CBHPM_5ED);
      const matched = items
        .filter((item) => {
          if (!query) return true;
          return (
            item.codigo.toLowerCase().includes(query) ||
            item.descricao.toLowerCase().includes(query)
          );
        })
        .slice(0, 40)
        .map((item): Completion => ({
          label: item.codigo,
          displayLabel: `${item.codigo} — ${item.descricao}`,
          detail: item.valorReferencia ? `Ref: R$ ${item.valorReferencia.toFixed(2)}` : 'TUSS/CBHPM',
          info: `${item.descricao}${item.porte ? ` · Porte ${item.porte}` : ''}`,
          type: 'enum',
          apply: item.codigo,
        }));

      if (matched.length === 0) return null;
      return {
        from,
        options: matched,
        filter: false,
      };
    }

    // Domínios estáticos dm_*
    const domain = TISS_VALUE_DOMAINS[localTag];
    if (domain && domain.length > 0) {
      return {
        from,
        options: domain.map((opt, idx): Completion => ({
          label: opt.value,
          displayLabel: `${opt.label} — ${opt.detail}`,
          type: 'enum',
          boost: domain.length - idx,
          info: opt.info,
          apply: opt.value,
        })),
        validFor: /^[a-zA-Z0-9._-]*$/,
      };
    }

    // Sugestão rápida de Data / Hora
    if (DATE_TAGS.has(localTag)) {
      const today = formatTodayIso();
      return {
        from,
        options: [
          {
            label: today,
            displayLabel: `${today} — Data atual (AAAA-MM-DD)`,
            type: 'constant',
            apply: today,
          },
        ],
        validFor: /^[0-9-]*$/,
      };
    }

    if (TIME_TAGS.has(localTag)) {
      const now = formatNowTime();
      return {
        from,
        options: [
          {
            label: now,
            displayLabel: `${now} — Hora atual (HH:MM:SS)`,
            type: 'constant',
            apply: now,
          },
        ],
        validFor: /^[0-9:]*$/,
      };
    }
  }

  // 3. Modo Explícito (Ctrl+Espaço) entre tags (em espaço em branco)
  if (context.explicit && /^\s*$/.test(textBeforeOnLine)) {
    const parentTag = detectarTagPai(docText, pos);
    const allowedChildren = parentTag ? TISS_PARENT_CHILDREN[parentTag] || [] : [];
    const indentMatch = line.text.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    const options: Completion[] = [];

    if (parentTag) {
      for (const snip of TISS_SNIPPETS) {
        if (snip.parentTags.includes(parentTag)) {
          options.push({
            label: snip.label,
            detail: snip.detail,
            type: 'keyword',
            boost: 95,
            section: 'Blocos TISS',
            apply: (view, completion, sFrom, sTo) => {
              const built = snip.build(nsPrefix, indent);
              view.dispatch({
                changes: { from: sFrom, to: sTo, insert: built.text },
                selection: EditorSelection.cursor(sFrom + built.cursorOffset),
                annotations: pickedCompletion.of(completion),
              });
            },
          });
        }
      }
    }

    const targets = allowedChildren.length > 0 ? allowedChildren : Object.keys(TISS_TAG_META);
    for (const childName of targets) {
      const spec = TISS_TAG_META[childName] || { tag: childName, description: `Elemento TISS <${childName}>` };
      options.push(
        createTagCompletion(
          spec,
          nsPrefix,
          false,
          false,
          allowedChildren.length > 0 ? 80 : 20,
          parentTag ? `Permitido em <${parentTag}>` : 'Tags TISS ANS'
        )
      );
    }

    return {
      from: pos,
      options,
    };
  }

  return null;
}

/**
 * Extensão completa de autocomplete TISS ANS + estilização clara/escura para CodeMirror 6.
 */
export function getTissAutocompleteExtension(dark: boolean) {
  const theme = EditorView.theme({
    '.cm-tooltip.cm-tooltip-autocomplete': {
      backgroundColor: dark ? '#161b29' : '#ffffff',
      border: dark ? '1px solid #2c354d' : '1px solid #cbd5e1',
      borderRadius: '8px',
      boxShadow: dark
        ? '0 10px 30px rgba(0, 0, 0, 0.55)'
        : '0 10px 25px rgba(15, 23, 42, 0.14)',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      overflow: 'hidden',
      zIndex: '60',
    },
    '.cm-tooltip-autocomplete ul': {
      maxHeight: '260px',
    },
    '.cm-tooltip-autocomplete ul li': {
      padding: '5px 10px',
      color: dark ? '#e2e8f0' : '#1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: dark ? '#263452' : '#e0f2fe',
      color: dark ? '#ffffff' : '#0c4a6e',
    },
    '.cm-completionLabel': {
      fontWeight: '500',
    },
    '.cm-completionDetail': {
      fontFamily: 'var(--font-sans)',
      fontSize: '11px',
      opacity: '0.75',
      fontStyle: 'normal',
      marginLeft: 'auto',
      maxWidth: '260px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    '.cm-completionSection': {
      fontFamily: 'var(--font-sans)',
      fontSize: '10px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      padding: '4px 10px',
      color: dark ? '#94a3b8' : '#64748b',
      backgroundColor: dark ? '#101420' : '#f8fafc',
      borderBottom: dark ? '1px solid #1e2538' : '1px solid #e2e8f0',
    },
    '.cm-tooltip.cm-completionInfo': {
      backgroundColor: dark ? '#161b29' : '#ffffff',
      border: dark ? '1px solid #2c354d' : '1px solid #cbd5e1',
      color: dark ? '#cbd5e1' : '#334155',
      borderRadius: '8px',
      padding: '8px 10px',
      fontFamily: 'var(--font-sans)',
      fontSize: '12px',
    },
  });

  return [
    theme,
    autocompletion({
      override: [tissCompletionSource],
      activateOnTyping: true,
      activateOnTypingDelay: 80,
      maxRenderedOptions: 60,
      icons: true,
      activateOnCompletion: (completion) => {
        // Quando o usuário insere uma tag folha (não container), abre automaticamente
        // o seletor de valores (dm_*) se houver domínio mapeado para ela.
        if (completion.type !== 'property') return false;
        const match = completion.label.match(/^<(?:[a-zA-Z0-9_-]+:)?([a-zA-Z0-9_-]+)>$/);
        if (!match) return false;
        const tag = match[1];
        return Boolean(TISS_VALUE_DOMAINS[tag]) || DATE_TAGS.has(tag) || TIME_TAGS.has(tag);
      },
    }),
  ];
}
