import time
import random
from locust import HttpUser, task, between, events

# Payload TISS 4.03 válido em cache para evitar I/O no disco durante o estresse
VALID_TISS_403 = """<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
    <ans:cabecalho>
        <ans:identificacaoTransacao>
            <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
            <ans:sequencialTransacao>123456</ans:sequencialTransacao>
            <ans:dataRegistroTransacao>2026-08-10</ans:dataRegistroTransacao>
            <ans:horaRegistroTransacao>09:00:00</ans:horaRegistroTransacao>
        </ans:identificacaoTransacao>
        <ans:origem><ans:registroANS>123456</ans:registroANS></ans:origem>
        <ans:destino><ans:cnpjContratado>00000000000000</ans:cnpjContratado></ans:destino>
        <ans:Padrao>4.03.00</ans:Padrao>
    </ans:cabecalho>
</ans:mensagemTISS>
"""

# Payload TISS 3.02 obsoleto para teste de fail-fast
INVALID_TISS_302 = VALID_TISS_403.replace("<ans:Padrao>4.03.00</ans:Padrao>", "<ans:Padrao>3.02.00</ans:Padrao>")

# Payload de carga pesada: 50.000 guias representadas (Simulado via XML expandido)
# Na prática, você geraria um arquivo de 50MB a 100MB em memória.
HEAVY_TISS = VALID_TISS_403 * 500  

class TissValidatorUser(HttpUser):
    """
    Fase 1: Testes Regressivos e de Estresse (Ciclo de 6 Horas)
    Simula submissões concorrentes em larga escala para auditoria médica.
    """
    wait_time = between(0.1, 0.5)  # Requisições agressivas

    @task(8) # 80% das requisições são normais
    def validar_lote_padrao(self):
        """ Envia fluxo normal de faturamento """
        headers = {'Content-Type': 'application/xml'}
        with self.client.post("/api/validar", data=VALID_TISS_403, headers=headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Falha inesperada no validador. Código: {response.status_code}")

    @task(1) # 10% de requisições obsoletas para testar latência de rejeição (Fail-Fast < 100ms)
    def validar_rejeicao_fail_fast(self):
        """ Assegura que versões legadas não engargalam a thread principal """
        headers = {'Content-Type': 'application/xml'}
        start_time = time.time()
        
        with self.client.post("/api/validar", data=INVALID_TISS_302, headers=headers, catch_response=True) as response:
            latency_ms = (time.time() - start_time) * 1000
            
            if response.status_code in [400, 422]: # Status esperado para erro 1011
                if latency_ms < 100:
                    response.success()
                else:
                    response.failure(f"Fail-fast muito lento: {latency_ms:.2f}ms (Esperado < 100ms)")
            else:
                response.failure("Sistema não rejeitou a versão obsoleta corretamente.")

    @task(1) # 10% de requisições extremamente pesadas (Teste de Memory Leak / Parsing limit)
    def validar_lote_pesado(self):
        """ 
        Submete um XML massivo para testar se o DOM Parser aguenta 
        sem estourar a memória (OOM - Out of Memory).
        """
        headers = {'Content-Type': 'application/xml'}
        with self.client.post("/api/validar", data=HEAVY_TISS, headers=headers, catch_response=True) as response:
            # Tolerância maior de tempo, mas deve concluir sem erro 500 (Memory Error)
            if response.status_code in [200, 400, 422]:
                response.success()
            else:
                response.failure(f"Crash ao processar XML pesado. Status: {response.status_code}")

# Configuração para rodar 6 horas sem parar
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("Iniciando Endurance Test do Validador TISS (Duração Alvo: 6 horas)...")
    print("Monitorando Memory Leaks e Thread Contention nas validações XML.")
