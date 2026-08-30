import fs from "fs";

let content = fs.readFileSync("src/utils/tissAuditor.ts", "utf-8");

const oldCode3 = `      // 2.1 Verificação de <tecnicaUtilizada> indevida em procedimentos não-cirúrgicos / exames SADT
      const tecMatch = bloco.match(/(^[ \\t]*<(?:[^:]+:)?tecnicaUtilizada(?:\\s[^>]*?)?>[\\s\\S]*?<\\/(?:[^:]+:)?tecnicaUtilizada\\s*>)/im);
      if (tecMatch && !isSurgery) {
        let lineTarget = procLine;
        const indexTec = bloco.search(/<(?:[^:]+:)?tecnicaUtilizada/i);
        if (indexTec !== -1) {
          lineTarget = localizador.linhaDe(matchStart + indexTec);
        }

        inconsistencias.push({
          id: \`regra-tecnicautilizada-\${lineTarget}-\${matchStart}\`,
          linha: lineTarget,
          tipo: "Erro Regra",
          desc: \`\${prefix}Linha \${lineTarget}: Tag <tecnicaUtilizada> indevida para o procedimento não-cirúrgico _\${cod}_. Recomenda-se remover.\`,
          original: tecMatch[1],
          sugestao: "",
          seguro: true
        });
      }`;

const newCode3 = `      // 2.1 Verificação de <tecnicaUtilizada> indevida em procedimentos não-cirúrgicos / exames SADT
      const tecMatch = bloco.match(/(^[ \\t]*<(?:[^:]+:)?tecnicaUtilizada(?:\\s[^>]*?)?>[\\s\\S]*?<\\/(?:[^:]+:)?tecnicaUtilizada\\s*>)/im);
      if (tecMatch && !isSurgery) {
        let lineTarget = procLine;
        const indexTec = bloco.search(/<(?:[^:]+:)?tecnicaUtilizada/i);
        if (indexTec !== -1) {
          lineTarget = localizador.linhaDe(matchStart + indexTec);
        }

        inconsistencias.push({
          id: \`regra-tecnicautilizada-\${lineTarget}-\${matchStart}\`,
          linha: lineTarget,
          tipo: "Erro Regra",
          desc: \`\${prefix}Linha \${lineTarget}: Tag <tecnicaUtilizada> indevida para o procedimento não-cirúrgico _\${cod}_. Recomenda-se remover.\`,
          original: tecMatch[1],
          sugestao: "",
          seguro: true
        });
      }
      
      // 2.2 Verificação de <viaAcesso> indevida em procedimentos não-cirúrgicos / exames SADT
      const viaMatch = bloco.match(/(^[ \\t]*<(?:[^:]+:)?viaAcesso(?:\\s[^>]*?)?>[\\s\\S]*?<\\/(?:[^:]+:)?viaAcesso\\s*>)/im);
      if (viaMatch && !isSurgery) {
        let lineTarget = procLine;
        const indexVia = bloco.search(/<(?:[^:]+:)?viaAcesso/i);
        if (indexVia !== -1) {
          lineTarget = localizador.linhaDe(matchStart + indexVia);
        }

        inconsistencias.push({
          id: \`regra-viaacesso-indevida-\${lineTarget}-\${matchStart}\`,
          linha: lineTarget,
          tipo: "Erro Regra",
          desc: \`\${prefix}Linha \${lineTarget}: Tag <viaAcesso> indevida para o procedimento não-cirúrgico _\${cod}_. Recomenda-se remover.\`,
          original: viaMatch[1],
          sugestao: "",
          seguro: true
        });
      }`;

content = content.replace(oldCode3, newCode3);

fs.writeFileSync("src/utils/tissAuditor.ts", content);
console.log("Fixed TISS 4.01.00 viaAcesso indevida logic");
