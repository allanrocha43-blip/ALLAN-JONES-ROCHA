import { TissRule } from "../core/TissRule";
import { findAllValues, createDependencyRule } from "../core/RuleUtils";
import { ValidationError } from "../XmlValidatorService";
import { REQUIRED_STRUCTURE } from "../SchemaDefinitions";

// 3. Structural/Schema Validation (Priority 3 -> Critical)
// Checks if the XML has the mandatory TISS hierarchy (message -> header -> body)
export const StructureRule: TissRule = {
  id: "ESTRUTURA_INVALIDA",
  description:
    "Verifica a integridade estrutural básica do XML (Schema Lógico).",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];

    // 1. Check Root
    let rootKey = "";
    for (const key of REQUIRED_STRUCTURE.root) {
      if (key in jsonObj) {
        rootKey = key;
        break;
      }
    }

    if (!rootKey) {
      errors.push({
        code: "TAG_RAIZ_AUSENTE",
        message:
          "Tag raiz <mensagemTISS> não encontrada. O arquivo não parece ser um XML TISS.",
      });
      return errors; // Abort further checks
    }

    const root = jsonObj[rootKey];

    // 2. Check Header
    let headerKey = "";
    for (const key of REQUIRED_STRUCTURE.header) {
      if (key in root) {
        headerKey = key;
        break;
      }
    }

    if (!headerKey) {
      errors.push({
        code: "CABECALHO_AUSENTE",
        message: "Tag <cabecalho> é obrigatória.",
      });
    } else {
      // Check mandatory properties inside header
      const header = root[headerKey];
      REQUIRED_STRUCTURE.headerFields.forEach((field) => {
        let found = false;
        // Simple check: exact match or namespaced match (ans:field)
        if (field in header || `ans:${field}` in header) found = true;

        if (!found) {
          errors.push({
            code: "CAMPO_CABECALHO_AUSENTE",
            message: `Campo obrigatório <${field}> ausente no cabeçalho.`,
          });
        }
      });
    }

    // 3. Check Body Presence (Prestador, Operadora, etc)
    let bodyFound = false;
    for (const key of REQUIRED_STRUCTURE.body) {
      if (key in root) {
        bodyFound = true;
        break;
      }
    }

    if (!bodyFound) {
      errors.push({
        code: "CORPO_TISS_AUSENTE",
        message:
          "Nenhum corpo de mensagem identificado (ex: prestadorParaOperadora).",
      });
    }

    return errors;
  },
};

/**
 * REGRA 1: Cardinalidade Cabecalho
 * Base Legal: XSD ct_guiaCabecalho -> <element name="registroANS" type="ans:st_registroANS"/>
 */
export const RuleRegistroANSConfirmacao: TissRule = createDependencyRule(
  "TISS_CARDINALITY_REGISTRO_ANS",
  "Garante que toda guia submetida possua a identificação da operadora (Registro ANS) populada.",
  (json) => findAllValues(json, "ct_guiaCabecalho").length > 0,
  (json) => {
    const errors: ValidationError[] = [];
    const cabecalhos = findAllValues(json, "ct_guiaCabecalho");
    cabecalhos.forEach((cab) => {
      const registros = findAllValues(cab.value, "registroANS");
      if (registros.length === 0) {
        errors.push({
          code: "REGISTRO_ANS_AUSENTE",
          message:
            "Falha estrutural: 'registroANS' ausente em 'ct_guiaCabecalho'.",
        });
      }
    });
    return errors;
  },
);

/**
 * REGRA 2: Cardinalidade Beneficiário
 * Base Legal: XSD ct_beneficiarioDados -> <element name="numeroCarteira" type="ans:st_texto20"/>
 */
export const RuleCarteiraBeneficiarioCardinalidade: TissRule =
  createDependencyRule(
    "TISS_CARDINALITY_CARTEIRA_BENEFICIARIO",
    "Garante que a carteirinha do beneficiário nunca seja omitida nos blocos de beneficiário da guia.",
    (json) => findAllValues(json, "ct_beneficiarioDados").length > 0,
    (json) => {
      const errors: ValidationError[] = [];
      const beneficiarios = findAllValues(json, "ct_beneficiarioDados");
      beneficiarios.forEach((ben) => {
        const carteiras = findAllValues(ben.value, "numeroCarteira");
        if (
          carteiras.length === 0 ||
          String(carteiras[0].value).trim() === ""
        ) {
          errors.push({
            code: "CARTEIRA_BENEFICIARIO_AUSENTE",
            message: `Falha estrutural: Nó 'numeroCarteira' é obrigatório para o beneficiário. (Local: ${ben.path})`,
          });
        }
      });
      return errors;
    },
  );
