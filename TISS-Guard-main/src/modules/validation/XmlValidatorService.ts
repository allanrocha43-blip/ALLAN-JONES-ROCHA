import { XMLParser } from "fast-xml-parser";
import { AppSettings, DEFAULT_SETTINGS } from "../../types";
import { CORE_RULES } from "./RulesEngine";

export interface ValidationError {
  code: string;
  message: string;
  location?: string;
  severity?: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  message: string; // "Estrutura TISS Válida" or "Erros na estrutura"
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

export const parseXml = (content: string) => parser.parse(content);

export const validateTiss = async (
  xmlContent: string,
  settings: AppSettings = DEFAULT_SETTINGS,
): Promise<ValidationResult> => {
  let errors: ValidationError[] = [];

  try {
    const jsonObj = parser.parse(xmlContent);

    // --- Orchestrator Logic ---
    for (const rule of CORE_RULES) {
      // Generic Check: If rule is linked to a setting, verify if it's enabled
      if (rule.settingKey && !settings[rule.settingKey]) {
        continue; // Rule disabled by user
      }

      // Await execution if rule returns a Promise
      const result = rule.validate(jsonObj);
      const ruleErrors = result instanceof Promise ? await result : result;

      errors = errors.concat(ruleErrors);
    }

    const hardErrors = errors.filter((e) => e.severity !== "warning");

    if (hardErrors.length > 0) {
      return {
        isValid: false,
        errors: errors,
        message: "Falha na validação TISS",
      };
    }

    return {
      isValid: true,
      errors: errors, // return warnings even if valid
      message: "Estrutura TISS Válida",
    };
  } catch (e) {
    console.error("Validation Runtime Error:", e);
    return {
      isValid: false,
      errors: [
        {
          code: "XML_PARSE_ERROR",
          message: "O arquivo não é um XML válido ou está corrompido.",
        },
      ],
      message: "Erro de Leitura",
    };
  }
};
