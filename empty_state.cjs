const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const mainBody = `          {aba === "guias" ? (
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
          
content = content.replace(mainBody, newMainBody);

fs.writeFileSync('src/App.tsx', content);
console.log('Empty state added');
