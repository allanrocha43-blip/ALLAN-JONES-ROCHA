export type Severity = "crit" | "warn" | "info";

export const lotes = [
  {
    id: "LOT-2024-0198",
    operadora: "VITA+ Seguros",
    guias: 184,
    valor: "R$ 482.190",
    status: "erros" as const,
    badge: "23 erros",
    progresso: 68,
  },
  {
    id: "LOT-2024-0197",
    operadora: "MEDICAR",
    guias: 96,
    valor: "R$ 210.440",
    status: "limpo" as const,
    badge: "limpo",
    progresso: 100,
  },
  {
    id: "LOT-2024-0196",
    operadora: "CARELIFE",
    guias: 41,
    valor: "R$ 88.320",
    status: "critico" as const,
    badge: "5 erros",
    progresso: 40,
  },
  {
    id: "LOT-2024-0195",
    operadora: "VITA+ Seguros",
    guias: 132,
    valor: "R$ 305.900",
    status: "limpo" as const,
    badge: "limpo",
    progresso: 100,
  },
];

export const linhasXml: {
  n: number;
  texto: string;
  sev?: Severity;
  tag?: boolean;
}[] = [
  { n: 1, texto: '<guiaTISS versao="3.0.6">', tag: true },
  { n: 2, texto: "<identificacao>", tag: true },
  { n: 3, texto: "  <cnpjOperadora>12345678000190</cnpjOperadora>" },
  {
    n: 4,
    texto: "  <dataNascimentoPaciente>15/03/198X19</dataNascimentoPaciente>",
    sev: "crit",
  },
  { n: 5, texto: "  <prestadorCodigoOperadora>P-99231</prestadorCodigoOperadora>" },
  { n: 6, texto: "</identificacao>", tag: true },
  { n: 7, texto: "<servico>", tag: true },
  { n: 8, texto: "  <procedimentoCodigoTiss>25.0542</procedimentoCodigoTiss>", sev: "warn" },
  { n: 9, texto: "  <valorTotalServico>4.820,50</valorTotalServico>" },
  { n: 10, texto: "</servico></guiaTISS>", tag: true },
];

export const ocorrencias: {
  sev: Severity;
  grupo: string;
  linha: number;
  tecnico: string;
  simples: string;
  acao: string;
  secundaria?: string;
}[] = [
  {
    sev: "crit",
    grupo: "Estrutura",
    linha: 4,
    tecnico: "dataNascimentoPaciente fora do formato AAAA-MM-DD.",
    simples:
      "A data de nascimento do paciente está escrita de forma inválida. A operadora vai recusar esta guia.",
    acao: "Corrigir",
    secundaria: "Ignorar",
  },
  {
    sev: "warn",
    grupo: "Tabela TISS",
    linha: 8,
    tecnico: "Código de procedimento 25.0542 não existe na TISS vigente.",
    simples:
      "O código do procedimento não existe na tabela atual. Sugerimos trocar por 25.0541.",
    acao: "Sugerir 25.0541",
    secundaria: "Revisar",
  },
  {
    sev: "info",
    grupo: "Valores",
    linha: 9,
    tecnico: "Valor R$ 4.820,50 32% acima da tabela de referência.",
    simples:
      "Este valor está bem acima da média para o procedimento. Vale conferir antes de enviar.",
    acao: "Ver análise",
  },
];

export const guias = [
  { n: "998122", pac: "JOÃO SILVA MENDES", proc: "Consulta em consultório", valor: "R$ 120,00", sev: "warn" as Severity | "ok" },
  { n: "998123", pac: "MARIA APARECIDA LUZ", proc: "Hemograma completo", valor: "R$ 45,50", sev: "ok" as Severity | "ok" },
  { n: "998124", pac: "CARLOS EDUARDO PINTO", proc: "Ultrassonografia abdômen", valor: "R$ 280,00", sev: "crit" as Severity | "ok" },
  { n: "998125", pac: "ANA BEATRIZ ROCHA", proc: "Ressonância de crânio", valor: "R$ 1.240,00", sev: "ok" as Severity | "ok" },
];
