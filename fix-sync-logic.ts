import fs from "fs";

let content = fs.readFileSync("src/utils/tissAuditor.ts", "utf-8");

// Fix 1: Purely positional IDs
content = content.replace(
  /id: `proc-\$\{index\}-\$\{pIndex\}-\$\{codigo \|\| 's\/c'\}`,/,
  "id: `proc-${index}-${pIndex}`,"
);

content = content.replace(
  /const identificadorSemantico = guia \|\| guiaPrestador \|\| carteira \|\| String\(index\);\s*guias\.push\(\{\s*id: `guia-\$\{index\}-\$\{identificadorSemantico\}`,/,
  "guias.push({\n      id: `guia-${index}`,"
);

// Fix 2: Sincronizar Procedimento with dataExecucao
const searchSyncStr = `  // 2. Sincronizar Valor Total se alterado`;
const insertSyncStr = `  // Sincronizar Data de Execução/Atendimento
  if (dataExecucaoMudou && novosDados.dataExecucao !== undefined) {
    const nData = novosDados.dataExecucao.trim();
    blocoAlvo = replaceTagValue(blocoAlvo, 'dataExecucao', nData);
    blocoAlvo = replaceTagValue(blocoAlvo, 'dataAtendimento', nData);
    blocoAlvo = replaceTagValue(blocoAlvo, 'data', nData);
  }

  // 2. Sincronizar Valor Total se alterado`;

if (content.includes(searchSyncStr)) {
  content = content.replace(searchSyncStr, insertSyncStr);
} else {
  console.log("Could not find the target to insert dataExecucao sync!");
}

fs.writeFileSync("src/utils/tissAuditor.ts", content);
console.log("Fixed tissAuditor logic");
