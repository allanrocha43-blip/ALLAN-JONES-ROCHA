import { executarAuditoriaDinamica as auditarOriginal } from './src/utils/tissAuditor.original.ts';
import { executarAuditoriaDinamica as auditarCorrigido } from './src/utils/tissAuditor.ts';
import {
  SAMPLE_TISS_WITH_ERRORS,
  SAMPLE_MODELO_OPERADORA_SADT,
  SAMPLE_MODELO_OPERADORA_CONSULTA,
} from './src/utils/sampleXmls.ts';
import {
  SAMPLE_GUIA_SADT_SEM_HIFEN,
  SAMPLE_GUIA_SPSADT_SEM_NAMESPACE,
} from './src/utils/regressionFixtures.ts';

const casos: { nome: string; xml: string }[] = [
  { nome: 'SAMPLE_TISS_WITH_ERRORS (guiaConsulta + guiaSP-SADT, com erros propositais)', xml: SAMPLE_TISS_WITH_ERRORS },
  { nome: 'SAMPLE_MODELO_OPERADORA_SADT (guiaSP-SADT limpo, padrão 4.02.00)', xml: SAMPLE_MODELO_OPERADORA_SADT },
  { nome: 'SAMPLE_MODELO_OPERADORA_CONSULTA (guiaConsulta limpo, padrão 4.01.00)', xml: SAMPLE_MODELO_OPERADORA_CONSULTA },
  { nome: 'SAMPLE_GUIA_SADT_SEM_HIFEN (guiaSADT, sem atendimentoRN/codigoTabela)', xml: SAMPLE_GUIA_SADT_SEM_HIFEN },
  { nome: 'SAMPLE_GUIA_SPSADT_SEM_NAMESPACE (guiaSPSADT, sem namespace, sem atendimentoRN/codigoTabela)', xml: SAMPLE_GUIA_SPSADT_SEM_NAMESPACE },
];

function resumo(r: ReturnType<typeof auditarOriginal>) {
  return {
    versaoTiss: r.versaoTiss,
    cnpjBase: r.cnpjBase,
    valorConsulta: r.valorConsulta,
    valorSadt: r.valorSadt,
    totalLote: r.totalLote,
    qtdInconsistencias: r.inconsistencias.length,
    tiposInconsistencia: Array.from(new Set(r.inconsistencias.map(i => i.tipo))).sort(),
    qtdGuias: r.guias.length,
  };
}

let totalDivergencias = 0;

for (const caso of casos) {
  console.log('\\n' + '='.repeat(90));
  console.log('CASO:', caso.nome);
  console.log('='.repeat(90));

  const antes = auditarOriginal(caso.xml);
  const depois = auditarCorrigido(caso.xml);

  const rAntes = resumo(antes);
  const rDepois = resumo(depois);

  console.log('ANTES   :', JSON.stringify(rAntes));
  console.log('DEPOIS  :', JSON.stringify(rDepois));

  const camposIguais = ['cnpjBase', 'versaoTiss'] as const;
  for (const campo of camposIguais) {
    if (rAntes[campo] !== rDepois[campo]) {
      console.log(`  !! DIVERGÊNCIA INESPERADA em \${campo}: \${rAntes[campo]} -> \${rDepois[campo]}`);
      totalDivergencias++;
    }
  }

  if (rAntes.qtdInconsistencias !== rDepois.qtdInconsistencias) {
    console.log(`  >> Mudança no nº de inconsistências: \${rAntes.qtdInconsistencias} -> \${rDepois.qtdInconsistencias}`);
  }
  if (JSON.stringify(rAntes.tiposInconsistencia) !== JSON.stringify(rDepois.tiposInconsistencia)) {
    console.log(`  >> Tipos novos/removidos: antes=\${JSON.stringify(rAntes.tiposInconsistencia)} depois=\${JSON.stringify(rDepois.tiposInconsistencia)}`);
  }
  if (rAntes.valorConsulta !== rDepois.valorConsulta || rAntes.valorSadt !== rDepois.valorSadt) {
    console.log(`  >> Mudança na classificação de valores: consulta \${rAntes.valorConsulta}->\${rDepois.valorConsulta}, sadt \${rAntes.valorSadt}->\${rDepois.valorSadt}`);
  }
}

console.log('\\n' + '='.repeat(90));
if (totalDivergencias === 0) {
  console.log('OK: nenhuma divergência em campos que deveriam permanecer estáveis (cnpjBase, versaoTiss) nos 5 casos.');
} else {
  console.log(`FALHA: \${totalDivergencias} divergência(s) inesperada(s) encontrada(s).`);
  process.exitCode = 1;
}
