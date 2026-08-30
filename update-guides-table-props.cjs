const fs = require('fs');
let content = fs.readFileSync('src/components/GuidesTable.tsx', 'utf-8');

const oldProps = `  onSincronizarProcedimento?: (
    proc: ProcedimentoItem,
    novoCodigo: string,
    novoValor: string,
    novaQuantidade: string,
    novoValorUnitario: string,
    novaReducaoAcrescimo?: string
  ) => void;`;

const newProps = `  onSincronizarProcedimento?: (
    proc: ProcedimentoItem,
    novoCodigo: string,
    novoValor: string,
    novaQuantidade: string,
    novoValorUnitario: string,
    novaReducaoAcrescimo?: string,
    novaDataExecucao?: string
  ) => void;`;

content = content.replace(oldProps, newProps);
fs.writeFileSync('src/components/GuidesTable.tsx', content);
