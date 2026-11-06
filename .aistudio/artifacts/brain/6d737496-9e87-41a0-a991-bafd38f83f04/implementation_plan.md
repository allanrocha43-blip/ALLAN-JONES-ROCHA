# Plano de Melhorias de Experiência do Usuário (UX) & Testes Regressivos

Este plano detalha o resumo das modificações já consolidadas no sistema e os próximos passos para implementar as melhorias de UX priorizadas: **refinamento da tabela de guias com filtros e feedback visual de glosas** e **assistente de lote com checklist passo a passo para envio ANS**.

---

## 1. Resumo das Modificações Realizadas

Antes de avançar, consolidamos o histórico recente de intervenções técnicas:
1. **Auditoria em Passagem Única O(N)** (`src/utils/tiss/auditoria.ts`):
   - Eliminação de varreduras redundantes de regex sobre arquivos XML massivos.
   - Algoritmo de busca binária O(log N) para mapeamento de números de guias por linha.
2. **Motor Oficial de HASH MD5 ANS** (`src/utils/tiss/hash.ts` e `HashReaderModal.tsx`):
   - Concatenação limpa e ordenada de nós conforme o padrão ANS, evitando falsos positivos e memoizando cálculos para impedir re-renders desnecessários.
3. **Auditoria e Glosa de `<dataExecucao>` (Regra do Script Python)**:
   - Deteção imediata de tags vazias ou ausentes em procedimentos SP-SADT.
   - Atribuição do número da guia (`Guia nº {numeroGuiaPrestador}`) e código do procedimento.
   - Tratamento de formatação ISO `AAAA-MM-DD` com botão rápido "Hoje".
4. **Suavização e Microinterações**:
   - Curvas de easing cúbico natural (`ease: [0.16, 1, 0.3, 1]`) em todos os modais.
   - Substituição de diálogos nativos bloqueantes (`window.alert`) por feedback inline e toast.

---

## 2. Novas Melhorias de UX Propostas

Conforme suas respostas, o foco será a **Tabela de Guias** e o **Assistente de Lote com Checklist**:

### A. Tabela de Guias: Filtros Contextuais e Feedback Visual de Glosas
- **Segmented Control de Filtro de Status** (sem pills estáticas soltas, seguindo design limpo de SaaS):
  - `Todas as Guias` (com contador).
  - `Com Glosas Críticas` (filtra instantaneamente guias que possuem dados pendentes como `dataExecucao` vazia, erro órfão, etc.).
  - `Consultas` e `SP-SADT`.
- **Badges e Indicadores Visuais de Inconsistência na Linha da Guia**:
  - Indicador sutil de advertência/erro na coluna de status da guia quando houver inconsistências associadas àquele número de guia.
  - Tooltip informativo direto ao passar o mouse sobre o alerta da guia, informando exatamente qual regra foi violada.
- **Ações Rápidas por Guia**:
  - Botão de atalho rápido "Ver no XML" e "Ver Inconsistências" direto na linha da guia.
  - Manter o preenchimento rápido em lote ("Hoje", "Copiar Guia Prestador").

### B. Assistente de Lote com Checklist Interativo para Envio ANS
- **Novo Componente / Painel `AssistenteEnvioAnsModal.tsx` (ou Banner/Drawer Retrátil)**:
  - Checklist em 5 etapas essenciais para garantir que a operadora não rejeite o lote:
    1. **Estrutura & Versão XSD**: Verificação de tags obrigatórias do padrão TISS.
    2. **Glosas Críticas & Dados Obrigatórios**: Validação de carteiras, senhas e datas de execução de procedimentos.
    3. **Tabela e Vias de Acesso Cirúrgicas**: Alerta de procedimentos bilaterais / vias diferentes.
    4. **Integridade HASH MD5**: Verificação se a tag `<hash>` bate 100% com o conteúdo gerado.
    5. **Exportação Validada**: Ação de 1 clique para baixar o XML pronto para upload no portal da operadora.
  - Cada item exibe status: `Aprovado` (verde), `Pendente/Crítico` (vermelho com botão direto "Resolver"), ou `Aviso` (amarelo).
  - Botão de abertura rápida no Header principal: `"Assistente de Envio ANS"`.

---

## 3. Plano de Testes Regressivos de Funcionalidade

Após a implementação das melhorias de UX, serão executados:

1. **Testes Unitários e de Integração (`vitest`)**:
   - Teste de filtros da tabela de guias (filtro por status crítico e contadores).
   - Teste de vinculação de inconsistências por número de guia na tabela.
   - Teste do checklist do Assistente de Envio ANS frente a lotes válidos e lotes com erros.
   - Manutenção de 100% de aprovação nos 29 testes existentes.
2. **Validação de Sintaxe e Tipagem**:
   - `tsc --noEmit` (zero erros de lint e TypeScript).
3. **Validação de Compilação & Servidor**:
   - `npm run build` (geração de bundle sem falhas).
   - Teste HTTP 200 nas portas 3000 (`/api/health`) e 8080.
