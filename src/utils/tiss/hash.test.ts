import { describe, it, expect } from 'vitest';
import { calcularHashMD5Tiss, exportarXmlValidadoComHash } from './hash';

describe('Hash Engine (MD5 UTF-8)', () => {
  it('calcularHashMD5Tiss lida corretamente com XML sem namespace', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mensagemTISS>
  <cabecalho>
    <identificacaoTransacao>
      <tipoTransacao>ENVIO_LOTE_GUIAS</tipoTransacao>
    </identificacaoTransacao>
  </cabecalho>
  <epilogo>
    <hash>881a9d2691c848fa80973567838172a3</hash>
  </epilogo>
</mensagemTISS>`;
    const result = calcularHashMD5Tiss(xml);
    expect(result.hashCalculado).not.toBeNull();
    // The previous hash should be excluded during calculation
  });

  it('exportarXmlValidadoComHash não falha e sanitiza', () => {
     const xml = `<ans:mensagemTISS>
       <ans:cabecalho>
         <ans:identificacaoTransacao>
           <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
         </ans:identificacaoTransacao>
       </ans:cabecalho>
       <ans:epilogo>
         <ans:hash>dummy</ans:hash>
       </ans:epilogo>
     </ans:mensagemTISS>`;
     const result = exportarXmlValidadoComHash(xml);
     expect(result.sucesso).toBe(true);
     expect(result.novoConteudo).not.toContain('dummy');
     expect(result.novoConteudo).toContain('<ans:hash>');
  });
});
