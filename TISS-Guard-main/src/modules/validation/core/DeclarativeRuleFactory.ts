import { ValidationError } from "../XmlValidatorService";
import { TissRule } from "./TissRule";
import { findAllValues } from "./RuleUtils";

// --- Declarative Rules Extensibility via JSON (LLM / Ingest.js integration) ---

/**
 * Defines the structure of a rule generated dynamically via JSON.
 * This enables LLM integration and no-code maintenance of ANS standards.
 *
 * @interface DeclarativeRuleDef
 * @property {string} id - Unique identifier for the declarative rule.
 * @property {string} description - Human-readable description of the rule's purpose.
 * @property {string} targetField - The JSON key/path to search for in the TISS payload.
 * @property {"exists" | "notExists" | "equals" | "maxLength" | "domain"} condition - The evaluation criteria.
 * @property {any} [conditionValue] - The value to compare against, if applicable (e.g., max length number or domain array).
 * @property {string} errorMessage - The message returned if the validation fails.
 * @property {string} errorCode - The error code mapped to this validation failure.
 */
export interface DeclarativeRuleDef {
  id: string;
  description: string;
  targetField: string;
  condition: "exists" | "notExists" | "equals" | "maxLength" | "domain";
  conditionValue?: any;
  errorMessage: string;
  errorCode: string;
}

/**
 * Creates an executable TissRule instance from a declarative JSON definition.
 *
 * @param {DeclarativeRuleDef} def - The JSON definition of the rule.
 * @returns {TissRule} An instantiated TISS validation rule.
 */
export const createDeclarativeRule = (def: DeclarativeRuleDef): TissRule => ({
  id: def.id,
  description: def.description,
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];
    const hits = findAllValues(jsonObj, def.targetField);

    if (def.condition === "exists" && hits.length === 0) {
      errors.push({ code: def.errorCode, message: def.errorMessage });
    }

    hits.forEach((hit) => {
      const val = hit.value;
      const strVal = String(val);

      if (def.condition === "notExists") {
        errors.push({
          code: def.errorCode,
          message: `${def.errorMessage} (Local: ${hit.path})`,
        });
      } else if (
        def.condition === "maxLength" &&
        strVal.length > (def.conditionValue as number)
      ) {
        errors.push({
          code: def.errorCode,
          message: `${def.errorMessage} (Local: ${hit.path})`,
        });
      } else if (def.condition === "domain") {
        const allowed = def.conditionValue as string[];
        if (!allowed.includes(strVal.toUpperCase())) {
          errors.push({
            code: def.errorCode,
            message: `${def.errorMessage} (Local: ${hit.path})`,
          });
        }
      } else if (
        def.condition === "equals" &&
        strVal !== String(def.conditionValue)
      ) {
        errors.push({
          code: def.errorCode,
          message: `${def.errorMessage} (Local: ${hit.path})`,
        });
      }
    });

    return errors;
  },
});

/**
 * Bulk loads multiple declarative rule definitions and converts them into executable TissRules.
 *
 * @param {DeclarativeRuleDef[]} jsonRules - An array of declarative rule definitions.
 * @returns {TissRule[]} An array of instantiated TISS validation rules.
 */
export const loadDeclarativeRules = (
  jsonRules: DeclarativeRuleDef[],
): TissRule[] => {
  return jsonRules.map(createDeclarativeRule);
};
