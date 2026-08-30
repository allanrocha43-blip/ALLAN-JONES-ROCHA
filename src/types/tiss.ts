export type InconsistencyType = 
  | "Crítico" 
  | "XSD Schema" 
  | "Erro Órfão" 
  | "Erro Regra" 
  | "Inconsistência" 
  | "Aviso"
  | "Caracter Inválido"
  | "Erro de Cálculo"
  | "Erro Estrutural";

export interface Inconsistency {
  id: string;
  linha: number;
  tipo: InconsistencyType;
  desc: string;
  original: string;
  sugestao: string;
  seguro: boolean;
}

export interface ProcedimentoItem {
  id: string;
  startIdx: number;
  endIdx: number;
  codigo: string;
  dataExecucao?: string;
  horaInicial?: string;
  horaFinal?: string;
  descricao: string;
  quantidade: string;
  valorUnitario: string;
  reducaoAcrescimo?: string;
  valor: string; // Valor Total
}

export interface GuideItem {
  id: string;
  index: number;
  startIdx: number;
  endIdx: number;
  tipoGuia: 'guiaConsulta' | 'guiaSP-SADT' | string;
  carteira: string;
  senha: string;
  guia: string;
  guiaPrestador: string;
  procedimentos: ProcedimentoItem[];
}

export interface LoadedFile {
  id: string;
  nome: string;
  conteudo: string;
  caminho?: string;
  tamanhoBytes: number;
  dataCarregamento: Date;
  ultimaAtualizacao?: Date;
  precisaGerarHash?: boolean;
  fileHandle?: any;
  eolOriginal?: '\r\n' | '\n';
}

export interface AuditResult {
  versaoTiss: string;
  cnpjBase: string;
  totalLote: number;
  qtdGuiasDeclaradas?: number;
  valorConsulta: number;
  valorSadt: number;
  inconsistencias: Inconsistency[];
  guias: GuideItem[];
}

export interface ToastState {
  mensagem: string;
  cor: string;
  visivel: boolean;
}
