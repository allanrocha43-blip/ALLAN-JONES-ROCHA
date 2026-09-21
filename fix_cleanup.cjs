const fs = require('fs');
let code = fs.readFileSync('src/utils/tiss/correcoes.ts', 'utf8');

const targetContent = `export function sincronizarProcedimento(
  conteudo: string,
  proc: ProcedimentoItem,
  novosDados: { codigo?: string; quantidade?: string; valorUnitario?: string; reducaoAcrescimo?: string; valor?: string; dataExecucao?: string }
): { novoConteudo: string; alterado: boolean } {
  let { startIdx, endIdx, codigo } = proc;`;

const replacement = `export function sincronizarProcedimento(
  conteudo: string,
  proc: ProcedimentoItem,
  novosDados: { codigo?: string; quantidade?: string; valorUnitario?: string; reducaoAcrescimo?: string; valor?: string; dataExecucao?: string }
): { novoConteudo: string; alterado: boolean } {
  // --- Limpeza de Estruturas Corrompidas (Bug Anterior) ---
  // Se o XML já possuir tags <valorTotal> injetadas incorretamente DEPOIS de <equipeSadt> ou como duplicatas, remove-as globalmente antes de processar
  const cleanedConteudo = conteudo.replace(/(<(?:[^:>]+:)?equipeSadt(?:[^>]*)>(?:[\\s\\S]*?)<\\/(?:[^:>]+:)?equipeSadt>)\\s*(<(?:[^:>]+:)?valorTotal(?:[^>]*)>.*?<\\/(?:[^:>]+:)?valorTotal>\\s*)+/gi, "$1");
  if (cleanedConteudo !== conteudo) {
    // Se houve limpeza, precisamos re-localizar o bloco do procedimento para evitar desalinhamento de coordenadas
    conteudo = cleanedConteudo;
    proc.startIdx = -1; // Força re-localização
  }

  let { startIdx, endIdx, codigo } = proc;`;

if (code.includes(targetContent)) {
  code = code.replace(targetContent, replacement);
  fs.writeFileSync('src/utils/tiss/correcoes.ts', code);
  console.log("Successfully replaced cleanup logic.");
} else {
  console.log("Could not find target content.");
}
