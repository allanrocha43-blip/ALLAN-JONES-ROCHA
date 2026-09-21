// Tabela de Procedimentos TISS / CBHPM 5ª Edição - Referência para Validação e Cobrança

export interface CbhpmItem {
  codigo: string;
  descricao: string;
  porte?: string;
  valorPorte?: number;
  custoOperacionalUco?: number;
  custoOperacionalRs?: number;
  auxiliares?: number;
  porteAnestesico?: number;
  filmesM2?: number;
  valorReferencia?: number;
}

export const TABELA_CBHPM_5ED: Record<string, CbhpmItem> = {
  // Consultas e Visitas
  '10101012': { codigo: '10101012', descricao: 'Em consultório (no horário normal ou preestabelecido)', porte: '2B', valorPorte: 54.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 92.21 },
  '10101020': { codigo: '10101020', descricao: 'Em domicílio', porte: '3A', valorPorte: 88.00, auxiliares: 0, porteAnestesico: 0 },
  '10101039': { codigo: '10101039', descricao: 'Em pronto socorro', porte: '2B', valorPorte: 54.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 92.21 },
  '10102019': { codigo: '10102019', descricao: 'Visita hospitalar a paciente internado', porte: '2A', valorPorte: 40.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 45.08 },
  '10103015': { codigo: '10103015', descricao: 'Atendimento ao recém-nascido em berçário', porte: '3C', valorPorte: 128.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 144.26 },
  '10103023': { codigo: '10103023', descricao: 'Atendimento ao recém-nascido em sala de parto (baixo risco)', porte: '4C', valorPorte: 189.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 213.01 },
  '10103031': { codigo: '10103031', descricao: 'Atendimento ao recém-nascido em sala de parto (alto risco)', porte: '5B', valorPorte: 220.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 247.95 },
  '10104011': { codigo: '10104011', descricao: 'Atendimento do intensivista diarista (por dia e por paciente)', porte: '2B', valorPorte: 54.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 60.86 },
  '10104020': { codigo: '10104020', descricao: 'Atendimento médico do intensivista em UTI geral ou pediátrica (plantão 12h)', porte: '3C', valorPorte: 128.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 144.26 },

  // Procedimentos Clínicos e Ambulatoriais
  '20101015': { codigo: '20101015', descricao: 'Acompanhamento clínico ambulatorial pós-transplante renal - por avaliação', porte: '2B', valorPorte: 54.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 60.86 },
  '20101074': { codigo: '20101074', descricao: 'Avaliação nutrológica (inclui consulta)', porte: '2B', valorPorte: 54.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 60.86 },
  '20101090': { codigo: '20101090', descricao: 'Avaliação da composição corporal por antropometria (inclui consulta)', porte: '2B', valorPorte: 54.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 60.86 },
  '20101104': { codigo: '20101104', descricao: 'Avaliação da composição corporal por bioimpedanciometria', porte: '1B', valorPorte: 20.00, custoOperacionalUco: 0.75, custoOperacionalRs: 8.63, auxiliares: 0, porteAnestesico: 0, valorReferencia: 32.26 },
  '20102011': { codigo: '20102011', descricao: 'Holter de 24 horas - 2 ou mais canais - analógico', porte: '2A', valorPorte: 40.00, custoOperacionalUco: 8.10, custoOperacionalRs: 93.15, auxiliares: 0, porteAnestesico: 0, valorReferencia: 150.07 },
  '20102020': { codigo: '20102020', descricao: 'Holter de 24 horas - 3 canais - digital', porte: '2A', valorPorte: 40.00, custoOperacionalUco: 12.00, custoOperacionalRs: 138.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 200.62 },
  '20102038': { codigo: '20102038', descricao: 'Monitorização ambulatorial da pressão arterial - MAPA (24 horas)', porte: '2A', valorPorte: 40.00, custoOperacionalUco: 12.00, custoOperacionalRs: 138.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 200.62 },
  '20103140': { codigo: '20103140', descricao: 'Bloqueio fenólico, alcoólico ou com toxina botulínica por segmento corporal', porte: '4A', valorPorte: 153.00, custoOperacionalUco: 1.95, custoOperacionalRs: 22.43, auxiliares: 0, porteAnestesico: 0, valorReferencia: 197.71 },
  '20103301': { codigo: '20103301', descricao: 'Infiltração de ponto gatilho (por músculo) ou agulhamento seco (por músculo)', porte: '3A', valorPorte: 88.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 99.18 },
  '20104049': { codigo: '20104049', descricao: 'Cateterismo vesical em retenção urinária', porte: '1C', valorPorte: 30.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 33.81 },
  '20104065': { codigo: '20104065', descricao: 'Cerumen - remoção (bilateral)', porte: '1B', valorPorte: 20.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 22.54 },
  '20104073': { codigo: '20104073', descricao: 'Crioterapia (grupo de até 5 lesões)', porte: '2A', valorPorte: 40.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 45.08 },
  '20104235': { codigo: '20104235', descricao: 'Terapia inalatória - por nebulização', porte: '1A', valorPorte: 10.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 11.27 },
  '20202016': { codigo: '20202016', descricao: 'Cardiotocografia anteparto', porte: '1B', valorPorte: 20.00, custoOperacionalUco: 1.74, custoOperacionalRs: 20.01, auxiliares: 0, porteAnestesico: 0, valorReferencia: 45.09 },

  // Cirurgia de Pele, Tecido Celular Subcutâneo e Anexos
  '30101018': { codigo: '30101018', descricao: 'Abrasão cirúrgica (por sessão)', porte: '3C', valorPorte: 128.00, auxiliares: 0, porteAnestesico: 2, valorReferencia: 144.26 },
  '30101077': { codigo: '30101077', descricao: 'Biópsia de pele, tumores superficiais, tecido celular subcutâneo, linfonodo superficial, etc', porte: '2B', valorPorte: 54.00, auxiliares: 1, porteAnestesico: 1, valorReferencia: 79.12 },
  '30101247': { codigo: '30101247', descricao: 'Curetagem e eletrocoagulação de CA de pele (por lesão)', porte: '3A', valorPorte: 88.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 99.18 },
  '30101255': { codigo: '30101255', descricao: 'Curetagem simples de lesões de pele (por grupo de até 5 lesões)', porte: '2A', valorPorte: 40.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 45.08 },
  '30101468': { codigo: '30101468', descricao: 'Exérese de lesão / tumor de pele e mucosas', porte: '3C', valorPorte: 128.00, auxiliares: 1, porteAnestesico: 0, valorReferencia: 187.54 },
  '30101492': { codigo: '30101492', descricao: 'Exérese e sutura simples de pequenas lesões (grupo de até 5 lesões)', porte: '3B', valorPorte: 112.00, auxiliares: 0, porteAnestesico: 2, valorReferencia: 126.23 },
  '30101506': { codigo: '30101506', descricao: 'Exérese tangencial (shaving) - (por grupo de até 5 lesões)', porte: '2C', valorPorte: 64.00, auxiliares: 0, porteAnestesico: 2, valorReferencia: 72.13 },
  '30101786': { codigo: '30101786', descricao: 'Sutura de extensos ferimentos com ou sem desbridamento', porte: '5B', valorPorte: 220.00, auxiliares: 1, porteAnestesico: 3, valorReferencia: 322.34 },
  '30101794': { codigo: '30101794', descricao: 'Sutura de pequenos ferimentos com ou sem desbridamento', porte: '2B', valorPorte: 54.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 60.86 },
  '30101948': { codigo: '30101948', descricao: 'Cantoplastia ungueal', porte: '3A', valorPorte: 88.00, auxiliares: 1, porteAnestesico: 2, valorReferencia: 128.94 },

  // Oftalmologia
  '30301041': { codigo: '30301041', descricao: 'Calázio', porte: '2B', valorPorte: 54.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 60.86 },
  '30301181': { codigo: '30301181', descricao: 'Ptose palpebral - correção cirúrgica - unilateral', porte: '7A', valorPorte: 331.00, auxiliares: 1, porteAnestesico: 2, valorReferencia: 484.97 },
  '30303060': { codigo: '30303060', descricao: 'Pterígio - exérese', porte: '3C', valorPorte: 128.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 144.26 },
  '30304032': { codigo: '30304032', descricao: 'Corpo estranho da córnea - retirada', porte: '2A', valorPorte: 40.00, auxiliares: 0, porteAnestesico: 3, valorReferencia: 45.08 },
  '30306019': { codigo: '30306019', descricao: 'Capsulotomia YAG ou cirúrgica', porte: '5A', valorPorte: 204.00, auxiliares: 0, porteAnestesico: 3, valorReferencia: 229.92 },
  '30306027': { codigo: '30306027', descricao: 'Facectomia com lente intra-ocular com facoemulsificação', porte: '10A', valorPorte: 715.00, auxiliares: 1, porteAnestesico: 5, valorReferencia: 1047.60 },
  '30306035': { codigo: '30306035', descricao: 'Facectomia com lente intra-ocular sem facoemulsificação', porte: '9B', valorPorte: 605.00, auxiliares: 1, porteAnestesico: 4, valorReferencia: 886.43 },
  '30307120': { codigo: '30307120', descricao: 'Vitrectomia vias pars plana', porte: '9C', valorPorte: 666.00, auxiliares: 1, porteAnestesico: 5, valorReferencia: 975.81 },
  '30310032': { codigo: '30310032', descricao: 'Cirurgias fistulizantes antiglaucomatosas (Trabeculectomia)', porte: '8A', valorPorte: 468.00, auxiliares: 1, porteAnestesico: 4, valorReferencia: 685.70 },
  '30312043': { codigo: '30312043', descricao: 'Fotocoagulação (laser) - por sessão - monocular', porte: '5A', valorPorte: 204.00, auxiliares: 0, porteAnestesico: 2, valorReferencia: 229.92 },

  // Otorrinolaringologia e Cabeça e Pescoço
  '30205034': { codigo: '30205034', descricao: 'Adeno-amigdalectomia', porte: '7A', valorPorte: 331.00, auxiliares: 1, porteAnestesico: 3, valorReferencia: 484.97 },
  '30403138': { codigo: '30403138', descricao: 'Timpanoplastia tipo I - miringoplastia - unilateral', porte: '8C', valorPorte: 520.00, auxiliares: 1, porteAnestesico: 3, valorReferencia: 761.89 },
  '30501369': { codigo: '30501369', descricao: 'Septoplastia (qualquer técnica sem vídeo)', porte: '8B', valorPorte: 490.00, auxiliares: 1, porteAnestesico: 3, valorReferencia: 717.94 },
  '30501458': { codigo: '30501458', descricao: 'Turbinectomia ou turbinoplastia - unilateral', porte: '3B', valorPorte: 112.00, auxiliares: 1, porteAnestesico: 1, valorReferencia: 164.10 },
  '30213053': { codigo: '30213053', descricao: 'Tireoidectomia total', porte: '9A', valorPorte: 555.00, auxiliares: 2, porteAnestesico: 5, valorReferencia: 1000.83 },

  // Sistema Digestivo e Parede Abdominal
  '31003079': { codigo: '31003079', descricao: 'Apendicectomia', porte: '8A', valorPorte: 468.00, auxiliares: 2, porteAnestesico: 3, valorReferencia: 791.20 },
  '31003583': { codigo: '31003583', descricao: 'Apendicectomia por videolaparoscopia', porte: '9C', valorPorte: 666.00, custoOperacionalUco: 36.50, custoOperacionalRs: 419.75, auxiliares: 2, porteAnestesico: 5, valorReferencia: 1599.01 },
  '31005128': { codigo: '31005128', descricao: 'Colecistectomia sem colangiografia', porte: '8C', valorPorte: 520.00, auxiliares: 2, porteAnestesico: 4, valorReferencia: 879.11 },
  '31005470': { codigo: '31005470', descricao: 'Colecistectomia com colangiografia por videolaparoscopia', porte: '10A', valorPorte: 715.00, custoOperacionalUco: 36.50, custoOperacionalRs: 419.75, auxiliares: 2, porteAnestesico: 6, valorReferencia: 1681.85 },
  '31005497': { codigo: '31005497', descricao: 'Colecistectomia sem colangiografia por videolaparoscopia', porte: '9C', valorPorte: 666.00, custoOperacionalUco: 34.47, custoOperacionalRs: 396.41, auxiliares: 2, porteAnestesico: 5, valorReferencia: 1572.70 },
  '31009115': { codigo: '31009115', descricao: 'Herniorrafia inguinal - unilateral', porte: '6C', valorPorte: 306.00, auxiliares: 1, porteAnestesico: 2, valorReferencia: 448.34 },
  '31009166': { codigo: '31009166', descricao: 'Herniorrafia umbilical', porte: '5A', valorPorte: 204.00, auxiliares: 1, porteAnestesico: 2, valorReferencia: 298.90 },
  '31004202': { codigo: '31004202', descricao: 'Hemorroidectomia aberta ou fechada, com ou sem esfincterotomia', porte: '6A', valorPorte: 255.00, auxiliares: 1, porteAnestesico: 3, valorReferencia: 373.62 },

  // Ortopedia e Traumatologia
  '30715180': { codigo: '30715180', descricao: 'Hérnia de disco tóraco-lombar - tratamento cirúrgico', porte: '9C', valorPorte: 666.00, auxiliares: 1, porteAnestesico: 5, valorReferencia: 975.81 },
  '30722276': { codigo: '30722276', descricao: 'Dedo em gatilho, capsulotomia / fasciotomia - tratamento cirúrgico', porte: '3C', valorPorte: 128.00, auxiliares: 1, porteAnestesico: 1, valorReferencia: 187.54 },
  '30724058': { codigo: '30724058', descricao: 'Artroplastia (qualquer técnica ou versão de quadril) - tratamento cirúrgico', porte: '11C', valorPorte: 1095.00, auxiliares: 3, porteAnestesico: 6, valorReferencia: 2098.02 },
  '30726034': { codigo: '30726034', descricao: 'Artroplastia total de joelho com implantes - tratamento cirúrgico', porte: '10B', valorPorte: 775.00, auxiliares: 2, porteAnestesico: 6, valorReferencia: 1310.21 },
  '30733057': { codigo: '30733057', descricao: 'Meniscectomia - um menisco', porte: '8C', valorPorte: 520.00, custoOperacionalUco: 33.80, custoOperacionalRs: 388.70, auxiliares: 1, porteAnestesico: 4, valorReferencia: 1199.98 },
  '30733073': { codigo: '30733073', descricao: 'Reconstrução, retencionamento ou reforço do ligamento cruzado anterior ou posterior', porte: '10C', valorPorte: 860.00, custoOperacionalUco: 38.50, custoOperacionalRs: 442.75, auxiliares: 1, porteAnestesico: 6, valorReferencia: 1759.06 },
  '30735068': { codigo: '30735068', descricao: 'Ruptura do manguito rotador', porte: '10C', valorPorte: 860.00, custoOperacionalUco: 38.50, custoOperacionalRs: 442.75, auxiliares: 1, porteAnestesico: 6, valorReferencia: 1759.06 },
  '30737079': { codigo: '30737079', descricao: 'Túnel do carpo - descompressão', porte: '9C', valorPorte: 666.00, custoOperacionalUco: 33.80, custoOperacionalRs: 388.70, auxiliares: 1, porteAnestesico: 5, valorReferencia: 1413.90 },

  // Urologia e Ginecologia
  '31102050': { codigo: '31102050', descricao: 'Colocação cistoscópica de duplo J unilateral', porte: '5B', valorPorte: 220.00, custoOperacionalUco: 4.96, custoOperacionalRs: 57.04, auxiliares: 1, porteAnestesico: 2, valorReferencia: 386.63 },
  '31102360': { codigo: '31102360', descricao: 'Ureterorrenolitotripsia flexível a laser unilateral', porte: '11A', valorPorte: 910.00, custoOperacionalUco: 221.96, custoOperacionalRs: 2552.54, auxiliares: 1, porteAnestesico: 5, valorReferencia: 4210.17 },
  '31103472': { codigo: '31103472', descricao: 'Retirada endoscópica de duplo J', porte: '3C', valorPorte: 128.00, custoOperacionalUco: 4.22, custoOperacionalRs: 48.53, auxiliares: 0, porteAnestesico: 2, valorReferencia: 198.96 },
  '31201130': { codigo: '31201130', descricao: 'Ressecção endoscópica da próstata (RTUP)', porte: '9B', valorPorte: 605.00, custoOperacionalUco: 19.99, custoOperacionalRs: 229.89, auxiliares: 1, porteAnestesico: 5, valorReferencia: 1145.53 },
  '31205046': { codigo: '31205046', descricao: 'Vasectomia unilateral', porte: '3C', valorPorte: 128.00, auxiliares: 1, porteAnestesico: 1, valorReferencia: 187.54 },
  '31206220': { codigo: '31206220', descricao: 'Postectomia', porte: '4C', valorPorte: 189.00, auxiliares: 1, porteAnestesico: 2, valorReferencia: 276.92 },
  '31303102': { codigo: '31303102', descricao: 'Histerectomia total - qualquer via', porte: '10A', valorPorte: 715.00, auxiliares: 2, porteAnestesico: 5, valorReferencia: 1208.77 },
  '31309054': { codigo: '31309054', descricao: 'Cesariana (feto único ou múltiplo)', porte: '8B', valorPorte: 490.00, auxiliares: 1, porteAnestesico: 5, valorReferencia: 717.94 },
  '31309127': { codigo: '31309127', descricao: 'Parto (via vaginal)', porte: '8C', valorPorte: 520.00, auxiliares: 0, porteAnestesico: 5, valorReferencia: 586.07 },

  // Métodos Gráficos e Diagnósticos
  '40101010': { codigo: '40101010', descricao: 'ECG convencional de até 12 derivações', porte: '1B', valorPorte: 20.00, custoOperacionalUco: 0.75, custoOperacionalRs: 8.63, auxiliares: 0, porteAnestesico: 0, valorReferencia: 32.26 },
  '40101037': { codigo: '40101037', descricao: 'Teste ergométrico computadorizado (inclui ECG basal convencional)', porte: '2A', valorPorte: 40.00, custoOperacionalUco: 8.87, custoOperacionalRs: 102.01, auxiliares: 0, porteAnestesico: 0, valorReferencia: 160.05 },
  '40101045': { codigo: '40101045', descricao: 'Teste ergométrico convencional - 3 ou mais derivações simultâneas', porte: '2A', valorPorte: 40.00, custoOperacionalUco: 7.16, custoOperacionalRs: 82.34, auxiliares: 0, porteAnestesico: 0, valorReferencia: 137.88 },
  '40103072': { codigo: '40103072', descricao: 'Audiometria tonal limiar com testes de discriminação', porte: '2A', valorPorte: 40.00, custoOperacionalUco: 0.78, custoOperacionalRs: 8.97, auxiliares: 0, porteAnestesico: 0, valorReferencia: 55.19 },
  '40103137': { codigo: '40103137', descricao: 'Campimetria computadorizada - monocular', porte: '2A', valorPorte: 40.00, custoOperacionalUco: 2.77, custoOperacionalRs: 31.86, auxiliares: 0, porteAnestesico: 0, valorReferencia: 80.98 },
  '40103170': { codigo: '40103170', descricao: 'EEG de rotina', porte: '2A', valorPorte: 40.00, custoOperacionalUco: 4.00, custoOperacionalRs: 46.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 96.93 },
  '40103315': { codigo: '40103315', descricao: 'Eletroneuromiografia de MMII', porte: '4B', valorPorte: 168.00, custoOperacionalUco: 9.60, custoOperacionalRs: 110.40, auxiliares: 0, porteAnestesico: 0, valorReferencia: 313.77 },
  '40103323': { codigo: '40103323', descricao: 'Eletroneuromiografia de MMSS', porte: '4B', valorPorte: 168.00, custoOperacionalUco: 9.60, custoOperacionalRs: 110.40, auxiliares: 0, porteAnestesico: 0, valorReferencia: 313.77 },
  '40103528': { codigo: '40103528', descricao: 'Polissonografia de noite inteira (PSG) (inclui polissonogramas)', porte: '3C', valorPorte: 128.00, custoOperacionalUco: 30.00, custoOperacionalRs: 345.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 533.10 },
  '40105075': { codigo: '40105075', descricao: 'Prova de função pulmonar completa (ou espirometria)', porte: '2B', valorPorte: 54.00, custoOperacionalUco: 4.00, custoOperacionalRs: 46.00, auxiliares: 0, porteAnestesico: 0, valorReferencia: 112.71 },

  // Endoscopia
  '40201082': { codigo: '40201082', descricao: 'Colonoscopia (inclui a retossigmoidoscopia)', porte: '6A', valorPorte: 255.00, custoOperacionalUco: 14.80, custoOperacionalRs: 170.18, auxiliares: 0, porteAnestesico: 0, valorReferencia: 479.20 },
  '40201120': { codigo: '40201120', descricao: 'Endoscopia digestiva alta', porte: '4A', valorPorte: 153.00, custoOperacionalUco: 12.58, custoOperacionalRs: 144.73, auxiliares: 0, porteAnestesico: 0, valorReferencia: 335.56 },
  '40201155': { codigo: '40201155', descricao: 'Histeroscopia diagnóstica', porte: '3B', valorPorte: 112.00, custoOperacionalUco: 2.78, custoOperacionalRs: 31.97, auxiliares: 0, porteAnestesico: 0, valorReferencia: 162.26 },
  '40202038': { codigo: '40202038', descricao: 'Endoscopia digestiva alta com biópsia e/ou citologia', porte: '4B', valorPorte: 168.00, custoOperacionalUco: 15.45, custoOperacionalRs: 177.68, auxiliares: 0, porteAnestesico: 0, valorReferencia: 389.60 },
  '40202542': { codigo: '40202542', descricao: 'Polipectomia de cólon (independente do número de pólipos)', porte: '9B', valorPorte: 605.00, custoOperacionalUco: 17.41, custoOperacionalRs: 200.20, auxiliares: 0, porteAnestesico: 0, valorReferencia: 907.51 },

  // Patologia Clínica (Laboratório)
  '40301109': { codigo: '40301109', descricao: 'Ácido láctico (lactato), dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 8.28, valorReferencia: 9.44 },
  '40301150': { codigo: '40301150', descricao: 'Ácido úrico, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40301222': { codigo: '40301222', descricao: 'Albumina, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40301281': { codigo: '40301281', descricao: 'Amilase, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 8.28, valorReferencia: 9.44 },
  '40301397': { codigo: '40301397', descricao: 'Bilirrubinas (direta, indireta e total), dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40301400': { codigo: '40301400', descricao: 'Cálcio, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40301583': { codigo: '40301583', descricao: 'Colesterol (HDL), dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 6.21, valorReferencia: 7.11 },
  '40301591': { codigo: '40301591', descricao: 'Colesterol (LDL), dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 8.28, valorReferencia: 9.44 },
  '40301605': { codigo: '40301605', descricao: 'Colesterol total, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40301630': { codigo: '40301630', descricao: 'Creatinina, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40301648': { codigo: '40301648', descricao: 'Creatino fosfoquinase total (CK), dosagem', porte: '1A', valorPorte: 0.40, custoOperacionalRs: 12.11, valorReferencia: 14.10 },
  '40301664': { codigo: '40301664', descricao: 'Creatino fosfoquinase - fração MB - atividade, dosagem', porte: '1A', valorPorte: 1.00, custoOperacionalRs: 24.12, valorReferencia: 28.31 },
  '40301729': { codigo: '40301729', descricao: 'Desidrogenase láctica, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 8.28, valorReferencia: 9.44 },
  '40301842': { codigo: '40301842', descricao: 'Ferro sérico, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 6.21, valorReferencia: 7.11 },
  '40301885': { codigo: '40301885', descricao: 'Fosfatase alcalina, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 8.28, valorReferencia: 9.44 },
  '40301931': { codigo: '40301931', descricao: 'Fósforo, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40301990': { codigo: '40301990', descricao: 'Gama-glutamil transferase, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 8.28, valorReferencia: 9.44 },
  '40302016': { codigo: '40302016', descricao: 'Gasometria (pH, pCO2, SA, O2, excesso base), dosagem', porte: '1A', valorPorte: 1.00, custoOperacionalRs: 20.29, valorReferencia: 23.99 },
  '40302040': { codigo: '40302040', descricao: 'Glicose, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40302318': { codigo: '40302318', descricao: 'Potássio, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40302423': { codigo: '40302423', descricao: 'Sódio, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40302512': { codigo: '40302512', descricao: 'Transaminase pirúvica (amino transferase de alanina / TGP), dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 8.28, valorReferencia: 9.44 },
  '40302504': { codigo: '40302504', descricao: 'Transaminase oxalacética (amino transferase aspartato / TGO), dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 8.28, valorReferencia: 9.44 },
  '40302547': { codigo: '40302547', descricao: 'Triglicerídeos, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 6.21, valorReferencia: 7.11 },
  '40302580': { codigo: '40302580', descricao: 'Uréia, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 4.45, valorReferencia: 5.13 },
  '40302733': { codigo: '40302733', descricao: 'Hemoglobina glicada (Fração A1c), dosagem', porte: '1A', valorPorte: 1.00, custoOperacionalRs: 37.57, valorReferencia: 43.47 },
  '40302830': { codigo: '40302830', descricao: 'Vitamina "D" 25 HIDROXI (Vitamina D3), dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 20.65, valorReferencia: 23.39 },
  '40304361': { codigo: '40304361', descricao: 'Hemograma com contagem de plaquetas ou frações (eritrograma, leucograma, plaquetas)', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 10.01, valorReferencia: 11.39 },
  '40304590': { codigo: '40304590', descricao: 'Tempo de protrombina (TP / TAP), determinação', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 6.52, valorReferencia: 7.46 },
  '40304639': { codigo: '40304639', descricao: 'Tempo de tromboplastina parcial ativada (TTPA / PTT)', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 6.52, valorReferencia: 7.46 },
  '40308383': { codigo: '40308383', descricao: 'Proteína C reativa, qualitativa, pesquisa (látex)', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 13.46, valorReferencia: 15.28 },
  '40308391': { codigo: '40308391', descricao: 'Proteína C reativa, quantitativa, dosagem (turbidimetria, nefelometria)', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 25.15, valorReferencia: 28.46 },
  '40311210': { codigo: '40311210', descricao: 'Rotina de urina (caracteres físicos, elementos anormais e sedimentoscopia / EAS)', porte: '1A', valorPorte: 0.40, custoOperacionalRs: 9.32, valorReferencia: 10.95 },
  '40316521': { codigo: '40316521', descricao: 'Tireoestimulante, hormônio (TSH), dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 23.47, valorReferencia: 26.57 },
  '40316491': { codigo: '40316491', descricao: 'T4 livre, dosagem', porte: '1A', valorPorte: 0.10, custoOperacionalRs: 29.36, valorReferencia: 33.20 },

  // Diagnóstico por Imagem (RX, US, TC, RM)
  '40801012': { codigo: '40801012', descricao: 'Crânio - 2 incidências', porte: '1B', valorPorte: 20.00, custoOperacionalRs: 15.07, valorReferencia: 44.39 },
  '40801063': { codigo: '40801063', descricao: 'Seios da face', porte: '1B', valorPorte: 20.00, custoOperacionalRs: 16.91, valorReferencia: 45.98 },
  '40802019': { codigo: '40802019', descricao: 'Coluna cervical - 3 incidências', porte: '1B', valorPorte: 20.00, custoOperacionalRs: 15.07, valorReferencia: 43.91 },
  '40802051': { codigo: '40802051', descricao: 'Coluna lombo-sacra - 3 incidências', porte: '1B', valorPorte: 20.00, custoOperacionalRs: 16.10, valorReferencia: 51.25 },
  '40805018': { codigo: '40805018', descricao: 'Tórax - 1 incidência', porte: '1B', valorPorte: 20.00, custoOperacionalRs: 9.55, valorReferencia: 38.51 },
  '40805026': { codigo: '40805026', descricao: 'Tórax - 2 incidências (PA e Perfil)', porte: '1B', valorPorte: 20.00, custoOperacionalRs: 13.57, valorReferencia: 48.26 },
  '40808033': { codigo: '40808033', descricao: 'Mamografia convencional bilateral', porte: '2C', valorPorte: 64.00, custoOperacionalRs: 31.74, valorReferencia: 107.90 },
  '40808041': { codigo: '40808041', descricao: 'Mamografia digital bilateral', porte: '2C', valorPorte: 64.00, custoOperacionalRs: 74.52, valorReferencia: 196.73 },
  '40808130': { codigo: '40808130', descricao: 'Densitometria óssea - rotina: coluna e fêmur (ou dois segmentos)', porte: '2C', valorPorte: 64.00, custoOperacionalRs: 117.88, valorReferencia: 204.98 },

  // Ultrassonografia
  '40901114': { codigo: '40901114', descricao: 'Ultrassonografia de mamas', porte: '2B', valorPorte: 54.00, custoOperacionalRs: 39.33, valorReferencia: 116.70 },
  '40901122': { codigo: '40901122', descricao: 'Ultrassonografia de abdome total (inclui abdome inferior)', porte: '3A', valorPorte: 88.00, custoOperacionalRs: 67.28, valorReferencia: 198.02 },
  '40901130': { codigo: '40901130', descricao: 'Ultrassonografia de abdome superior (fígado, vias biliares, vesícula, pâncreas e baço)', porte: '2C', valorPorte: 64.00, custoOperacionalRs: 44.39, valorReferencia: 139.42 },
  '40901181': { codigo: '40901181', descricao: 'Ultrassonografia de abdome inferior feminino (bexiga, útero, ovário e anexos)', porte: '2B', valorPorte: 54.00, custoOperacionalRs: 44.39, valorReferencia: 128.15 },
  '40901203': { codigo: '40901203', descricao: 'Ultrassonografia de órgãos superficiais (tireóide ou escroto ou pênis ou crânio)', porte: '2A', valorPorte: 40.00, custoOperacionalRs: 39.33, valorReferencia: 95.16 },
  '40901220': { codigo: '40901220', descricao: 'Ultrassonografia articular (por articulação)', porte: '2B', valorPorte: 54.00, custoOperacionalRs: 39.33, valorReferencia: 116.70 },
  '40901238': { codigo: '40901238', descricao: 'Ultrassonografia obstétrica', porte: '2A', valorPorte: 40.00, custoOperacionalRs: 30.48, valorReferencia: 85.18 },
  '40901300': { codigo: '40901300', descricao: 'Ultrassonografia transvaginal (inclui abdome inferior feminino)', porte: '2B', valorPorte: 54.00, custoOperacionalRs: 43.93, valorReferencia: 116.13 },
  '40901360': { codigo: '40901360', descricao: 'Doppler colorido de vasos cervicais arteriais bilateral (carótidas e vertebrais)', porte: '4A', valorPorte: 153.00, custoOperacionalRs: 94.99, valorReferencia: 302.51 },
  '40901475': { codigo: '40901475', descricao: 'Doppler colorido arterial de membro inferior - unilateral', porte: '5A', valorPorte: 204.00, custoOperacionalRs: 94.99, valorReferencia: 354.24 },
  '40901483': { codigo: '40901483', descricao: 'Doppler colorido venoso de membro inferior - unilateral', porte: '5A', valorPorte: 204.00, custoOperacionalRs: 124.32, valorReferencia: 387.29 },
  '40901106': { codigo: '40901106', descricao: 'Ecodopplercardiograma transtorácico', porte: '2A', valorPorte: 40.00, custoOperacionalRs: 230.00, valorReferencia: 315.81 },

  // Tomografia Computadorizada
  '41001010': { codigo: '41001010', descricao: 'Tomografia computadorizada de crânio ou sela túrsica ou órbitas', porte: '3B', valorPorte: 112.00, custoOperacionalRs: 219.65, valorReferencia: 407.63 },
  '41001036': { codigo: '41001036', descricao: 'Tomografia computadorizada de face ou seios da face', porte: '3B', valorPorte: 112.00, custoOperacionalRs: 257.37, valorReferencia: 450.15 },
  '41001079': { codigo: '41001079', descricao: 'Tomografia computadorizada de tórax', porte: '3B', valorPorte: 112.00, custoOperacionalRs: 257.37, valorReferencia: 467.07 },
  '41001095': { codigo: '41001095', descricao: 'Tomografia computadorizada de abdome total (abdome superior, pelve e retroperitônio)', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 430.68, valorReferencia: 714.27 },
  '41001109': { codigo: '41001109', descricao: 'Tomografia computadorizada de abdome superior', porte: '3B', valorPorte: 112.00, custoOperacionalRs: 257.37, valorReferencia: 467.07 },
  '41001117': { codigo: '41001117', descricao: 'Tomografia computadorizada de pelve ou bacia', porte: '3A', valorPorte: 88.00, custoOperacionalRs: 257.37, valorReferencia: 440.02 },
  '41001125': { codigo: '41001125', descricao: 'Tomografia computadorizada de coluna cervical ou dorsal ou lombar (até 3 segmentos)', porte: '3A', valorPorte: 88.00, custoOperacionalRs: 209.30, valorReferencia: 368.92 },
  '41001141': { codigo: '41001141', descricao: 'Tomografia computadorizada de articulação (ombro, cotovelo, punho, joelho, etc.) - unilateral', porte: '3A', valorPorte: 88.00, custoOperacionalRs: 257.37, valorReferencia: 440.02 },

  // Ressonância Magnética
  '41101014': { codigo: '41101014', descricao: 'Ressonância magnética de crânio (encéfalo)', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 543.26, valorReferencia: 891.93 },
  '41101111': { codigo: '41101111', descricao: 'Ressonância magnética de pescoço (nasofaringe, orofaringe, laringe, traquéia, tireóide)', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 543.26, valorReferencia: 891.93 },
  '41101120': { codigo: '41101120', descricao: 'Ressonância magnética de tórax (mediastino, pulmão, parede torácica)', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 583.97, valorReferencia: 937.81 },
  '41101162': { codigo: '41101162', descricao: 'Ressonância magnética de mama (unilateral)', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 543.26, valorReferencia: 891.93 },
  '41101170': { codigo: '41101170', descricao: 'Ressonância magnética de abdome superior (fígado, pâncreas, baço, rins, supra-renais)', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 583.97, valorReferencia: 937.81 },
  '41101189': { codigo: '41101189', descricao: 'Ressonância magnética de pelve (não inclui articulações coxofemorais)', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 543.26, valorReferencia: 891.93 },
  '41101227': { codigo: '41101227', descricao: 'Ressonância magnética de coluna cervical ou dorsal ou lombar', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 543.26, valorReferencia: 891.93 },
  '41101316': { codigo: '41101316', descricao: 'Ressonância magnética articular (por articulação)', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 543.26, valorReferencia: 891.93 },
  '41101359': { codigo: '41101359', descricao: 'Hidro-RM (colângio-RM ou uro-RM ou mielo-RM ou sialo-RM ou cistografia por RM)', porte: '3C', valorPorte: 128.00, custoOperacionalRs: 543.26, valorReferencia: 891.93 },
};

// Função para buscar o item completo da tabela CBHPM
export function getItemCBHPM(codigo: string): CbhpmItem | null {
  const cleanCode = codigo.replace(/[^0-9]/g, '');
  return TABELA_CBHPM_5ED[cleanCode] || null;
}

// Função para buscar a descrição padrão do procedimento
export function getDescricaoProcedimentoTISS(codigo: string): string | null {
  const item = getItemCBHPM(codigo);
  return item ? item.descricao.toUpperCase() : null;
}

// Função para verificar se a descrição informada no XML bate razoavelmente com a tabela
export function isDescricaoValida(codigo: string, descricaoInformada: string): boolean {
  const descricaoTiss = getDescricaoProcedimentoTISS(codigo);
  if (!descricaoTiss) return true; // Se o código não estiver no cadastro, pulamos para não gerar falsos positivos

  const normalize = (str: string) => str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const descTissNorm = normalize(descricaoTiss);
  const descInfoNorm = normalize(descricaoInformada);

  if (descTissNorm === descInfoNorm) return true;
  if (descTissNorm.includes(descInfoNorm) || descInfoNorm.includes(descTissNorm)) return true;

  // Comparação por palavras-chave principais
  const wordsTiss = descTissNorm.split(' ').filter(w => w.length > 3);
  const wordsInfo = descInfoNorm.split(' ').filter(w => w.length > 3);
  const matchCount = wordsInfo.filter(w => wordsTiss.includes(w)).length;

  return matchCount >= Math.min(2, Math.max(1, wordsInfo.length * 0.5));
}

