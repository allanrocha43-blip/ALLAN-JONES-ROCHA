const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
content = content.replace(
  'import { SAMPLE_TISS_WITH_ERRORS } from "./utils/sampleXmls";',
  'import { SAMPLE_TISS_WITH_ERRORS, SAMPLE_TISS_4_SADT } from "./utils/sampleXmls";\nimport { HospitalModal } from "./components/HospitalModal";\nimport { ExtratorAnsModal } from "./components/ExtratorAnsModal";\nimport { SaveAsModal } from "./components/SaveAsModal";\nimport { HashReaderModal } from "./components/HashReaderModal";\nimport { CriticalAuditPopup } from "./components/CriticalAuditPopup";\nimport { exportarXmlValidadoComHash } from "./utils/tissAuditor";'
);

// State hooks
content = content.replace(
  '  const [aba, setAba] = useState("split");\n  const [linhaDestaque, setLinhaDestaque] = useState<number | null>(null);',
  '  const [aba, setAba] = useState("split");\n  const [linhaDestaque, setLinhaDestaque] = useState<number | null>(null);\n\n  const [nomeHospital, setNomeHospital] = useState("HOSPITAL H OLHOS");\n  const [modalHospitalAberto, setModalHospitalAberto] = useState(false);\n  const [modalExtratorAnsAberto, setModalExtratorAnsAberto] = useState(false);\n  const [modalSaveAsAberto, setModalSaveAsAberto] = useState(false);\n  const [modalHashReaderAberto, setModalHashReaderAberto] = useState(false);\n  const [modalCriticalAberto, setModalCriticalAberto] = useState(false);\n  const [criticalErrors, setCriticalErrors] = useState<Inconsistency[]>([]);\n  const shownCriticalForFile = useRef<Set<string>>(new Set());'
);

// Critical errors effect
content = content.replace(
  '  const audit = useMemo(() => {\n    if (!arquivoAtivo) return null;\n    return executarAuditoriaDinamica(arquivoAtivo.conteudo);\n  }, [arquivoAtivo]);',
  '  const audit = useMemo(() => {\n    if (!arquivoAtivo) return null;\n    return executarAuditoriaDinamica(arquivoAtivo.conteudo);\n  }, [arquivoAtivo]);\n\n  useEffect(() => {\n    if (audit && arquivoAtivo) {\n      const crits = audit.inconsistencias.filter(i => i.tipo.toLowerCase().includes("erro") || i.tipo.toLowerCase().includes("xsd"));\n      if (crits.length > 0 && !shownCriticalForFile.current.has(arquivoAtivo.id)) {\n        setCriticalErrors(crits);\n        setModalCriticalAberto(true);\n        shownCriticalForFile.current.add(arquivoAtivo.id);\n      }\n    }\n  }, [audit, arquivoAtivo]);'
);

// Add handlers for files
content = content.replace(
  '  const handleApplySafeCorrections = () => {',
  `  const loadExample = (id: string, name: string, content: string) => {
    const newFile: LoadedFile = {
      id,
      nome: name,
      conteudo: content,
      tamanhoBytes: new Blob([content]).size,
      dataCarregamento: new Date(),
      ultimaAtualizacao: new Date(),
    };
    setArquivos((prev) => [...prev, newFile]);
    setArquivoAtivoId(newFile.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target && typeof evt.target.result === 'string') {
          const newFile: LoadedFile = {
            id: crypto.randomUUID(),
            nome: file.name,
            conteudo: evt.target.result,
            tamanhoBytes: file.size,
            dataCarregamento: new Date(),
            ultimaAtualizacao: new Date(),
          };
          setArquivos((prev) => [...prev, newFile]);
          setArquivoAtivoId(newFile.id);
        }
      };
      reader.readAsText(file, 'utf-8'); // TISS defaults to utf-8 or ISO-8859-1
    });
    e.target.value = '';
  };

  const handleExport = () => {
    if (!arquivoAtivo) return;
    const blob = exportarXmlValidadoComHash(arquivoAtivo.conteudo);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = arquivoAtivo.nome.replace('.xml', '_validado.xml');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplySafeCorrections = () => {`
);

// Add buttons to Sidebar
content = content.replace(
  '          <div className="px-3 pb-2">\n            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90">\n              <FileUp className="size-3.5" /> Importar lote XML\n            </button>\n          </div>',
  `          <div className="px-3 pb-2 space-y-2">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
              <FileUp className="size-3.5" /> Adicionar XML
              <input type="file" accept=".xml" multiple className="hidden" onChange={handleFileUpload} />
            </label>
            <div className="flex gap-2">
              <button 
                onClick={() => loadExample(crypto.randomUUID(), 'exemplo_tiss3.xml', SAMPLE_TISS_WITH_ERRORS)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Exemplo TISS 3
              </button>
              <button 
                onClick={() => loadExample(crypto.randomUUID(), 'exemplo_tiss4.xml', SAMPLE_TISS_4_SADT)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Exemplo TISS 4
              </button>
            </div>
            <button 
              onClick={() => setModalExtratorAnsAberto(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-info/40 bg-info-surface/20 px-2 py-1.5 text-[11px] text-info hover:bg-info-surface transition-colors"
            >
              Extrator Operadoras (IA)
            </button>
          </div>`
);

// Add Modals and wrap the return
content = content.replace(
  '      <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-surface px-4">',
  `      {modalHospitalAberto && (
        <HospitalModal
          nomeAtual={nomeHospital}
          onSalvar={(novo) => setNomeHospital(novo)}
          onFechar={() => setModalHospitalAberto(false)}
        />
      )}
      {modalExtratorAnsAberto && (
        <ExtratorAnsModal
          onFechar={() => setModalExtratorAnsAberto(false)}
          onAplicarRazaoSocial={(novoNome) => setNomeHospital(novoNome)}
        />
      )}
      <SaveAsModal
        isOpen={modalSaveAsAberto}
        nomeAtual={arquivoAtivo?.nome || 'lote_tiss.xml'}
        conteudoAtual={arquivoAtivo?.conteudo || ''}
        onClose={() => setModalSaveAsAberto(false)}
        onSalvarComoSucesso={(nome, conteudo) => {
           loadExample(crypto.randomUUID(), nome, conteudo);
           setModalSaveAsAberto(false);
        }}
      />
      <HashReaderModal
        isOpen={modalHashReaderAberto}
        onClose={() => setModalHashReaderAberto(false)}
        conteudoXmlAtivo={arquivoAtivo?.conteudo || ''}
        nomeArquivoAtivo={arquivoAtivo?.nome || ''}
        onAtualizarXml={(novoXml, novoHash) => {
          if (arquivoAtivo) {
            setArquivos(prev => prev.map(a => a.id === arquivoAtivo.id ? { ...a, conteudo: novoXml, ultimaAtualizacao: new Date() } : a));
          }
        }}
      />
      <CriticalAuditPopup
        isOpen={modalCriticalAberto}
        onClose={() => setModalCriticalAberto(false)}
        errors={criticalErrors}
      />
      <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-surface px-4">`
);

// Add top header buttons
content = content.replace(
  '            <div className="min-w-0 leading-tight">\n              <div className="truncate font-display text-[15px] font-semibold tracking-tight">\n                Auditor TISS Pro\n              </div>\n              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">\n                ANS · Saúde Suplementar\n              </div>\n            </div>\n          </div>\n          {audit && (\n            <div className="hidden items-center gap-2 text-xs xl:flex">\n              <Chip tone="info">TISS {audit.versaoTiss}</Chip>\n              <Chip>CNPJ {audit.cnpjBase}</Chip>\n              <Chip>Guias: {audit.guias.length}</Chip>\n              <Chip tone="ok">Total: {totalValue}</Chip>\n            </div>\n          )}',
  `            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-[15px] font-semibold tracking-tight">
                Auditor TISS Pro <span className="text-[10px] text-info ml-1">v9.0</span>
              </div>
            </div>
          </div>
          
          <div className="hidden items-center gap-2 xl:flex">
            <button onClick={() => setModalHospitalAberto(true)} className="flex items-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
              {nomeHospital}
            </button>
            <button onClick={() => setModalHashReaderAberto(true)} className="flex items-center gap-1.5 rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
              # Validador HASH
            </button>
            <button onClick={() => setModalExtratorAnsAberto(true)} className="flex items-center gap-1.5 rounded border border-info/40 bg-info-surface/20 px-2 py-1 text-[11px] text-info hover:bg-info-surface">
              Extrator ANS IA
            </button>
          </div>

          {audit && (
            <div className="hidden items-center gap-3 text-[11px] text-muted-foreground xl:flex ml-4">
              <span>Padrão: <span className="text-foreground font-mono font-medium">{audit.versaoTiss}</span></span>
              <span className="w-px h-3 bg-border"></span>
              <span>CNPJ: <span className="text-foreground font-mono font-medium">{audit.cnpjBase}</span></span>
              <span className="w-px h-3 bg-border"></span>
              <span>Total Lote: <span className="text-warn font-medium bg-warn-surface px-1.5 py-0.5 rounded border border-warn/40">{totalValue}</span></span>
            </div>
          )}`
);

content = content.replace(
  '              <button className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground">\n                <Download className="size-3.5" /> Exportar\n              </button>\n              <button className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90">\n                <Play className="size-3.5" /> Processar lote\n              </button>',
  `              <button className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
                Relatório
              </button>
              <button className="flex items-center gap-1.5 rounded-md bg-info text-info-surface px-2.5 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-90">
                <Play className="size-3.5" /> Processar Lote
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 rounded-md bg-ok text-ok-surface px-2.5 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-90">
                <Download className="size-3.5" /> Exportar Validado
              </button>`
);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx updated');
