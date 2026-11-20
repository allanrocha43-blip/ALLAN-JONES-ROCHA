/**
 * regrasNegocio.ts
 * -----------------------------------------------------------------------
 * Módulo de Regras de Negócio e Consistência Clínica / Financeira TISS.
 *
 * Responsabilidades:
 * 1. Consistência do Paciente vs Procedimento (Sexo e Idade vs Procedimentos exclusivos).
 * 2. Limites Financeiros de Valores (Bloqueio de valor <= 0 e alertas de tetos de tolerância).
 * 3. Compatibilidade entre Tipo de Guia e Código de Procedimento TUSS.
 */

import { GuideItem, ProcedimentoItem, Inconsistency } from '../../types/tiss';
import { LocalizadorDeLinha } from './xmlLineUtils';
import { getDescricaoProcedimentoTISS } from '../tabelaTiss';

export interface ConfiguracaoRegrasNegocio {
  tetoConsulta?: number;
  tetoAmbulatorial?: number;
}

const CONFIG_PADRAO: ConfiguracaoRegrasNegocio = {
  tetoConsulta: 2500.0, // R$ 2.500,00 por consulta médica
  tetoAmbulatorial: 50000.0, // R$ 50.000,00 para procedimentos ambulatoriais padrão
};

/**
 * Procedimentos cirúrgicos ou exames com restrição anatômica estrita ao sexo feminino.
 * Códigos TUSS CBHPM ou prefixos clássicos:
 * - 31309... (Partos / Obstetrícia)
 * - 31303... / 31304... (Útero, Ovário, Vagina, Colo Uterino)
 * - 40808033, 40808041 (Mamografia)
 * - 40601110 (Citopatologia cérvico-vaginal / preventivo)
 * - 40901114, 40901122 (USG obstétrica e transvaginal)
 */
const PREFIXOS_FEMININOS_EXCLUSIVOS = [
  '31309', // Partos e obstetrícia cirúrgica
  '31303', // Cirurgias do útero / curetagem
  '31304', // Cirurgias do ovário e trompa
  '31301', // Cirurgias da vulva e períneo feminino
  '31302', // Cirurgias da vagina
  '31305', // Períneo e fístulas ginecológicas
];

const CODIGOS_FEMININOS_EXCLUSIVOS = new Set([
  '31309054', // Parto cesariana
  '31309011', // Parto normal
  '31309038', // Parto múltiplo
  '31303013', // Curetagem pós-abortamento / semiótica
  '31303056', // Histerectomia total
  '31303080', // Miomectomia uterina
  '40808033', // Mamografia digital
  '40808041', // Mamografia convencional bilateral
  '40601110', // Citopatologia cérvico-vaginal (Papanicolau)
  '40901114', // Ultrassonografia obstétrica
  '40901122', // Ultrassonografia transvaginal
]);

/**
 * Procedimentos cirúrgicos ou exames com restrição anatômica estrita ao sexo masculino.
 * Códigos TUSS CBHPM ou prefixos clássicos:
 * - 31201... (Testículos, epidídimo, cordão espermático)
 * - 31202... (Pênis / prepúcio)
 * - 31103235, 31103243 (Próstata - prostatectomia / ressecção transuretral)
 * - 40901300, 40901369 (Biópsia e USG transretal de próstata)
 */
const PREFIXOS_MASCULINOS_EXCLUSIVOS = [
  '31201', // Bolsa escrotal, testículo e cordão espermático
  '31202', // Pênis e prepúcio
];

const CODIGOS_MASCULINOS_EXCLUSIVOS = new Set([
  '31103235', // Prostatectomia radical
  '31103243', // Ressecção endoscópica da próstata (RTU)
  '31103219', // Biópsia de próstata cirúrgica
  '31201130', // Vasectomia bilateral
  '31201083', // Orquiectomia unilateral/bilateral
  '31202020', // Postectomia / Cirurgia de fimose
  '40901300', // Biópsia de próstata guiada por USG
  '40901369', // Ultrassonografia de próstata transretal
]);

/**
 * Procedimentos neonatais / lactentes restritos a idade <= 1 ano.
 */
const CODIGOS_NEONATAIS = new Set([
  '40310214', // Triagem neonatal (Teste do pezinho)
  '30101700', // Fototerapia neonatal
  '40901474', // Ultrassonografia transfontanela
]);

function normalizarSexo(sexoRaw?: string): 'M' | 'F' | null {
  if (!sexoRaw) return null;
  const s = sexoRaw.trim().toUpperCase();
  if (s === 'M' || s === '1' || s === 'MASCULINO') return 'M';
  if (s === 'F' || s === '3' || s === 'FEMININO') return 'F';
  return null;
}

function parseValor(valorRaw?: string): number | null {
  if (!valorRaw) return null;
  // Substitui vírgula decimal se houver
  const limpo = valorRaw.trim().replace(/\./g, '').replace(',', '.');
  // Se já tiver ponto decimal nativo sem milhar:
  const valorDireto = parseFloat(valorRaw.trim().replace(',', '.'));
  if (!isNaN(valorDireto)) {
    return valorDireto;
  }
  const valorFormatado = parseFloat(limpo);
  return isNaN(valorFormatado) ? null : valorFormatado;
}

function calcularIdadeAnos(dataNascStr?: string, dataRefStr?: string): number | null {
  if (!dataNascStr) return null;
  const dataNasc = new Date(dataNascStr);
  if (isNaN(dataNasc.getTime())) return null;

  const dataRef = dataRefStr ? new Date(dataRefStr) : new Date();
  if (isNaN(dataRef.getTime())) return null;

  let anos = dataRef.getFullYear() - dataNasc.getFullYear();
  const m = dataRef.getMonth() - dataNasc.getMonth();
  if (m < 0 || (m === 0 && dataRef.getDate() < dataNasc.getDate())) {
    anos--;
  }
  return anos >= 0 ? anos : null;
}

/**
 * Validação 1: Consistência entre Dados do Paciente e Procedimento
 * - Sexo vs Procedimento (Glosa Crítica)
 * - Idade vs Procedimento (Glosa Crítica)
 */
export function validarConsistenciaPaciente(
  guia: GuideItem,
  proc: ProcedimentoItem,
  localizador: LocalizadorDeLinha
): Inconsistency[] {
  const erros: Inconsistency[] = [];
  const sexo = normalizarSexo(guia.sexo);
  const cod = proc.codigo.trim();
  const linha = localizador.linhaDe(proc.startIdx || guia.startIdx);
  const numGuia = guia.guiaPrestador || guia.guia || `Nº ${guia.index}`;
  const descTuss = getDescricaoProcedimentoTISS(cod) || proc.descricao || "Procedimento TUSS";

  // A. Incompatibilidade com sexo Masculino (Procedimento exclusivo feminino)
  if (sexo === 'M') {
    const isExclusivoFem = CODIGOS_FEMININOS_EXCLUSIVOS.has(cod) ||
      PREFIXOS_FEMININOS_EXCLUSIVOS.some(p => cod.startsWith(p));

    if (isExclusivoFem) {
      erros.push({
        id: `regra-sexo-m-${guia.id}-${proc.id}`,
        linha,
        tipo: 'Crítico',
        desc: `Inconsistência de Elegibilidade Biológica: O procedimento '${cod}' (${descTuss}) é anatomicamente exclusivo do sexo feminino, mas a Guia ${numGuia} está registrada para beneficiário do sexo Masculino. Esta divergência gera glosa contratual imediata pela operadora.`,
        original: proc.codigo,
        sugestao: `Verifique o cadastro do beneficiário ou o código do procedimento faturado na Guia ${numGuia}.`,
        seguro: false,
      });
    }
  }

  // B. Incompatibilidade com sexo Feminino (Procedimento exclusivo masculino)
  if (sexo === 'F') {
    const isExclusivoMasc = CODIGOS_MASCULINOS_EXCLUSIVOS.has(cod) ||
      PREFIXOS_MASCULINOS_EXCLUSIVOS.some(p => cod.startsWith(p));

    if (isExclusivoMasc) {
      erros.push({
        id: `regra-sexo-f-${guia.id}-${proc.id}`,
        linha,
        tipo: 'Crítico',
        desc: `Inconsistência de Elegibilidade Biológica: O procedimento '${cod}' (${descTuss}) é anatomicamente exclusivo do sexo masculino, mas a Guia ${numGuia} está registrada para beneficiário do sexo Feminino. Esta divergência gera glosa contratual imediata pela operadora.`,
        original: proc.codigo,
        sugestao: `Verifique o cadastro do beneficiário ou o código do procedimento faturado na Guia ${numGuia}.`,
        seguro: false,
      });
    }
  }

  // C. Incompatibilidade com Idade
  const idadeAnos = calcularIdadeAnos(guia.dataNascimento, proc.dataExecucao);
  if (idadeAnos !== null) {
    // Procedimento neonatal em paciente com mais de 2 anos
    if (CODIGOS_NEONATAIS.has(cod) && idadeAnos > 2) {
      erros.push({
        id: `regra-idade-neonatal-${guia.id}-${proc.id}`,
        linha,
        tipo: 'Crítico',
        desc: `Incompatibilidade de Faixa Etária: O procedimento '${cod}' (${descTuss}) é restrito a recém-nascidos e lactentes, mas a idade calculada do paciente na Guia ${numGuia} é de ${idadeAnos} anos (Nascimento: ${guia.dataNascimento}).`,
        original: proc.codigo,
        sugestao: `Confirme a data de nascimento do paciente ou o procedimento solicitado.`,
        seguro: false,
      });
    }

    // Procedimentos de parto/cesariana em crianças menores de 10 anos
    if (CODIGOS_FEMININOS_EXCLUSIVOS.has(cod) && cod.startsWith('31309') && idadeAnos < 10) {
      erros.push({
        id: `regra-idade-parto-${guia.id}-${proc.id}`,
        linha,
        tipo: 'Crítico',
        desc: `Inconsistência Clínica Grave: Procedimento obstétrico/parto '${cod}' lançado para beneficiária com ${idadeAnos} anos na Guia ${numGuia}. Verifique a data de nascimento informada.`,
        original: proc.codigo,
        sugestao: `Corrija a data de nascimento no cadastro do paciente.`,
        seguro: false,
      });
    }
  }

  return erros;
}

/**
 * Validação 2: Limites Financeiros de Valores
 * - Bloqueio de valor zerado ou negativo (Glosa Crítica)
 * - Teto de tolerância médica / ambulatorial (Aviso)
 */
export function validarLimitesValores(
  guia: GuideItem,
  proc: ProcedimentoItem,
  localizador: LocalizadorDeLinha,
  config: ConfiguracaoRegrasNegocio = CONFIG_PADRAO
): Inconsistency[] {
  const erros: Inconsistency[] = [];
  const cod = proc.codigo.trim();
  const linha = localizador.linhaDe(proc.startIdx || guia.startIdx);
  const numGuia = guia.guiaPrestador || guia.guia || `Nº ${guia.index}`;

  const valTotal = parseValor(proc.valor);
  const valUnit = parseValor(proc.valorUnitario);

  // A. Bloqueio de valor zerado ou negativo
  const valorAlvo = valTotal !== null ? valTotal : valUnit;

  if (valorAlvo !== null && valorAlvo <= 0) {
    erros.push({
      id: `regra-val-zerado-${guia.id}-${proc.id}`,
      linha,
      tipo: 'Crítico',
      desc: `Glosa de Valor Inválido: O procedimento '${cod}' na Guia ${numGuia} possui valor faturado nulo ou negativo (R$ ${(valorAlvo).toFixed(2)}). Procedimentos médicos devem ter valor monetário positivo válido.`,
      original: proc.valor || proc.valorUnitario || "0.00",
      sugestao: `Informe o valor unitário e total correto acordado em contrato.`,
      seguro: false,
    });
  }

  // B. Teto de tolerância para Consulta Médica (Grupo 10101...)
  const tetoConsulta = config.tetoConsulta ?? CONFIG_PADRAO.tetoConsulta!;
  if (valorAlvo !== null && cod.startsWith('10101') && valorAlvo > tetoConsulta) {
    erros.push({
      id: `regra-teto-consulta-${guia.id}-${proc.id}`,
      linha,
      tipo: 'Aviso',
      desc: `Alerta de Limite Financeiro: Consulta médica '${cod}' na Guia ${numGuia} com valor de R$ ${valorAlvo.toFixed(2)} excede o teto de tolerância padrão de R$ ${tetoConsulta.toFixed(2)}. Verifique se não houve multiplicação incorreta de casas decimais.`,
      original: proc.valor || proc.valorUnitario || "",
      sugestao: `Conferir se o valor acordado com a operadora é realmente R$ ${valorAlvo.toFixed(2)}.`,
      seguro: false,
    });
  }

  // C. Teto de tolerância para Procedimentos Ambulatoriais Gerais
  const tetoAmbulatorial = config.tetoAmbulatorial ?? CONFIG_PADRAO.tetoAmbulatorial!;
  if (valorAlvo !== null && (cod.startsWith('4') || cod.startsWith('2')) && valorAlvo > tetoAmbulatorial) {
    erros.push({
      id: `regra-teto-ambulatorial-${guia.id}-${proc.id}`,
      linha,
      tipo: 'Aviso',
      desc: `Alerta de Limite Financeiro: Procedimento ambulatorial/diagnóstico '${cod}' na Guia ${numGuia} possui valor elevado de R$ ${valorAlvo.toFixed(2)}, acima do teto de conferência padrão (R$ ${tetoAmbulatorial.toFixed(2)}). Recomenda-se anexar justificativa técnica no faturamento.`,
      original: proc.valor || proc.valorUnitario || "",
      sugestao: `Conferir tabela de precificação contratual.`,
      seguro: false,
    });
  }

  return erros;
}

/**
 * Validação 3: Compatibilidade entre Tipo de Guia e Código de Procedimento TUSS
 * - Alerta de incompatibilidade mantendo envio permitido (Aviso)
 */
export function validarCompatibilidadeTipoGuia(
  guia: GuideItem,
  proc: ProcedimentoItem,
  localizador: LocalizadorDeLinha
): Inconsistency[] {
  const erros: Inconsistency[] = [];
  const cod = proc.codigo.trim();
  const linha = localizador.linhaDe(proc.startIdx || guia.startIdx);
  const numGuia = guia.guiaPrestador || guia.guia || `Nº ${guia.index}`;
  const descTuss = getDescricaoProcedimentoTISS(cod) || proc.descricao || "Procedimento";

  // A. Guia de Consulta contendo procedimento cirúrgico ou invasivo do Capítulo 3
  if (guia.tipoGuia === 'guiaConsulta' && cod.startsWith('3')) {
    erros.push({
      id: `regra-guia-consulta-cirurgia-${guia.id}-${proc.id}`,
      linha,
      tipo: 'Aviso',
      desc: `Compatibilidade de Guia: Procedimento cirúrgico '${cod}' (${descTuss}) faturado em Guia de Consulta na Guia ${numGuia}. A regulamentação da ANS estabelece que procedimentos invasivos e cirúrgicos devem ser faturados em Guia SP-SADT ou Guia de Resumo de Internação.`,
      original: proc.codigo,
      sugestao: `Faturar este procedimento em Guia SP-SADT para evitar glosa administrativa da operadora.`,
      seguro: false,
    });
  }

  // B. Guia de Consulta contendo exame de alta complexidade (Ressonância ou Tomografia)
  if (guia.tipoGuia === 'guiaConsulta' && (cod.startsWith('410') || cod.startsWith('411'))) {
    erros.push({
      id: `regra-guia-consulta-imagem-${guia.id}-${proc.id}`,
      linha,
      tipo: 'Aviso',
      desc: `Compatibilidade de Guia: Exame de alta complexidade por imagem '${cod}' (${descTuss}) lançado em Guia de Consulta na Guia ${numGuia}. Exames de imagem devem constar em Guia SP-SADT com laudo e indicação clínica.`,
      original: proc.codigo,
      sugestao: `Transferir o procedimento para uma Guia SP-SADT.`,
      seguro: false,
    });
  }

  return erros;
}

/**
 * Ponto de entrada unificado para execução de todas as regras de negócio em um conjunto de guias.
 */
export function executarRegrasNegocio(
  guias: GuideItem[],
  localizador: LocalizadorDeLinha,
  config?: ConfiguracaoRegrasNegocio
): Inconsistency[] {
  const todasInconsistencias: Inconsistency[] = [];

  for (const guia of guias) {
    for (const proc of guia.procedimentos) {
      // 1. Consistência do Paciente vs Procedimento
      todasInconsistencias.push(...validarConsistenciaPaciente(guia, proc, localizador));

      // 2. Limites Financeiros de Valores
      todasInconsistencias.push(...validarLimitesValores(guia, proc, localizador, config));

      // 3. Compatibilidade entre Tipo de Guia e Código
      todasInconsistencias.push(...validarCompatibilidadeTipoGuia(guia, proc, localizador));
    }
  }

  return todasInconsistencias;
}
