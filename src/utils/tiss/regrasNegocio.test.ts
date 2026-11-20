import { describe, it, expect } from 'vitest';
import { GuideItem, ProcedimentoItem } from '../../types/tiss';
import { LocalizadorDeLinha } from './xmlLineUtils';
import {
  validarConsistenciaPaciente,
  validarLimitesValores,
  validarCompatibilidadeTipoGuia,
  executarRegrasNegocio,
} from './regrasNegocio';

describe('Módulo de Regras de Negócio TISS', () => {
  const dummyXml = `<ans:mensagemTISS>\n<ans:guiaConsulta>\n</ans:guiaConsulta>\n</ans:mensagemTISS>`;
  const localizador = new LocalizadorDeLinha(dummyXml);

  function criarGuiaMock(overrides?: Partial<GuideItem>): GuideItem {
    return {
      id: 'guia-1',
      index: 1,
      startIdx: 20,
      endIdx: 200,
      tipoGuia: 'guiaSP-SADT',
      carteira: '00123456789',
      senha: 'S123',
      guia: 'G001',
      guiaPrestador: 'GP001',
      nomeBeneficiario: 'PACIENTE TESTE',
      sexo: 'M',
      dataNascimento: '1985-05-15',
      procedimentos: [],
      ...overrides,
    };
  }

  function criarProcMock(overrides?: Partial<ProcedimentoItem>): ProcedimentoItem {
    return {
      id: 'proc-1-1',
      startIdx: 50,
      endIdx: 120,
      codigo: '40808033', // Mamografia digital
      descricao: 'Mamografia digital bilateral',
      quantidade: '1',
      valorUnitario: '150.00',
      valor: '150.00',
      ...overrides,
    };
  }

  describe('1. Consistência do Paciente vs Procedimento', () => {
    it('deve apontar Glosa Crítica para paciente masculino realizando parto cesariana ou ginecologia', () => {
      const guia = criarGuiaMock({ sexo: 'M' });
      const procParto = criarProcMock({ codigo: '31309054', descricao: 'Parto cesariana' });

      const erros = validarConsistenciaPaciente(guia, procParto, localizador);
      expect(erros.length).toBeGreaterThan(0);
      expect(erros[0].tipo).toBe('Crítico');
      expect(erros[0].desc).toContain('exclusivo do sexo feminino');
      expect(erros[0].desc).toContain('Masculino');
    });

    it('deve apontar Glosa Crítica para paciente feminino realizando prostatectomia ou vasectomia', () => {
      const guia = criarGuiaMock({ sexo: 'F' });
      const procProstata = criarProcMock({ codigo: '31103235', descricao: 'Prostatectomia radical' });

      const erros = validarConsistenciaPaciente(guia, procProstata, localizador);
      expect(erros.length).toBeGreaterThan(0);
      expect(erros[0].tipo).toBe('Crítico');
      expect(erros[0].desc).toContain('exclusivo do sexo masculino');
      expect(erros[0].desc).toContain('Feminino');
    });

    it('não deve apontar erro quando o procedimento for compatível com o sexo', () => {
      const guiaFem = criarGuiaMock({ sexo: 'F' });
      const procMamografia = criarProcMock({ codigo: '40808033', descricao: 'Mamografia digital' });
      const errosFem = validarConsistenciaPaciente(guiaFem, procMamografia, localizador);
      expect(errosFem.length).toBe(0);

      const guiaMasc = criarGuiaMock({ sexo: 'M' });
      const procConsulta = criarProcMock({ codigo: '10101012', descricao: 'Consulta em consultorio' });
      const errosMasc = validarConsistenciaPaciente(guiaMasc, procConsulta, localizador);
      expect(errosMasc.length).toBe(0);
    });

    it('deve apontar Glosa Crítica para teste do pezinho / procedimento neonatal em paciente adulto', () => {
      const guiaAdulto = criarGuiaMock({
        dataNascimento: '1990-01-01',
      });
      const procPezinho = criarProcMock({
        codigo: '40310214',
        descricao: 'Triagem neonatal',
        dataExecucao: '2026-05-10',
      });

      const erros = validarConsistenciaPaciente(guiaAdulto, procPezinho, localizador);
      expect(erros.length).toBeGreaterThan(0);
      expect(erros[0].tipo).toBe('Crítico');
      expect(erros[0].desc).toContain('Faixa Etária');
    });
  });

  describe('2. Limites Financeiros de Valores', () => {
    it('deve bloquear e gerar Glosa Crítica para valor zerado ou negativo', () => {
      const guia = criarGuiaMock();
      const procZerado = criarProcMock({ valorUnitario: '0.00', valor: '0.00' });
      const errosZerado = validarLimitesValores(guia, procZerado, localizador);

      expect(errosZerado.length).toBe(1);
      expect(errosZerado[0].tipo).toBe('Crítico');
      expect(errosZerado[0].desc).toContain('Glosa de Valor Inválido');

      const procNegativo = criarProcMock({ valorUnitario: '-50.00', valor: '-50.00' });
      const errosNegativo = validarLimitesValores(guia, procNegativo, localizador);
      expect(errosNegativo.length).toBe(1);
      expect(errosNegativo[0].tipo).toBe('Crítico');
    });

    it('deve alertar Aviso para consulta médica com valor acima do teto de tolerância (R$ 2.500)', () => {
      const guia = criarGuiaMock();
      const procConsultaCara = criarProcMock({
        codigo: '10101012',
        valorUnitario: '3200.00',
        valor: '3200.00',
      });

      const erros = validarLimitesValores(guia, procConsultaCara, localizador);
      expect(erros.length).toBe(1);
      expect(erros[0].tipo).toBe('Aviso');
      expect(erros[0].desc).toContain('teto de tolerância');
    });

    it('não deve emitir inconsistência para valores dentro do limite comercial aceitável', () => {
      const guia = criarGuiaMock();
      const procNormal = criarProcMock({
        codigo: '10101012',
        valorUnitario: '250.00',
        valor: '250.00',
      });

      const erros = validarLimitesValores(guia, procNormal, localizador);
      expect(erros.length).toBe(0);
    });
  });

  describe('3. Compatibilidade entre Tipo de Guia e Código', () => {
    it('deve emitir Aviso quando procedimento cirúrgico do capítulo 3 for faturado em Guia de Consulta', () => {
      const guiaConsulta = criarGuiaMock({ tipoGuia: 'guiaConsulta' });
      const procCirurgia = criarProcMock({
        codigo: '30101786',
        descricao: 'Sutura de pequenos ferimentos',
      });

      const erros = validarCompatibilidadeTipoGuia(guiaConsulta, procCirurgia, localizador);
      expect(erros.length).toBe(1);
      expect(erros[0].tipo).toBe('Aviso');
      expect(erros[0].desc).toContain('faturado em Guia de Consulta');
    });

    it('deve emitir Aviso quando ressonância ou tomografia for faturada em Guia de Consulta', () => {
      const guiaConsulta = criarGuiaMock({ tipoGuia: 'guiaConsulta' });
      const procRessonancia = criarProcMock({
        codigo: '41101010',
        descricao: 'Ressonância magnética de crânio',
      });

      const erros = validarCompatibilidadeTipoGuia(guiaConsulta, procRessonancia, localizador);
      expect(erros.length).toBe(1);
      expect(erros[0].tipo).toBe('Aviso');
      expect(erros[0].desc).toContain('Exame de alta complexidade por imagem');
    });

    it('não deve emitir alerta para consulta médica em Guia de Consulta', () => {
      const guiaConsulta = criarGuiaMock({ tipoGuia: 'guiaConsulta' });
      const procConsulta = criarProcMock({
        codigo: '10101012',
        descricao: 'Consulta médica em consultório',
      });

      const erros = validarCompatibilidadeTipoGuia(guiaConsulta, procConsulta, localizador);
      expect(erros.length).toBe(0);
    });
  });

  describe('4. Execução Agregada das Regras de Negócio', () => {
    it('deve auditar lote com múltiplas guias e agregar inconsistências corretamente', () => {
      const guia1 = criarGuiaMock({
        id: 'guia-1',
        tipoGuia: 'guiaConsulta',
        sexo: 'M',
        procedimentos: [
          criarProcMock({ id: 'p1', codigo: '31309054', valor: '2000.00' }), // Parto cesárea em Homem (Crítico) + Cirurgia em Guia Consulta (Aviso)
          criarProcMock({ id: 'p2', codigo: '10101012', valor: '0.00' }),     // Valor zerado (Crítico)
        ],
      });

      const resultados = executarRegrasNegocio([guia1], localizador);
      expect(resultados.length).toBe(3);

      const criticos = resultados.filter(r => r.tipo === 'Crítico');
      const avisos = resultados.filter(r => r.tipo === 'Aviso');

      expect(criticos.length).toBe(2); // Incompatibilidade biológica + valor zerado
      expect(avisos.length).toBe(1);   // Cirurgia em guia de consulta
    });
  });
});
