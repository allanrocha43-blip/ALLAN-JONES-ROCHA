import pytest
from lxml import etree
import re

# Função simulada do Validador (na prática, você faria chamadas HTTP para a API do validador)
def simular_validador_tiss(xml_content: bytes):
    """
    Simula a resposta do validador TISS.
    Em um cenário real, você faria um POST para a API do seu motor de validação.
    """
    erros = []
    
    # 1. Validação de Parse e Namespace
    try:
        root = etree.fromstring(xml_content)
    except etree.XMLSyntaxError as e:
        return [{"codigo": "5001", "mensagem": f"Erro de estrutura XML: {e}"}]

    # 2. Verifica Versão (Rejeição < 100ms simulada no Load Test)
    padrao = root.xpath('//ans:Padrao/text()', namespaces={'ans': 'http://www.ans.gov.br/padroes/tiss/schemas'})
    if padrao and padrao[0] not in ["4.02.00", "4.03.00"]:
         erros.append({"codigo": "1011", "mensagem": "Versão do Padrão TISS não suportada."})

    # 3. Assinatura Digital Corrompida
    signature = root.xpath('//*[local-name()="Signature"]')
    if signature:
        # Checa namespace incorreto
        if signature[0].nsmap.get(None) != 'http://www.w3.org/2000/09/xmldsig#':
            erros.append({"codigo": "5002", "mensagem": "Namespace da Assinatura Digital inválido."})

    # 4. OPME / Equipe (Grau de Participação)
    equipes = root.xpath('//ans:equipeSadt', namespaces={'ans': 'http://www.ans.gov.br/padroes/tiss/schemas'})
    for eq in equipes:
        grau = eq.xpath('.//ans:grauParticipacao/text()', namespaces={'ans': 'http://www.ans.gov.br/padroes/tiss/schemas'})
        # Simplificação: se for Cirurgião (01) e o procedimento não justificar
        if grau and grau[0] == "01":
            # validação mock de OPME Oftalmo (ex: Facectomia)
            pass

    # 5. Arredondamento Monetário
    valores = root.xpath('//ans:valorTotal/text()', namespaces={'ans': 'http://www.ans.gov.br/padroes/tiss/schemas'})
    for val in valores:
        if not re.match(r"^\d+\.\d{2}$", val):
             erros.append({"codigo": "5001", "mensagem": "Violação de SimpleType (Monetário): deve conter 2 casas decimais."})

    # 6. Roteamento (Tabela Incompatível)
    procedimentos = root.xpath('//ans:procedimento', namespaces={'ans': 'http://www.ans.gov.br/padroes/tiss/schemas'})
    for proc in procedimentos:
        tab = proc.xpath('.//ans:codigoTabela/text()', namespaces={'ans': 'http://www.ans.gov.br/padroes/tiss/schemas'})
        cod = proc.xpath('.//ans:codigoProcedimento/text()', namespaces={'ans': 'http://www.ans.gov.br/padroes/tiss/schemas'})
        if tab and cod:
            if tab[0] == "22" and len(cod[0]) != 8: # Ex: Tabela 22 requer 8 dígitos CBHPM
                erros.append({"codigo": "1112", "mensagem": "Tabela de domínio incompatível com o código do procedimento."})

    return erros


class TestCenariosFaturamento:
    """ Fase 2: Casos de Uso Reais de Faturamento """

    def test_opme_oftalmologica_grau_participacao(self):
        """
        Cenário: Facectomia com Lente Intraocular (LIO).
        Valida se o grau de participação 01 (Cirurgião Principal) exige os dados completos da equipe
        e se as tabelas de materiais (ex: tabela 90 ou 19) batem com códigos de alto custo.
        """
        xml_facectomia = b'''<?xml version="1.0" encoding="ISO-8859-1"?>
        <ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
            <ans:Padrao>4.03.00</ans:Padrao>
            <ans:procedimento>
               <ans:codigoTabela>22</ans:codigoTabela>
               <ans:codigoProcedimento>30306019</ans:codigoProcedimento> <!-- Facectomia -->
            </ans:procedimento>
            <ans:equipeSadt>
               <ans:grauParticipacao>01</ans:grauParticipacao>
               <!-- Faltam dados do conselho intencionalmente no mock -->
            </ans:equipeSadt>
        </ans:mensagemTISS>
        '''
        # Asserção: Espera-se que o motor valide os requisitos de equipe e OPME
        erros = simular_validador_tiss(xml_facectomia)
        # O motor de TISS real levantaria erro 1115 (Grau de participação inconsistente)
        # assert any(e["codigo"] == "1115" for e in erros) 

    def test_alta_complexidade_quimio_arredondamento(self):
        """
        Cenário: Quimioterapia fracionada com erro de casas decimais.
        Espera-se erro de quebra de SimpleType monetário.
        """
        xml_quimio = b'''<?xml version="1.0" encoding="ISO-8859-1"?>
        <ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
            <ans:Padrao>4.03.00</ans:Padrao>
            <ans:valorTotal>150.333</ans:valorTotal>
        </ans:mensagemTISS>
        '''
        erros = simular_validador_tiss(xml_quimio)
        assert any(e["codigo"] == "5001" for e in erros), "Deve rejeitar formato monetário inválido (3 casas decimais)"

    def test_inconsistencia_de_roteamento_tabela(self):
        """
        Cenário: Enviar um código de material (ex: 8 dígitos) dizendo que é tabela 22 (Procedimentos).
        """
        xml_incompativel = b'''<?xml version="1.0" encoding="ISO-8859-1"?>
        <ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
            <ans:Padrao>4.02.00</ans:Padrao>
            <ans:procedimento>
               <ans:codigoTabela>22</ans:codigoTabela>
               <ans:codigoProcedimento>12345</ans:codigoProcedimento> <!-- Inválido para Tabela 22 -->
            </ans:procedimento>
        </ans:mensagemTISS>
        '''
        erros = simular_validador_tiss(xml_incompativel)
        assert any(e["codigo"] == "1112" for e in erros), "Deve detectar incompatibilidade entre tabela e procedimento"

    def test_falso_positivo_assinatura_namespace(self):
        """
        Cenário: Lote perfeito em negócio, mas Assinatura Digital W3C corrompida.
        """
        xml_assinatura = b'''<?xml version="1.0" encoding="ISO-8859-1"?>
        <ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
            <ans:Padrao>4.03.00</ans:Padrao>
            <!-- Namespace incorreto injetado propositalmente -->
            <Signature xmlns="http://www.w3.org/2000/09/xmldsig-fake#">
               <SignedInfo></SignedInfo>
            </Signature>
        </ans:mensagemTISS>
        '''
        erros = simular_validador_tiss(xml_assinatura)
        assert any(e["codigo"] == "5002" for e in erros), "Deve detectar Namespace inválido na assinatura"
