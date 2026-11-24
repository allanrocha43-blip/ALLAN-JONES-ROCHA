import { TissRule } from "../core/TissRule";
import { findAllValues } from "../core/RuleUtils";
import { ValidationError } from "../XmlValidatorService";

/**
 * REGRA 3: Limite Máximo de Caracteres em Chaves (Carteira)
 * Base Legal: XSD st_texto20 (Referenciado em ct_beneficiarioDados -> numeroCarteira)
 */
export const RuleCarteiraMaxLengthRestricao: TissRule = {
  id: "TISS_MAXLENGTH_TEXTO20_CARTEIRA",
  description:
    "Verifica se todas as entradas de carteira no payload respeitam o limite físico de 20 caracteres.",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];
    const carteiras = findAllValues(jsonObj, "numeroCarteira");
    carteiras.forEach((hit) => {
      if (String(hit.value).length > 20) {
        errors.push({
          code: "MAXLENGTH_EXCEDED_CARTEIRA",
          message: `Rejeição de Parsing: 'numeroCarteira' (${hit.value}) excede limite de 20 caracteres. (Local: ${hit.path})`,
        });
      }
    });
    return errors;
  },
};

/**
 * REGRA 4: Limite Máximo de Caracteres em Chaves (Guia Prestador)
 * Base Legal: XSD st_texto20 (Referenciado em ct_guiaCabecalho -> numeroGuiaPrestador)
 */
export const RuleGuiaPrestadorMaxLengthRestricao: TissRule = {
  id: "TISS_MAXLENGTH_TEXTO20_GUIA_PRESTADOR",
  description:
    "Garante a restrição no tamanho do ID inserido pelo prestador para evitar quebras no banco.",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];
    const guias = findAllValues(jsonObj, "numeroGuiaPrestador");
    guias.forEach((hit) => {
      if (String(hit.value).length > 20) {
        errors.push({
          code: "MAXLENGTH_EXCEDED_GUIA_PRESTADOR",
          message: `Rejeição estrutural: 'numeroGuiaPrestador' (${hit.value}) excede 20 caracteres. (Local: ${hit.path})`,
        });
      }
    });
    return errors;
  },
};

/**
 * REGRA 5: Enumeração e Domínio Restrito (Recém Nascido)
 * Base Legal: XSD ct_beneficiarioDados -> <element name="atendimentoRN" type="ans:dm_simNao"/>
 */
export const RuleAtendimentoRNDominioEnum: TissRule = {
  id: "TISS_DOMAIN_SIMNAO_ATENDIMENTORN",
  description: "Valida um domínio estrito baseado em Yes/No (S ou N).",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];
    const marcadoresRN = findAllValues(jsonObj, "atendimentoRN");
    const allowedDomans = ["S", "N"];

    marcadoresRN.forEach((hit) => {
      const valor = String(hit.value).toUpperCase();
      if (!allowedDomans.includes(valor)) {
        errors.push({
          code: "DOMAIN_VIOLATION_ATENDIMENTORN",
          message: `Violação de Domínio Estrito: 'atendimentoRN' esperava 'S' ou 'N', mas recebeu '${hit.value}'. (Local: ${hit.path})`,
        });
      }
    });
    return errors;
  },
};
