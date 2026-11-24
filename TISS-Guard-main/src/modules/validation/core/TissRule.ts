import { AppSettings } from "../../../types";
import { ValidationError } from "../XmlValidatorService";

/**
 * Represents a validation policy within the TISS Guard engine.
 * @interface TissRule
 * @property {string} id - Unique identifier for the rule.
 * @property {string} description - Human-readable explanation of what the rule validates.
 * @property {keyof AppSettings} [settingKey] - Optional link to a user setting that can toggle this rule.
 */
export interface TissRule {
  id: string;
  description: string;
  settingKey?: keyof AppSettings;
  /**
   * Executes the validation logic against a parsed XML object.
   * @param {any} jsonObj - The un-typed object representation of the TISS XML payload.
   * @returns {Promise<ValidationError[]> | ValidationError[]} An array of validation errors. Empty array if valid.
   */
  validate(jsonObj: any): Promise<ValidationError[]> | ValidationError[];
}
