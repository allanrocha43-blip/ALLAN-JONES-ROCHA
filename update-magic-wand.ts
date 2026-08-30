import fs from "fs";

let content = fs.readFileSync("src/utils/tissAuditor.ts", "utf-8");

// We need to add logic so the user can just hit the magic wand to remove the invalid viaAcesso / tecnicaUtilizada tags 
// if they are inside exams.
// But the replace logic might need to remove the whole line. We already have the regex replacement logic for that in `aplicarCorrecaoIndividual`.

const searchOld = `      // 2.1 Verificação de <tecnicaUtilizada> indevida em procedimentos não-cirúrgicos / exames SADT
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

const searchNew = `      // 2.1 Verificação de <tecnicaUtilizada> indevida em procedimentos não-cirúrgicos / exames SADT
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
          desc: \`\${prefix}Linha \${lineTarget}: Tag indevida para procedimento não-cirúrgico. Recomenda-se remover a <tecnicaUtilizada> do proc. \${cod}.\`,
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
          desc: \`\${prefix}Linha \${lineTarget}: Tag indevida para procedimento não-cirúrgico. Recomenda-se remover a <viaAcesso> do proc. \${cod}.\`,
          original: viaMatch[1],
          sugestao: "",
          seguro: true
        });
      }`;

if (content.includes(searchOld)) {
  content = content.replace(searchOld, searchNew);
  fs.writeFileSync("src/utils/tissAuditor.ts", content);
  console.log("Updated Magic wand descriptions");
}
