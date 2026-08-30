const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'import { exportarXmlValidadoComHash } from "./utils/tissAuditor";',
  'import { exportarXmlValidadoComHash, sincronizarDadosGuia, sincronizarProcedimento } from "./utils/tissAuditor";\nimport { GuidesTable } from "./components/GuidesTable";'
);

content = content.replace(
  '  const handleApplySafeCorrections = () => {',
  `  const handleSincronizarGuia = (
    guide: GuideItem,
    novosDados: { carteira: string; guia: string; senha: string; guiaPrestador: string }
  ) => {
    if (!arquivoAtivo) return;
    const { novoConteudo, alterado } = sincronizarDadosGuia(arquivoAtivo.conteudo, guide, novosDados);

    if (alterado) {
      setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoConteudo, ultimaAtualizacao: new Date() } : a));
    }
  };

  const handleSincronizarProcedimento = (
    proc: ProcedimentoItem,
    novoCodigo: string,
    novoValor: string,
    novaQuantidade: string,
    novoValorUnitario: string,
    novaReducaoAcrescimo?: string,
    novaDataExecucao?: string
  ) => {
    if (!arquivoAtivo) return;
    const { novoConteudo, alterado } = sincronizarProcedimento(
      arquivoAtivo.conteudo,
      proc,
      { codigo: novoCodigo, valor: novoValor, quantidade: novaQuantidade, valorUnitario: novoValorUnitario, reducaoAcrescimo: novaReducaoAcrescimo, dataExecucao: novaDataExecucao }
    );

    if (alterado) {
      setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoConteudo, ultimaAtualizacao: new Date() } : a));
    }
  };

  const handleExcluirGuia = (guide: GuideItem) => {
    if (!arquivoAtivo) return;
    const split = arquivoAtivo.conteudo.split('\\n');
    split.splice(guide.startIdx - 1, guide.endIdx - guide.startIdx + 1);
    setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: split.join('\\n'), ultimaAtualizacao: new Date() } : a));
  };

  const handleApplySafeCorrections = () => {`
);

// We need to keep both tabs mounted but switch visibility using CSS so we don't lose the local table state.
const mainBody = `          {!arquivoAtivo ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-muted-foreground">
              <FileUp className="mb-4 size-10 opacity-50" />
              <p className="text-sm font-medium text-foreground">Nenhum lote XML ativo</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm text-center">
                Selecione um arquivo na barra lateral ou importe um novo arquivo XML para iniciar a auditoria.
              </p>
            </div>
          ) : aba === "guias" ? (
            <TabelaGuias guias={audit?.guias || []} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                {avancado ? <Editor arquivo={arquivoAtivo} inconsistencias={audit?.inconsistencias || []} linhaDestaque={linhaDestaque} onOpenHash={() => setModalHashReaderAberto(true)} onOpenSaveAs={() => setModalSaveAsAberto(true)} /> : <ResumoSimples audit={audit} />}
              </section>
              <PainelAuditoria 
                avancado={avancado} 
                inconsistencias={audit?.inconsistencias || []} 
                onApplySafe={handleApplySafeCorrections}
                onViewInXml={(linha) => {
                  setLinhaDestaque(linha);
                  setAba('split');
                }}
              />
            </div>
          )}`;

const newMainBody = `          {!arquivoAtivo ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-muted-foreground">
              <FileUp className="mb-4 size-10 opacity-50" />
              <p className="text-sm font-medium text-foreground">Nenhum lote XML ativo</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm text-center">
                Selecione um arquivo na barra lateral ou importe um novo arquivo XML para iniciar a auditoria.
              </p>
            </div>
          ) : (
            <>
              <div className={cn("min-h-0 flex-1 flex-col", aba === "guias" ? "flex" : "hidden")}>
                <GuidesTable 
                  guias={audit?.guias || []} 
                  onSincronizarGuia={handleSincronizarGuia}
                  onSincronizarProcedimento={handleSincronizarProcedimento}
                  onExcluirGuia={handleExcluirGuia}
                />
              </div>
              <div className={cn("min-h-0 flex-1 flex-col lg:flex-row", aba !== "guias" ? "flex" : "hidden")}>
                <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                  {avancado ? <Editor arquivo={arquivoAtivo} inconsistencias={audit?.inconsistencias || []} linhaDestaque={linhaDestaque} onOpenHash={() => setModalHashReaderAberto(true)} onOpenSaveAs={() => setModalSaveAsAberto(true)} /> : <ResumoSimples audit={audit} />}
                </section>
                <PainelAuditoria 
                  avancado={avancado} 
                  inconsistencias={audit?.inconsistencias || []} 
                  onApplySafe={handleApplySafeCorrections}
                  onViewInXml={(linha) => {
                    setLinhaDestaque(linha);
                    setAba('split');
                  }}
                />
              </div>
            </>
          )}`;

content = content.replace(mainBody, newMainBody);

// Delete TabelaGuias function from App.tsx
content = content.replace(/function TabelaGuias\(\{ guias \}: \{ guias: GuideItem\[\] \}\) \{[\s\S]+?\}\s+$/, '');

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx updated successfully.');
