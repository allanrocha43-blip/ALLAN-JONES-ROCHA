import fs from "fs";

let content = fs.readFileSync("src/utils/tissAuditor.ts", "utf-8");

const oldCode = `      if (versaoTiss === "4.02.00" || versaoTiss === "4.03.00") {
        if (!/<(?:[^:]+:)?sequencialItem/i.test(bloco)) {
          inconsistencias.push({
            id: \`v4-sequencialItem-\${procLine}-\${matchStart}\`,
            linha: procLine,
            tipo: "Erro Estrutural",
            desc: \`\${prefix}Na versão \${versaoTiss}, a tag <sequencialItem> é exigida por alguns validadores (TekSoft) para ordenar os procedimentos. Falta informar.\`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "", 
            seguro: false
          });
        }
      }`;

const newCode = `      if (versaoTiss.startsWith("4.0")) {
        if (!/<(?:[^:]+:)?sequencialItem/i.test(bloco)) {
          inconsistencias.push({
            id: \`v4-sequencialItem-\${procLine}-\${matchStart}\`,
            linha: procLine,
            tipo: "Erro Estrutural",
            desc: \`\${prefix}Na versão \${versaoTiss}, a tag <sequencialItem> é exigida por alguns validadores para ordenar os procedimentos. Falta informar.\`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "", 
            seguro: false
          });
        }
      }`;

content = content.replace(oldCode, newCode);

fs.writeFileSync("src/utils/tissAuditor.ts", content);
console.log("Fixed TISS 4.01.00 sequencialItem logic");
