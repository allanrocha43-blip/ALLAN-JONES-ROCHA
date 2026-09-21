const fs = require('fs');

let corTest = `import { describe, it, expect } from 'vitest';
import { sincronizarProcedimento } from './correcoes';
import { ProcedimentoItem } from '../../types/tiss';

describe('Correções Engine', () => {
  it('sincronizarProcedimento não duplica <valorTotal> e o injeta antes de <equipeSadt>', () => {
    const xmlBruto = \`<ans:procedimentoExecutado>
  <ans:codigoProcedimento>41501144</ans:codigoProcedimento>
  <ans:valorUnitario>150.50</ans:valorUnitario>
  <ans:equipeSadt>
    <ans:grauParticipacao>12</ans:grauParticipacao>
  </ans:equipeSadt>
</ans:procedimentoExecutado>\`;

    const proc: ProcedimentoItem = {
      id: 'test',
      guiaId: '1',
      codigo: '41501144',
      quantidade: '1',
      valorUnitario: '150.50',
      reducaoAcrescimo: '1.00',
      valor: '150.50',
      dataExecucao: '2023-01-01',
      startIdx: 0,
      endIdx: xmlBruto.length,
      isExame: false
    };

    const result = sincronizarProcedimento(xmlBruto, proc, { valor: '200.00' });
    
    expect(result.alterado).toBe(true);
    // Deve conter apenas um valorTotal
    const matches = result.novoConteudo.match(/valorTotal/g) || [];
    expect(matches.length).toBe(2);
    
    const idxValor = result.novoConteudo.indexOf('<ans:valorTotal>');
    const idxEquipe = result.novoConteudo.indexOf('<ans:equipeSadt>');
    expect(idxValor).toBeLessThan(idxEquipe);
  });
  
  it('limpeza automática remove <valorTotal> duplicados de versões anteriores', () => {
    const xmlCorrompido = \`<ans:procedimentoExecutado>
  <ans:codigoProcedimento>41501144</ans:codigoProcedimento>
  <ans:equipeSadt>...</ans:equipeSadt>
  <ans:valorTotal>150.50</ans:valorTotal>
  <ans:valorTotal>150.50</ans:valorTotal>
</ans:procedimentoExecutado>\`;

    const proc: ProcedimentoItem = {
      id: 'test2',
      guiaId: '1',
      codigo: '41501144',
      quantidade: '1',
      valorUnitario: '150.50',
      reducaoAcrescimo: '1.00',
      valor: '150.50',
      dataExecucao: '2023-01-01',
      startIdx: 0,
      endIdx: xmlCorrompido.length,
      isExame: false
    };

    const result = sincronizarProcedimento(xmlCorrompido, proc, { valor: '300.00' });
    const matches = result.novoConteudo.match(/valorTotal/g) || [];
    expect(matches.length).toBe(2);
    const idxValor = result.novoConteudo.indexOf('<ans:valorTotal>');
    const idxEquipe = result.novoConteudo.indexOf('<ans:equipeSadt>');
    expect(idxValor).toBeLessThan(idxEquipe);
  });
});
\`

fs.writeFileSync('src/utils/tiss/correcoes.test.ts', corTest);
