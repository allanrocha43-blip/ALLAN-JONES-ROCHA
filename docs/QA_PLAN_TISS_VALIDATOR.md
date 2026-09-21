# Plano de Testes de Qualidade: Validador TISS 4.02.00 / 4.03.00

Este documento define a estratégia, cenários de automação e matriz de rastreabilidade para garantir a estabilidade do Motor de Validação TISS durante períodos de alto volume de faturamento (Fechamento de Mês).

## 1. Escopo e Configuração do Ambiente

### 1.1 Configuração da Infraestrutura (Fase 1 - Endurance de 6 Horas)
Para rodar o teste de carga projetado para validar **Memory Leaks** e **Robustez de Threading**:
1. **Ferramenta**: Locust (Distribuído em 3-5 workers).
2. **Tempo de Execução**: `6h00m`.
3. **Pico Alvo**: Manter `100 req/s` consistentes.
4. **Métricas de Infraestrutura a Monitorar (via Datadog/NewRelic/Grafana)**:
   - **Consumo de RAM (RSS)**: O consumo do parser XML (`lxml`/DOM) não pode escalar indefinidamente (identificação de memory leaks).
   - **Latência p99**: Deve ficar abaixo de `250ms` para payloads padrão.
   - **Taxa de Rejeição Fail-Fast**: XMLs antigos devem ser ejetados antes do parse completo (ideal `< 100ms`).

### 1.2 Dependências
Instale os requisitos de automação na sua máquina/pipeline:
```bash
pip install -r scripts/qa/requirements.txt
```

---

## 2. Fase 1: Execução do Teste de Estresse

Utilize o arquivo `locust_stress_test.py` para aplicar a carga:

```bash
# Rodar o Locust localmente apontando para o ambiente de Homologação/Pre-Prod
locust -f scripts/qa/locust_stress_test.py --host=https://api-tiss.seu-ambiente.com.br --users 500 --spawn-rate 50 --run-time 6h
```
*O script foi desenhado com distribuição 80/10/10 para simular tráfego normal, requisições obsoletas (fail-fast) e faturamentos gigantes (Memory Leak).*

---

## 3. Fase 2: Bateria de Testes Funcionais (Casos Reais)

Os casos de uso críticos (Edge Cases médicos e de negócio) foram implementados usando o framework `pytest` no arquivo `test_tiss_scenarios.py`.

Para executar a validação de regras de negócio:
```bash
pytest scripts/qa/test_tiss_scenarios.py -v
```

### Casos Mapeados:
1. **OPME Oftalmológica (Facectomia com LIO)**: Valida dependências complexas da tag `<equipeSadt>`.
2. **Alta Complexidade Oncológica (Quimioterapia)**: Força erros de arredondamento em campos XSD (ex: `150.333` em vez de `150.33`).
3. **Inconsistência de Roteamento**: Injeta códigos TUSS de procedimentos em guias que declaram tabela de materiais.
4. **Falsos Positivos de Assinatura**: Simula Namespace W3C da tag `<Signature>` corrompido.

---

## 4. Matriz de Rastreabilidade (Cenários vs. Códigos ANS)

O validador deve retornar estritamente os códigos de erro padronizados pela Instrução Normativa da ANS ao barrar os cenários testados:

| ID Cenário | Descrição do Caso de Teste | Erro ANS Esperado | Criticidade | Comportamento Esperado do Motor |
| :--- | :--- | :--- | :--- | :--- |
| `QA-TISS-01` | **Stress Test**: Submissão massiva de guias (50k lotes/seg) | N/A (Status 200) | Alta | Processamento resiliente sem pico indomável de RAM (OOM). |
| `QA-TISS-02` | **Fail-Fast**: Recebimento de Lote TISS versão 3.02.00 | **1011** | Média | Barrar no Regex/Cabeçalho `<Padrao>` antes do parse profundo DOM (Latência < 100ms). |
| `QA-TISS-03` | **XSD SimpleType**: Valor monetário com 3 casas decimais (150.333) | **5001** | Alta | Rejeição estrutural por violação do XSD oficial da ANS. |
| `QA-TISS-04` | **Assinatura**: Namespace `<Signature>` adulterado / corrompido | **5002** | Alta | Rejeição por namespace inválido, evitando spoofing de Hash. |
| `QA-TISS-05` | **Regra Negócio**: `<codigoTabela>` 22 recebendo CBHPM incompleto | **1112** | Média | Tabela de domínio incompatível com o procedimento apontado. |
| `QA-TISS-06` | **Regra OPME**: `<grauParticipacao>` 01 sem `<conselhoProfissional>` | **1115** | Média | Grau de participação inconsistente em OPME / Cirurgia Oftalmo. |

---

## 5. Diretrizes de Pipeline (CI/CD)

1. Os testes funcionais (`pytest`) devem ser rodados **a cada Pull Request** no repositório do Validador.
2. O Endurance Test (`locust` de 6 horas) deve ser agendado em um **cronjob noturno** 1x por semana no ambiente de Pre-Prod.
3. Alertas do Datadog devem acionar o On-Call se a latência p99 do EndPoint de Validação passar de `300ms` durante o Stress Test.
