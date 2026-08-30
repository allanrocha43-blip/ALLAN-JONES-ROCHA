import fs from "fs";

let content = fs.readFileSync("src/utils/tissAuditor.ts", "utf-8");

const oldCode = `validateBlockElements(blocosEquipeRegex, ['codProfissional', 'nomeProf', 'conselho', 'numeroConselhoProfissional', 'UF', 'CBOS'], 'equipeSadt');`;
const newCode = `validateBlockElements(blocosEquipeRegex, ['nomeProf', 'conselho', 'numeroConselhoProfissional', 'UF', 'CBOS'], 'equipeSadt');`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync("src/utils/tissAuditor.ts", content);
  console.log("Fixed codProfissional false positive.");
} else {
  console.log("Could not find the target code to replace.");
}
