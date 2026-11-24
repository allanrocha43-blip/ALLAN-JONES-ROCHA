import { ValidationError } from "../XmlValidatorService";
import { TissRule } from "./TissRule";
import { JSONPath } from "jsonpath-plus";

/**
 * Recursively searches a deep JSON object for all occurrences of a specific key.
 *
 * @param {any} obj - The object to search within.
 * @param {string} keyToFind - The key name to locate.
 * @returns {Array<{ value: any; path: string }>} A list of found values mapped to their dot-notation path.
 */
export const findAllValues = (
  obj: any,
  keyToFind: string,
): { value: any; path: string }[] => {
  // We keep this for backward compatibility if needed, but findPathValues is preferred.
  let results: { value: any; path: string }[] = [];
  if (typeof obj !== "object" || obj === null) return results;

  if (keyToFind in obj) {
    results.push({ value: obj[keyToFind], path: keyToFind });
  }

  for (const key of Object.keys(obj)) {
    const childResults = findAllValues(obj[key], keyToFind);
    results = results.concat(
      childResults.map((r) => ({ ...r, path: `${key} > ${r.path}` })),
    );
  }
  return results;
};

/**
 * Searches a deep JSON object using JSONPath expression.
 * This is much safer than findAllValues as it targets specific nodes.
 *
 * @param {any} obj - The JSON object.
 * @param {string} path - The JSONPath expression (e.g. '$..codigoProcedimento')
 * @returns {Array<{ value: any; path: string }>} A list of found values and their paths.
 */
export const findPathValues = (
  obj: any,
  path: string,
): { value: any; path: string }[] => {
  if (!obj || typeof obj !== "object") return [];

  const results: { value: any; path: string }[] = [];
  JSONPath({
    path: path,
    json: obj,
    resultType: "all",
    callback: (result) => {
      // result has { value, path }
      // The path returned by jsonpath-plus is like $['mensagemTISS']['...']
      // We'll just pass it along
      results.push({ value: result.value, path: result.path });
    },
  });

  return results;
};

// Start: Deep Validation Engine
export const createDependencyRule = (
  id: string,
  description: string,
  condition: (json: any) => boolean,
  validateFn: (json: any) => ValidationError[],
): TissRule => ({
  id,
  description,
  validate: (json) => {
    if (condition(json)) {
      return validateFn(json);
    }
    return [];
  },
});
