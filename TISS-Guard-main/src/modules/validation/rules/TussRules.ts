import { TissRule } from "../core/TissRule";
import { findPathValues } from "../core/RuleUtils";
import { ValidationError } from "../XmlValidatorService";
import { TussDatabaseService } from "../../data/TussDatabaseService";

export const TussFormatRule: TissRule = {
  id: "TUSS_FORMATO_INVALIDO",
  description: "Verifica se os códigos da tabela possuem 8 dígitos numéricos.",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];
    const hits = findPathValues(jsonObj, "$..codigoProcedimento");

    hits.forEach((hit) => {
      const val = String(hit.value);
      if (!/^\d{8}$/.test(val)) {
        errors.push({
          code: "FORMATO_TUSS_INVALIDO",
          message: `Código '${val}' inválido. Deve ter 8 dígitos. (Local: ${hit.path})`,
        });
      }
    });
    return errors;
  },
};

export const TussValidationRule: TissRule = {
  id: "TUSS_VALIDATION",
  description: "Valida se códigos TUSS existem na tabela vigente (IndexedDB).",
  validate: async (jsonObj: any) => {
    const errors: ValidationError[] = [];
    const hits = findPathValues(jsonObj, "$..codigoProcedimento");

    // Ensure DB is ready
    await TussDatabaseService.init();

    // We can do this in parallel for performance
    const checks = hits.map(async (hit) => {
      const code = String(hit.value);
      // Only validate if it looks like a TUSS code (8 digits)
      if (/^\d{8}$/.test(code)) {
        const exists = await TussDatabaseService.checkCodeExists(code);
        if (!exists) {
          // Check if the table is empty (user hasn't imported yet)
          const count = await TussDatabaseService.getCount();
          if (count > 0) {
            errors.push({
              code: "TUSS_INEXISTENTE",
              message: `O código TUSS ${code} não foi encontrado na tabela local. (Local: ${hit.path})`,
              severity: "warning",
            });
          }
        }
      }
    });

    await Promise.all(checks);
    return errors;
  },
};
