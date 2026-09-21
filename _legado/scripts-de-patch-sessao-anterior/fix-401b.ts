import fs from "fs";

let content = fs.readFileSync("src/utils/tissAuditor.ts", "utf-8");

const oldCode2 = `      if (versaoTiss === "4.03.00") {
        if (isSurgery && !/<(?:[^:]+:)?tecnicaUtilizada/i.test(bloco)) {
          inconsistencias.push({
            id: \`v4-tecnicaUtilizada-\${procLine}-\${matchStart}\`,
            linha: procLine,
            tipo: "Erro Regra",
            desc: \`\${prefix}Na versão 4.03.00, alguns códigos cirúrgicos exigem a tag <tecnicaUtilizada> (TekSoft/Benner).\`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "",
            seguro: false
          });
        }
      }`;

const newCode2 = `      if (versaoTiss.startsWith("4.0")) {
        if (isSurgery && !/<(?:[^:]+:)?tecnicaUtilizada/i.test(bloco)) {
          inconsistencias.push({
            id: \`v4-tecnicaUtilizada-\${procLine}-\${matchStart}\`,
            linha: procLine,
            tipo: "Erro Regra",
            desc: \`\${prefix}Nas versões 4.0x.xx, alguns códigos cirúrgicos exigem a tag <tecnicaUtilizada>.\`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "",
            seguro: false
          });
        }
      }`;

content = content.replace(oldCode2, newCode2);

fs.writeFileSync("src/utils/tissAuditor.ts", content);
console.log("Fixed TISS 4.01.00 tecnicaUtilizada logic");
