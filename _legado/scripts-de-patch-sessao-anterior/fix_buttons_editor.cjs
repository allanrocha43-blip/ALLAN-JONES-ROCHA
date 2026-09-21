const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add onApplyCorrection to PainelAuditoria
content = content.replace(
  '  onApplySafe: () => void,',
  '  onApplySafe: () => void,\n  onApplyCorrection: (inc: Inconsistency) => void,'
);
content = content.replace(
  'onApplySafe={handleApplySafeCorrections}',
  'onApplySafe={handleApplySafeCorrections}\n                  onApplyCorrection={handleApplyCorrection}'
);

// In PainelAuditoria, add the onClick
content = content.replace(
  '<button className="rounded bg-primary px-2 py-1',
  '<button onClick={() => onApplyCorrection(inc)} className="rounded bg-primary px-2 py-1'
);

// Add handleApplyCorrection in App.tsx
const handleApplyCorrectionStr = `  const handleApplyCorrection = (inc: Inconsistency) => {
    if (!arquivoAtivo) return;
    const { novoConteudo, sucesso } = aplicarCorrecaoIndividual(arquivoAtivo.conteudo, inc);
    if (sucesso) {
      setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoConteudo, ultimaAtualizacao: new Date() } : a));
    } else {
      alert("Não foi possível aplicar esta correção isoladamente.");
    }
  };`;

content = content.replace(
  '  const handleApplySafeCorrections = () => {',
  handleApplyCorrectionStr + '\n\n  const handleApplySafeCorrections = () => {'
);

// Also we need to import aplicarCorrecaoIndividual
content = content.replace(
  'import { exportarXmlValidadoComHash, sincronizarDadosGuia, sincronizarProcedimento } from "./utils/tissAuditor";',
  'import { exportarXmlValidadoComHash, sincronizarDadosGuia, sincronizarProcedimento, aplicarCorrecaoIndividual } from "./utils/tissAuditor";'
);

fs.writeFileSync('src/App.tsx', content);
