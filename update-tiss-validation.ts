import fs from "fs";

let content = fs.readFileSync("src/utils/tissAuditor.ts", "utf-8");

const moduleEstruturalOld = `// MÓDULO ESTRUTURAL 1.5: Integridade da Equipe SADT (Exames)
  const blocosEquipeRegex = /<(?:[^:]+:)?equipeSadt(?:\\s[^>]*?)?(?:\\/>|>[\\s\\S]*?<\\/(?:[^:]+:)?equipeSadt\\s*>)/gi;
  let matchEquipe: RegExpExecArray | null;
  while ((matchEquipe = blocosEquipeRegex.exec(conteudo)) !== null) {
    const blocoEq = matchEquipe[0];
    const linhaInicioEq = localizador.linhaDe(matchEquipe.index);

    // Se abriu equipeSadt, mas não informou o conselho / numeroConselhoProfissional preenchido, é glosa estrutural.
    const temConselho = /<(?:[^:]+:)?(?:numeroConselhoProfissional|conselhoProfissional|conselho)(?:\\s[^>]*?)?>\\s*[^<\\s]+\\s*<\\/(?:[^:]+:)?(?:numeroConselhoProfissional|conselhoProfissional|conselho)\\s*>/i.test(blocoEq);
    if (!temConselho) {
      const gNum = getGuiaNumeroForLine(linhaInicioEq);
      const prefix = gNum ? \`Guia nº \${gNum} | \` : '';
      inconsistencias.push({
        id: \`orfao-equipesadt-\${linhaInicioEq}-\${matchEquipe.index}\`,
        linha: linhaInicioEq,
        tipo: "Erro Órfão",
        desc: \`\${prefix}Linha \${linhaInicioEq}: Este elemento está órfão (<equipeSadt> sem conselho/número do conselho profissional). Falta informar.\`,
        original: "[BLOCO INCOMPLETO]",
        sugestao: "", // Preenchimento manual do analista
        seguro: false
      });
    }
  }`;

const moduleEstruturalNew = `// MÓDULO ESTRUTURAL UNIVERSAL (TODAS AS VERSÕES): Validação Robusta de Elementos Obrigatórios
  // Verifica a falta de tags mandatórias em todos os blocos principais
  
  const validateBlockElements = (regexBloco: RegExp, tagsObrigatorias: string[], nomeBloco: string) => {
    let matchBloco: RegExpExecArray | null;
    const regexClone = new RegExp(regexBloco.source, regexBloco.flags);
    while ((matchBloco = regexClone.exec(conteudo)) !== null) {
      const bloco = matchBloco[0];
      const linhaInicio = localizador.linhaDe(matchBloco.index);
      const gNum = getGuiaNumeroForLine(linhaInicio);
      const prefix = gNum ? \`Guia no \${gNum} | \` : '';
      
      for (const tag of tagsObrigatorias) {
        // Testa se a tag existe e não está completamente vazia ou apenas com espaços/newlines
        const tagRegex = new RegExp(\`<(?:[^:]+:)?\${tag}(?:\\\\s[^>]*)?>([^<]+)<\\\\/(?:[^:]+:)?\${tag}\\\\s*>\`, 'i');
        const tagMatch = tagRegex.exec(bloco);
        
        if (!tagMatch || tagMatch[1].trim() === '') {
          // Identificar a linha exata onde a tag deveria estar ou a linha do fechamento do bloco
          let errLine = linhaInicio;
          // Procurar o fechamento do bloco para ancorar o erro mais próximo do final do elemento incompleto
          const fechamentoMatch = bloco.match(new RegExp(\`<\\\\/(?:[^:]+:)?\${nomeBloco.split(' ')[0]}\`, 'i'));
          if (fechamentoMatch && fechamentoMatch.index !== undefined) {
             errLine = localizador.linhaDe(matchBloco.index + fechamentoMatch.index);
          }
          
          inconsistencias.push({
            id: \`missing-\${tag}-\${errLine}-\${matchBloco.index}\`,
            linha: errLine,
            tipo: "Erro Estrutural",
            desc: \`\${prefix}Linha \${errLine}: Faltando elemento obrigatório. Falta informar <\${tag}> no bloco \${nomeBloco}.\`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "", // Precisa preenchimento manual
            seguro: false
          });
        }
      }
    }
  };

  // Aplica a validação universal nos principais blocos
  const blocosEquipeRegex = /<(?:[^:]+:)?equipeSadt(?:\\s[^>]*?)?(?:\\/>|>[\\s\\S]*?<\\/(?:[^:]+:)?equipeSadt\\s*>)/gi;
  validateBlockElements(blocosEquipeRegex, ['codProfissional', 'nomeProf', 'conselho', 'numeroConselhoProfissional', 'UF', 'CBOS'], 'equipeSadt');
  
  const profissionalSolicitanteRegex = /<(?:[^:]+:)?profissionalSolicitante(?:\\s[^>]*?)?(?:\\/>|>[\\s\\S]*?<\\/(?:[^:]+:)?profissionalSolicitante\\s*>)/gi;
  validateBlockElements(profissionalSolicitanteRegex, ['nomeProfissional', 'conselhoProfissional', 'numeroConselhoProfissional', 'UF', 'CBOS'], 'profissionalSolicitante');
  
  // MÓDULO ESTRUTURAL 1.5.1: Regras Específicas
  // O tipo de consulta é obrigatório se o tipo de atendimento for consulta (ex: 01)
  const dadosAtendimentoRegex = /<(?:[^:]+:)?dadosAtendimento(?:\\s[^>]*?)?(?:\\/>|>[\\s\\S]*?<\\/(?:[^:]+:)?dadosAtendimento\\s*>)/gi;
  let matchAtend: RegExpExecArray | null;
  while ((matchAtend = dadosAtendimentoRegex.exec(conteudo)) !== null) {
    const bloco = matchAtend[0];
    const tipoAtendimentoMatch = bloco.match(/<(?:[^:]+:)?tipoAtendimento(?:\\s[^>]*)?>([^<]+)</i);
    if (tipoAtendimentoMatch && tipoAtendimentoMatch[1].trim() === '01') {
       const tipoConsultaMatch = bloco.match(/<(?:[^:]+:)?tipoConsulta(?:\\s[^>]*)?>([^<]+)</i);
       if (!tipoConsultaMatch || tipoConsultaMatch[1].trim() === '') {
          const linha = localizador.linhaDe(matchAtend.index);
          const gNum = getGuiaNumeroForLine(linha);
          inconsistencias.push({
            id: \`missing-tipoconsulta-\${linha}-\${matchAtend.index}\`,
            linha: linha,
            tipo: "Erro Estrutural",
            desc: gNum ? \`Guia no \${gNum} | Linha \${linha}: Faltando elemento obrigatório. Falta informar <tipoConsulta> em atendimento de consulta (01).\` : \`Linha \${linha}: Faltando <tipoConsulta>.\`,
            original: "[BLOCO INCOMPLETO]",
            sugestao: "", 
            seguro: false
          });
       }
    }
  }`;

if (content.includes(moduleEstruturalOld)) {
  content = content.replace(moduleEstruturalOld, moduleEstruturalNew);
  fs.writeFileSync("src/utils/tissAuditor.ts", content);
  console.log("Updated TISS Auditor with Universal Missing Element checking.");
} else {
  console.log("Could not find the target code to replace.");
}
