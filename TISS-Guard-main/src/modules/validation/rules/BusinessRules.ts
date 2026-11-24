import { TissRule } from "../core/TissRule";
import { findPathValues, createDependencyRule } from "../core/RuleUtils";
import { ValidationError } from "../XmlValidatorService";

export const MissingGuiaRule: TissRule = {
  id: "GUIA_AUSENTE",
  description:
    "Verifica se o número da guia está presente em guias de consulta/SP/SADT.",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];
    // Heuristic: If we are deep inside a guide structure, we expect a number
    const hits = findPathValues(jsonObj, "$..numeroGuiaPrestador");

    // Simpler check for now:
    hits.forEach((hit) => {
      if (!hit.value || String(hit.value).trim() === "") {
        errors.push({
          code: "NM_GUIA_VAZIO",
          message: `Número da guia em branco. (Local: ${hit.path})`,
        });
      }
    });

    return errors;
  },
};

export const FutureDateRule: TissRule = {
  id: "DATA_FUTURA",
  description: "Impede o envio de procedimentos com data de execução futura.",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];
    const dateFields = ["dataAtendimento", "dataExecucao", "dataRealizacao"];

    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow anytime today

    dateFields.forEach((field) => {
      const hits = findPathValues(jsonObj, `$..${field}`);
      hits.forEach((hit) => {
        const parts = String(hit.value).split("-"); // YYYY-MM-DD
        if (parts.length === 3) {
          const dateVal = new Date(hit.value);
          if (dateVal > today) {
            errors.push({
              code: "DATA_FUTURA_DETECTADA",
              message: `A data ${hit.value} não pode ser futura. (Local: ${hit.path})`,
            });
          }
        }
      });
    });

    return errors;
  },
};

export const NegativeValueRule: TissRule = {
  id: "VALOR_NEGATIVO",
  description: "Verifica se existem valores monetários negativos.",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];
    const valueFields = [
      "valorTotal",
      "valorProcessado",
      "valorLiberado",
      "valorGlosa",
    ];

    valueFields.forEach((field) => {
      const hits = findPathValues(jsonObj, `$..${field}`);
      hits.forEach((hit) => {
        const val = parseFloat(hit.value);
        if (val < 0) {
          errors.push({
            code: "VALOR_NEGATIVO",
            message: `Valor monetário inválido (${val}). (Local: ${hit.path})`,
          });
        }
      });
    });

    return errors;
  },
};

// 3. Conditional Rule Example: Dependency Rule
export const IndicationRule = createDependencyRule(
  "INDICACAO_CLINICA_OBRIGATORIA",
  "Exige indicação clínica para exames (Tipo 05).",
  (json) => {
    const types = findPathValues(json, "$..tipoAtendimento");
    return types.some((t) => String(t.value) === "05");
  },
  (json) => {
    const errors: ValidationError[] = [];
    const indications = findPathValues(json, "$..indicacaoClinica");
    if (indications.length === 0) {
      errors.push({
        code: "INDICACAO_CLINICA_AUSENTE",
        message: "Para exames (Tipo 05), a indicação clínica é obrigatória.",
      });
    }
    return errors;
  },
);

// 4. External Business Rules (Glosas Médicas)
export const AuthorizationWarningRule: TissRule = {
  id: "ALERTA_AUTORIZACAO_PREVIA",
  description:
    "Alerta sobre possível exigência de senha de autorização prévia para procedimentos complexos.",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];

    // Safer path targeting only executed procedures to avoid matching secondary/irrelevant codes
    const procs = findPathValues(
      jsonObj,
      "$..procedimentoExecutado..codigoProcedimento",
    );
    const passwords = findPathValues(jsonObj, "$..senha");

    // Heurística de procedimentos de alta complexidade (exemplos fictícios: RM, TC, Cirurgias)
    const highComplexityPrefixes = ["40", "41", "31", "30"];

    procs.forEach((proc) => {
      const code = String(proc.value);
      const isHighComplexity = highComplexityPrefixes.some((prefix) =>
        code.startsWith(prefix),
      );

      if (isHighComplexity) {
        // If it's a high complexity procedure but there's no password/authorization field filled
        if (passwords.length === 0 || passwords.every((p) => !p.value)) {
          errors.push({
            code: "POSSIVEL_GLOSA_AUTORIZACAO",
            message: `O procedimento ${code} geralmente exige senha de autorização prévia. Verifique as regras da operadora para evitar glosa.`,
            severity: "warning",
          });
        }
      }
    });

    return errors;
  },
};
