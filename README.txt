================================================================================
AUDITOR TISS PRO v8.0 - DOCUMENTAÇÃO DO SISTEMA E MANUAL DO USUÁRIO
Padrão TISS - Agência Nacional de Saúde Suplementar (ANS)
================================================================================

1. VISÃO GERAL
--------------------------------------------------------------------------------
O Auditor TISS Pro é uma solução completa de engenharia de software voltada
para faturamento hospitalar, clínicas e operadoras de saúde suplementar. A
ferramenta audita arquivos XML de faturamento médico, identifica antecipadamente
potenciais glosas contratuais e estruturais, sincroniza edições em tempo real,
valida regras de vias cirúrgicas/TUSS e gera a assinatura de integridade HASH
MD5 oficial exigida pela ANS.

2. FUNCIONALIDADES PRINCIPAIS
--------------------------------------------------------------------------------
* Auditoria Dinâmica Prévia a Glosas:
  - Validação estrita de <dataExecucao> em guias SP-SADT e Consulta.
  - Inconsistência de Elegibilidade Biológica: cruza sexo (M/F) com procedimentos
    anatomicamente restritos (partos, obstetrícia, curetagem, histerectomia vs
    prostatectomia, vasectomia, biópsia de próstata).
  - Inconsistência de Faixa Etária: valida data de nascimento para procedimentos
    neonatais (teste do pezinho) e obstétricos.
  - Limites de Valores Financeiros: bloqueio de valor unitário ou total nulo (R$ 0,00)
    ou negativo, além de alertas de tetos de tolerância (consultas > R$ 2.500,00).
  - Compatibilidade Tipo de Guia x Código TUSS: alerta quando cirurgias do
    capítulo 3 ou exames de alta complexidade são faturados em Guia de Consulta.
  - Checagem de integridade estrutural XSD (schemas ANS TISS versões 3.x e 4.x).
  - Cálculo de somatórios de guias e lotes.

* Tabela Interativa de Guias e Procedimentos (GuidesTable):
  - Controles Segmentados de Filtragem: Todas, Com Glosa Crítica, Consultas e SADT.
  - Alertas Visuais: Badges contextuais de glosa crítica e avisos.
  - Salto Rápido para o Código XML com foco e highlight de linha.
  - Edição e Sincronização Inline de guias e procedimentos.

* Assistente de Envio ANS (Checklist de 5 Etapas):
  - 1. Padrão ANS & Estrutura XML
  - 2. Glosas Críticas & Dados Mandatórios (bloqueia lote se houver erro impeditivo)
  - 3. Tabela TUSS & Vias Cirúrgicas
  - 4. Assinatura & Hash MD5 da ANS
  - 5. Exportação do Lote Validado com regravação de Hash

* Editor XML Profissional com CodeMirror 6:
  - Gutter markers de erro e aviso, busca, e visualização dividida (Split View).

* Validador e Gerador de HASH MD5 da ANS:
  - Extração de valores textuais ordenados de tags XML e algoritmo oficial MD5.

3. INSTALAÇÃO E EXECUÇÃO LOCAL (GETTING STARTED)
--------------------------------------------------------------------------------
Pré-requisitos:
- Node.js 20.x ou superior
- Gerenciador de pacotes npm

Comandos:
1. Clonar o repositório:
   git clone https://github.com/seu-usuario/auditor-tiss-pro.git
   cd auditor-tiss-pro

2. Instalar dependências:
   npm install

3. Iniciar servidor de desenvolvimento:
   npm run dev
   Acesse a aplicação em http://localhost:3000

4. Build de produção:
   npm run build
   npm start

4. COMO UTILIZAR A FERRAMENTA
--------------------------------------------------------------------------------
1. Importação do Lote:
   - Clique em "Adicionar XML" na barra lateral ou arraste seus arquivos XML.
   - Use os botões "Exemplo TISS 3" ou "Exemplo TISS 4" para testar de imediato.

2. Auditoria e Correção:
   - O sistema audita o arquivo instantaneamente.
   - No painel "Correções", revise as inconsistências e clique em "Ver no XML"
     ou "Corrigir" para aplicar correções seguras.

3. Tabela de Guias:
   - Acesse a aba "Guias" no topo.
   - Filtre por "Com Glosa" para localizar guias com dados pendentes.
   - Edite os campos e clique em salvar/sincronizar.

4. Checklist de Envio ANS:
   - Clique no botão "Checklist ANS" no cabeçalho.
   - Confira os 5 passos de validação.
   - Clique em "Exportar Validado" para baixar o XML corrigido com Hash MD5.

5. VALIDADOR DE HASH MD5
--------------------------------------------------------------------------------
- Clique em "# Validador HASH" no cabeçalho superior.
- Visualize a string concatenada de tags e o MD5 calculado segundo o padrão ANS.
- Atualize a tag <hash> do XML com 1 clique se houver divergência.

6. TESTES E QUALIDADE DE CÓDIGO
--------------------------------------------------------------------------------
- Executar suíte de testes Vitest:
  npm test

- Validação de tipagem e integridade TypeScript:
  npm run lint

7. PILHAS E TECNOLOGIAS (TECH STACK)
--------------------------------------------------------------------------------
- Frontend: React 19, TypeScript, Tailwind CSS v4, Motion
- Editor: CodeMirror 6 (@codemirror/view, @codemirror/state, @codemirror/lang-xml)
- Criptografia: SparkMD5, Crypto-JS
- Backend / Servidor: Node.js, Express, tsx
- Testes: Vitest

8. LICENÇA
--------------------------------------------------------------------------------
Licença MIT.
