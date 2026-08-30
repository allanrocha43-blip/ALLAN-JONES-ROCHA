// Tabela de Procedimentos TISS - Referência Básica para Validação
// Em um sistema real em produção, isso seria consumido via banco de dados ou API (Ex: Cloud SQL).

const TABELA_TISS: Record<string, string> = {
  // Consultas
  '10101012': 'CONSULTA EM CONSULTÓRIO (NO HORÁRIO NORMAL OU PREESTABELECIDO)',
  '10101020': 'CONSULTA EM PRONTO SOCORRO',
  '10101039': 'CONSULTA EM CONSULTÓRIO (NO HORÁRIO NORMAL OU PREESTABELECIDO)',
  '10102019': 'VISITA HOSPITALAR (PACIENTE INTERNADO)',
  
  // Exames Laboratoriais
  '40304361': 'HEMOGRAMA COM CONTAGEM DE PLAQUETAS OU FRAÇÕES (ERITROGRAMA, LEUCOGRAMA, PLAQUETAS)',
  '40301133': 'GLICOSE',
  '40302580': 'UREIA',
  '40301630': 'CREATININA',
  '40301540': 'COLESTEROL TOTAL',
  '40301559': 'COLESTEROL HDL',
  '40301575': 'COLESTEROL LDL',
  '40301567': 'COLESTEROL VLDL',
  '40301729': 'TRIGLICERÍDEOS',
  '40310248': 'URINA - ROTINA (EAS)',
  '40316033': 'HEMOGLOBINA GLICADA (A1C)',
  '40302733': 'TSH - HORMÔNIO TIREOESTIMULANTE',
  '40302725': 'T4 LIVRE',
  
  // Imagem
  '40801012': 'RADIOGRAFIA DE TÓRAX (PA)',
  '40801020': 'RADIOGRAFIA DE TÓRAX (PA E PERFIL)',
  '40901114': 'ULTRASSONOGRAFIA DE ABDOME TOTAL',
  '40901122': 'ULTRASSONOGRAFIA DE ABDOME SUPERIOR',
  '41101014': 'TOMOGRAFIA COMPUTADORIZADA DE CRÂNIO',
  '41101057': 'TOMOGRAFIA COMPUTADORIZADA DE TÓRAX',
  
  // Cardiologia
  '40101010': 'ELETROCARDIOGRAMA DE REPOUSO',
  '40101036': 'TESTE ERGOMÉTRICO',
  '40101044': 'HOLTER DE 24 HORAS',
  '40101060': 'MONITORIZAÇÃO AMBULATORIAL DA PRESSÃO ARTERIAL (MAPA)',
  '40902110': 'ECOCARDIOGRAMA TRANSTORÁCICO'
};

// Função para buscar a descrição padrão do procedimento
export function getDescricaoProcedimentoTISS(codigo: string): string | null {
  // Limpa o código para garantir correspondência (ex: remove pontos se houver)
  const cleanCode = codigo.replace(/[^0-9]/g, '');
  return TABELA_TISS[cleanCode] || null;
}

// Função para verificar se a descrição informada no XML bate razoavelmente com a tabela
export function isDescricaoValida(codigo: string, descricaoInformada: string): boolean {
  const descricaoTiss = getDescricaoProcedimentoTISS(codigo);
  if (!descricaoTiss) return true; // Se o código não estiver no nosso mock, pulamos a validação estrita para não gerar falsos positivos

  const descTissNorm = descricaoTiss.toLowerCase().trim();
  const descInfoNorm = descricaoInformada.toLowerCase().trim();

  // Validação flexível: Se a descrição informada estiver contida na descrição da tabela ou vice-versa, consideramos válida.
  // Muitas vezes o sistema fatura abreviado: "CONSULTA EM CONSULTORIO"
  return descTissNorm.includes(descInfoNorm) || descInfoNorm.includes(descTissNorm);
}
