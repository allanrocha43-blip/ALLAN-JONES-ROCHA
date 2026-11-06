# 🏥 Auditor TISS Pro v8.0

> **Validador, Auditor e Conciliador de Lotes XML no Padrão TISS da ANS (Agência Nacional de Saúde Suplementar)**

O **Auditor TISS Pro** é uma solução completa de engenharia de software voltada para faturamento hospitalar, clínicas e operadoras de saúde suplementar. A ferramenta audita arquivos XML de faturamento médico, identifica antecipadamente potenciais glosas contratuais e estruturais, sincroniza edições em tempo real, valida regras de vias cirúrgicas/TUSS e gera a assinatura de integridade HASH MD5 oficial exigida pela ANS.

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Checklist de Pré-Envio ANS](#-checklist-de-pré-envio-ans)
- [Pilhas e Tecnologias](#-pilhas-e-tecnologias)
- [Instalação e Execução Local](#-instalação-e-execução-local)
- [Como Utilizar a Ferramenta](#-como-utilizar-a-ferramenta)
- [Regras de Auditoria e Prevenção de Glosas](#-regras-de-auditoria-e-prevenção-de-glosas)
- [Cálculo do HASH MD5 da ANS](#-cálculo-do-hash-md5-da-ans)
- [Testes e Qualidade de Código](#-testes-e-qualidade-de-código)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Licença](#-licença)

---

## 🔍 Visão Geral

No faturamento hospitalar brasileiro, pequenos erros em arquivos XML TISS (como tags vazias, datas de execução não preenchidas, divergências em procedimentos bilaterais ou hash MD5 incompatível) resultam em glosas totais ou atrasos de repasses financeiros pelas operadoras.

O **Auditor TISS Pro** atua como uma barreira preventiva:
1. Faz o **parse inteligente** do XML mesmo em lotes extensos com múltiplas guias.
2. Identifica instantaneamente inconsistências classificadas por severidade (**Crítica**, **Aviso**, **Inconsistência**).
3. Permite **edição direta no painel tabular de guias**, sincronizando o XML de forma bidirecional.
4. Fornece um **assistente passo a passo (checklist)** para garantir 100% de conformidade antes da transmissão à operadora.
5. Recalcula e grava o **Hash MD5 oficial da ANS** automaticamente no epílogo do XML.

---

## ✨ Funcionalidades Principais

* **🛡️ Auditoria Dinâmica Prévia a Glosas**:
  * Validação estrita de `<dataExecucao>` em guias SP-SADT e Consulta (aponta guia do prestador e linha exata).
  * Checagem de integridade estrutural XSD (schemas ANS TISS versões 3.x e 4.x).
  * Detecção de guias órfãs, caracteres inválidos, formatação monetária e divergência de valores declarados versus somatório de procedimentos.
* **📊 Tabela Interativa de Guias e Procedimentos (`GuidesTable`)**:
  * **Controles Segmentados de Filtragem**: Alternância instantânea entre *Todas*, *Com Glosa Crítica*, *Consultas* e *SADT / Exames / Cirurgias* com contadores em tempo real.
  * **Alertas Visuais na Linha da Guia**: Badges vermelhos com tooltips informativos indicando a regra violada.
  * **Salto Rápido para o Código XML**: Botão dedicado de atalho para posicionar o cursor e destacar a linha exata no editor.
  * **Edição e Sincronização Inline**: Ajuste de carteira, número de guia, senha, guia do prestador, código TUSS, quantidade, valor unitário, valor total e redução/acréscimo.
* **📋 Assistente de Envio ANS (Checklist de 5 Etapas)**:
  * Modal orientador com diagnósticos em tempo real:
    1. *Padrão ANS & Estrutura XML*
    2. *Glosas Críticas & Dados Mandatórios*
    3. *Tabela TUSS & Vias Cirúrgicas*
    4. *Assinatura & Hash MD5 da ANS*
    5. *Exportação do Lote Validado*
* **📝 Editor XML Profissional com CodeMirror 6**:
  * Gutter markers inteligentes (indicadores visuais de erro vermelho e aviso amarelo nas linhas afetadas).
  * Suporte a Split View (Editor XML à esquerda + Painel de Correções à direita).
  * Formatação automática e busca avançada por tags ou valores.
* **🔑 Validador e Gerador de HASH MD5**:
  * Módulo dedicado para conferência, auditoria de cadeia de caracteres e geração do hash MD5 oficial em conformidade com o manual da ANS.
* **🤖 Extrator ANS com Inteligência Artificial**:
  * Integração para identificação e saneamento cadastral de operadoras de planos de saúde.

---

## 🚀 Checklist de Pré-Envio ANS

| Etapa | Verificação | Ação Recomendada |
| :--- | :--- | :--- |
| **1. Padrão ANS** | Versão do padrão (ex: `4.01.00+`) e CNPJ base | Checar conformidade no cabeçalho |
| **2. Glosas Críticas** | Datas de execução vazias, guias órfãs, dados mandatórios | Preenchimento obrigatório antes da exportação |
| **3. Procedimentos & Vias** | Codificação TUSS/CBHPM, percentuais de redução/acréscimo e vias cirúrgicas | Conferência na Tabela de Guias |
| **4. Assinatura HASH** | Recálculo do MD5 sobre os valores textuais sequenciais | Executado automaticamente ao exportar |
| **5. Exportação** | Download do XML corrigido e formatado | Envio direto ao portal da operadora |

---

## 🛠️ Pilhas e Tecnologias

- **Frontend**: [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/)
- **Editor de Código**: [CodeMirror 6](https://codemirror.net/) (`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-xml`, `@codemirror/search`)
- **Criptografia & Hashing**: [SparkMD5](https://github.com/satazor/js-spark-md5), [Crypto-JS](https://github.com/brix/crypto-js)
- **Backend / Proxy**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [tsx](https://github.com/privatenumber/tsx)
- **Build & Testes**: [Vite 6](https://vitejs.dev/), [Vitest](https://vitest.dev/), [esbuild](https://esbuild.github.io/)
- **Ícones**: [Lucide React](https://lucide.dev/)

---

## 💻 Instalação e Execução Local

### Pré-requisitos
- **Node.js**: Versão 20.x ou superior recomendada
- **npm** ou **yarn** / **pnpm**

### Passos de Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/auditor-tiss-pro.git
   cd auditor-tiss-pro
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A aplicação estará acessível em `http://localhost:3000`.

4. **Gerar a build de produção:**
   ```bash
   npm run build
   npm start
   ```

---

## 📖 Como Utilizar a Ferramenta

### 1. Importação de Arquivos XML
* Clique no botão **"Adicionar XML"** na barra lateral esquerda ou arraste seus arquivos `.xml`.
* É possível carregar os arquivos de teste pré-configurados clicando em **"Exemplo TISS 3"** ou **"Exemplo TISS 4"**.

### 2. Auditoria e Análise de Inconsistências
* Ao selecionar um lote, o sistema processa automaticamente a estrutura do arquivo.
* O resumo superior exibe o Padrão TISS, CNPJ base, valor total do lote e o contador de inconsistências.
* No painel **Correções**, cada inconsistência apresenta:
  * Linha exata do XML;
  * Classificação (Crítico, Aviso, Regra XSD, etc.);
  * Trecho original e valor sugerido;
  * Botão **"Ver no XML"** para focar a linha com syntax highlight;
  * Botão **"Corrigir"** para aplicar correção segura pontual.

### 3. Navegação e Edição na Aba "Tabela de Guias"
* Acesse a aba **"Guias"** no topo da área principal.
* Utilize os filtros segmentados para isolar guias:
  * Clique em **"Com Glosa Crítica"** para ver apenas as guias com erros impeditivos (ex.: `<dataExecucao>` vazia).
* Altere valores diretamente nos campos de texto e selecione **"Salvar"** ou sincronize os dados. O XML subjacente é atualizado de imediato.

### 4. Checklist Pré-Envio e Exportação
* No menu superior, clique em **"Checklist ANS"**.
* Verifique se todos os itens estão aprovados (ícone verde).
* Clique em **"Exportar Validado"**: o sistema irá gerar o XML limpo com o **Hash MD5 oficial recalculado**, efetuando o download imediato do arquivo pronto para transmissão.

---

## 🛡️ Regras de Auditoria e Prevenção de Glosas

| Código / Regra | Tipo | Comportamento do Auditor |
| :--- | :--- | :--- |
| **`dataExecucao` vazia** | **Glosa Crítica** | Detecta tags vazias ou ausentes em guias SADT e Consulta, aponta o número da guia do prestador e exige preenchimento. |
| **Divergência de HASH MD5** | **Erro Estrutural** | Recalcula a concatenação das tags e corrige o nó `<epilogo><hash>` com o hash MD5 da ANS. |
| **Vias de Acesso e Procedimentos Bilaterais** | **Regra TUSS** | Audita regras de vias cirúrgicas iguais ou diferentes e os percentuais de redução/acréscimo CBHPM. |
| **Formato Monetário e Casas Decimais** | **Regra XSD** | Valida se os valores possuem exatamente 2 casas decimais e separador decimal compatível. |
| **Guias e Procedimentos Órfãos** | **Inconsistência** | Alerta quando existem procedimentos fora de estruturas de guias válidas. |

---

## 🔐 Cálculo do HASH MD5 da ANS

De acordo com o Manual do Padrão TISS da ANS:
1. O hash é calculado **removendo a própria tag `<hash>`** e comentários XML.
2. Extraem-se sequencialmente todos os valores textuais contidos entre as tags (`>conteúdo<`), desconsiderando espaçamentos em branco puros de indentação entre tags (`><`).
3. Concatena-se a cadeia de caracteres resultante.
4. Aplica-se a função de resumo criptográfico **MD5**, convertendo o resultado em caracteres minúsculos (hexadecimal).

O módulo `src/utils/tiss/hash.ts` implementa rigorosamente esse algoritmo utilizando `SparkMD5`.

---

## 🧪 Testes e Qualidade de Código

O projeto conta com suíte de testes automatizados com cobertura para cálculos de hash, regras de auditoria e testes de estresse/regressão:

```bash
# Executa a suíte de testes Vitest
npm test

# Executa os testes em modo contínuo (watch)
npm run test:watch

# Validação de tipagem e integridade TypeScript
npm run lint
```

---

## 📂 Estrutura do Projeto

```text
├── src/
│   ├── components/
│   │   ├── AssistenteEnvioAnsModal.tsx   # Checklist interativo de 5 etapas para envio ANS
│   │   ├── CriticalAuditPopup.tsx        # Modal de alerta para erros críticos imediatos
│   │   ├── ExtratorAnsModal.tsx          # Extrator inteligente de operadoras
│   │   ├── GuidesTable.tsx               # Tabela interativa com filtros e badges de glosa
│   │   ├── HashReaderModal.tsx           # Validador e leitor de hash MD5
│   │   ├── HospitalModal.tsx             # Configurações do prestador / hospital
│   │   ├── SaveAsModal.tsx               # Salvar arquivo com novo nome/versão
│   │   └── ViasAcessoModal.tsx           # Calculadora e orientador de vias cirúrgicas
│   ├── types/
│   │   └── tiss.ts                       # Tipos TypeScript para guias, auditoria e inconsistências
│   ├── utils/
│   │   ├── tiss/
│   │   │   ├── auditoria.ts              # Motor principal de auditoria de regras TISS
│   │   │   ├── correcoes.ts              # Sincronização de guias e correções seguras
│   │   │   ├── formatting.ts             # Formatação e harmonização do XML
│   │   │   ├── hash.ts                   # Cálculo do algoritmo MD5 da ANS
│   │   │   └── parser.ts                 # Extração rápida de guias e nós XML
│   │   ├── sampleXmls.ts                 # XMLs de exemplo TISS 3 e TISS 4
│   │   ├── severidade.ts                 # Classificadores de severidade (Crítico, Aviso, OK)
│   │   └── tissAuditor.ts                # Ponto de exportação unificado do motor
│   ├── App.tsx                           # Interface principal e gerenciamento de estado
│   └── main.tsx                          # Ponto de entrada React
├── server.ts                             # Servidor Express com rotas de API e proxy Vite
├── package.json                          # Dependências e scripts do projeto
└── tsconfig.json                         # Configurações de compilação TypeScript
```

---

## 📄 Licença

Este projeto é disponibilizado sob a licença [MIT](LICENSE). Sinta-se à vontade para utilizar, contribuir e adaptar às necessidades do seu hospital ou operadora de saúde.
