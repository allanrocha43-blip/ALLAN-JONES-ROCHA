import { TissRule } from "./core/TissRule";
import {
  DeclarativeRuleDef,
  createDeclarativeRule,
  loadDeclarativeRules,
} from "./core/DeclarativeRuleFactory";
import { findAllValues, createDependencyRule } from "./core/RuleUtils";

import {
  TussFormatRule,
  TussValidationRule,
  StructureRule,
  RuleRegistroANSConfirmacao,
  RuleCarteiraBeneficiarioCardinalidade,
  MissingGuiaRule,
  FutureDateRule,
  NegativeValueRule,
  IndicationRule,
  AuthorizationWarningRule,
  RuleCarteiraMaxLengthRestricao,
  RuleGuiaPrestadorMaxLengthRestricao,
  RuleAtendimentoRNDominioEnum,
  TissVersionRule,
} from "./rules";

// Re-export core definitions for consumers
export type { TissRule, DeclarativeRuleDef };
export {
  createDeclarativeRule,
  loadDeclarativeRules,
  findAllValues,
  createDependencyRule,
};

// --- Registry ---

/**
 * The central registry of all active TISS validation rules.
 * This array acts as the primary configuration for the validation engine.
 * Adding or removing rules here dynamically alters the behavior of the entire validation pipeline.
 *
 * @constant {TissRule[]} CORE_RULES
 */
export const CORE_RULES: TissRule[] = [
  TissVersionRule,
  StructureRule,
  TussFormatRule,
  TussValidationRule,
  IndicationRule,
  MissingGuiaRule,
  FutureDateRule,
  NegativeValueRule,
  AuthorizationWarningRule,
  // --- XSD Strict Rules ---
  RuleRegistroANSConfirmacao,
  RuleCarteiraBeneficiarioCardinalidade,
  RuleCarteiraMaxLengthRestricao,
  RuleGuiaPrestadorMaxLengthRestricao,
  RuleAtendimentoRNDominioEnum,
];
