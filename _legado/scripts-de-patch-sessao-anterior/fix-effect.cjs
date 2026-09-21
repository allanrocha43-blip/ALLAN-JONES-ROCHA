const fs = require('fs');

let content = fs.readFileSync('src/components/GuidesTable.tsx', 'utf-8');

const regex = /\/\/ Sync formState whenever guias change[\s\S]*?\}, \[guias\]\);/m;

const newUseEffect = `// Refs to track the last known XML state so we don't overwrite user edits unless the XML actually changed
  const xmlStateRef = React.useRef<Record<string, any>>({});
  const xmlProcStateRef = React.useRef<Record<string, any>>({});

  useEffect(() => {
    setFormState(prev => {
      const next = { ...prev };
      guias.forEach((g) => {
        const lastXml = xmlStateRef.current[g.id];
        const currentXml = { carteira: g.carteira || '', guia: g.guia || '', senha: g.senha || '', guiaPrestador: g.guiaPrestador || '' };
        const currentForm = prev[g.id];

        if (!currentForm) {
          next[g.id] = currentXml;
        } else {
          let updated = { ...currentForm };
          let changed = false;
          if (lastXml) {
             for (const key of ['carteira', 'guia', 'senha', 'guiaPrestador']) {
                if (lastXml[key] !== currentXml[key as keyof typeof currentXml]) {
                   updated[key as keyof typeof updated] = currentXml[key as keyof typeof currentXml];
                   changed = true;
                }
             }
          }
          if (changed) next[g.id] = updated;
        }
        xmlStateRef.current[g.id] = currentXml;
      });
      return next;
    });

    setProcFormState(prev => {
      const next = { ...prev };
      guias.forEach((g) => {
        if (g.procedimentos) {
          g.procedimentos.forEach(p => {
            const lastXml = xmlProcStateRef.current[p.id];
            const currentXml = {
              codigo: p.codigo || '',
              quantidade: p.quantidade || '',
              valorUnitario: p.valorUnitario || '',
              reducaoAcrescimo: p.reducaoAcrescimo || '',
              valor: p.valor || '',
              dataExecucao: p.dataExecucao || '',
            };
            const currentForm = prev[p.id];

            if (!currentForm) {
              next[p.id] = currentXml;
            } else {
              let updated = { ...currentForm };
              let changed = false;
              if (lastXml) {
                 for (const key of ['codigo', 'quantidade', 'valorUnitario', 'reducaoAcrescimo', 'valor', 'dataExecucao']) {
                    if (lastXml[key] !== currentXml[key as keyof typeof currentXml]) {
                       updated[key as keyof typeof updated] = currentXml[key as keyof typeof currentXml];
                       changed = true;
                    }
                 }
              }
              if (changed) next[p.id] = updated;
            }
            xmlProcStateRef.current[p.id] = currentXml;
          });
        }
      });
      return next;
    });
  }, [guias]);`;

content = content.replace(regex, newUseEffect);

fs.writeFileSync('src/components/GuidesTable.tsx', content);
console.log('Fixed useEffect');
