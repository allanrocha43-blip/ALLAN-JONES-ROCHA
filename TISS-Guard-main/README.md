# TISS Guard 🛡️

**Inteligência de Auditoria e Automação de Faturamento Médico (Padrão TISS/ANS)**

O **TISS Guard** é uma ferramenta de vanguarda projetada para empoderar faturistas e gestores de saúde, eliminando o estresse das glosas médicas e o trabalho repetitivo da digitação de guias. 

Nascido da necessidade de modernizar o faturamento das clínicas brasileiras, o sistema funciona como um "guarda-costas" para seus arquivos XML. Em frações de segundo, ele cruza os dados do seu faturamento contra o rigoroso padrão exigido pela ANS (Agência Nacional de Saúde Suplementar) e, em seguida, assume o controle para preencher formulários web automaticamente através de um robô inteligente (RPA).

Tudo isso desenhado sob a premissa inegociável de **Offline-First**, garantindo 100% de adequação à LGPD.

---

## 🎯 Por Que o TISS Guard Existe?

O faturamento hospitalar e laboratorial lida com uma categoria de dados de altíssima sensibilidade e com regras de negócio que mudam frequentemente. Enviar um lote com erros estruturais resulta em devoluções (glosas), travando o fluxo de caixa da clínica.

O TISS Guard ataca este problema em duas frentes distintas:

1. **O Auditor (Painel Principal):** Uma interface elegante de controle onde você joga o seu arquivo XML. Ele diagnostica, previne erros estruturais e sugere correções antes mesmo do arquivo ser enviado ao convênio.
2. **O Operário (Robô de Preenchimento - RPA):** Um botão flutuante inteligente inserido dentro do site dos planos de saúde. Ele extrai os dados validados e digita guia por guia no site do convênio para você.

---

## ✨ Os Três Pilares da Plataforma

### 1. Conformidade Total com a LGPD (Privacidade em 1º Lugar)
Como lidamos com dados de saúde (nomes, CPFs, diagnósticos e procedimentos clínicos), o vazamento de informações não é uma opção. O TISS Guard processa os dados de forma estritamente local (no computador do faturista). Nenhum XML é enviado para a nuvem, banco de dados ou servidor externo. A sua informação nasce e morre dentro da sua máquina.

### 2. Motor de Validação Cirúrgico (XSD Mapping)
Baseado nos rigorosos esquemas (XSD) fornecidos pelo governo brasileiro, nossa inteligência de código aberto avalia o arquivo não apenas visualmente, mas estruturalmente:
* **Integridade TISS:** Validações de cardinalidade (se um campo é obrigatório) e tipagem (se as datas e numerações estão nos formatos certos).
* **Severidade Dinâmica:** Diferencia erros que bloqueiam o pagamento (Errors) de faltas de preenchimento recomendadas, mas opcionais (Warnings).
* **Tradução Humana:** Ao invés de entregar códigos de erro indecifráveis para o faturista, o TISS Guard traduz o problema e diz exatamente onde o cadastro deve ser ajustado.

### 3. RPA Semântico (Robotic Process Automation)
A nossa tecnologia de _FormFiller_ não decora apenas onde os botões de um site ficam. Ela possui um Dicionário Semântico capaz de "ler" a tela de qualquer portal (Unimed, Amil, SulAmérica). O robô vasculha a página em busca de campos que signifiquem "Data de Execução" ou "Nome do Paciente" e digita no lugar certo.

---

## 🚀 Como Instalar a Extensão (Modo Desenvolvedor)

Sendo uma aplicação voltada para segurança e produtividade, a instalação acontece em poucos segundos via Google Chrome ou derivados (Edge, Brave, Opera):

1. **Faça o download** deste projeto para o seu computador.
2. Abra o Google Chrome e digite na barra de endereços: `chrome://extensions`.
3. No canto superior direito, ative a chave chamada **"Modo do desenvolvedor"**.
4. Clique no botão **"Carregar sem compactação"** *(Load unpacked)* que apareceu no canto superior esquerdo.
5. Navegue até a pasta do projeto que você baixou e selecione a pasta interna chamada `dist`.
6. **Sucesso!** O escudo azul do TISS Guard já estará operante ao lado da barra de navegação do seu navegador. (Dica: Clique no ícone do quebra-cabeça e "fixe" a extensão para tê-la sempre à mão).

---

## 📘 Guia de Utilização Descomplicada

### A Sala de Controle: Auditando seu Lote (A Janelinha)
1. Clique no ícone do TISS Guard no seu navegador. O painel se abrirá.
2. Simplesmente arraste e solte o arquivo XML do seu sistema gerador para dentro do aplicativo.
3. Se o cartão piscar verde, sua guia está em conformidade estrutural máxima. Se piscar vermelho, nossa interface apontará de forma legível quais guias ou quais pacientes apresentam dados incompletos ou em desacordo com as regras da ANS. 
4. É possível baixar um relatório gerencial em TXT para a equipe de tecnologia do seu sistema.

### O Operário de Campo: O Robô em Ação (O Botão Flutuante)
1. Acesse o portal do convênio médico em questão.
2. Se o site estiver habilitado, um botão roxo chamado **"Preencher TISS"** flutuará discretamente no canto inferior direito.
3. Clique nele e selecione o mesmo arquivo XML já auditado.
4. Assista à tela. O robô assumirá o controle do teclado, preenchendo todos os inputs possíveis. Caso a página apresente uma variação desconhecida, o assistente entregará o controle de volta a você com avisos persistentes sobre o que falta terminar de preencher.

---

## 🛠️ Para Desenvolvedores e Auditores Técnicos

O projeto TISS Guard é uma arquitetura *Enterprise-Grade* construída sob princípios *SOLID* utilizando tecnologias de ponta modernas, empacotadas via Vite e TypeScript.

*   **Engine React/TailwindCSS:** Garante interfaces fluídas, suportando Dark/Light mode nativo de alta performance no Painel de Controle.
*   **Web Workers:** O _parsing_ de arquivos XML gigantes é delegado a Threads secundárias, jamais "congelando" a experiência do usuário durante o expediente de faturamento.
*   **IndexedDB Local:** O processamento offline é turbinado por um banco de dados hospedado inteiramente no navegador para cruzar informações complexas da Tabela TUSS.

> O **TISS Guard** não pretende apenas checar dados. A nossa missão é transformar o departamento de faturamento médico de um ambiente de retrabalho para um centro de receita preciso e moderno.
