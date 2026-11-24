import { AppSettings } from "../../types";
import type { ValidationResult } from "./XmlValidatorService";

// Update signature to accept File
export const runWorkerValidation = (
  input: string | File,
  settings: AppSettings,
): Promise<ValidationResult> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./xml.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (e) => {
      const { type, result, error } = e.data;
      if (type === "result") {
        resolve(result);
      } else if (type === "error") {
        reject(error);
      }
      worker.terminate();
    };

    worker.onerror = (e) => {
      console.error("Worker Error:", e);
      reject(e);
      worker.terminate();
    };

    // Post payload (string or File)
    // TYPE: VALIDATE_FILE
    worker.postMessage({ type: "VALIDATE_FILE", payload: input, settings });
  });
};
