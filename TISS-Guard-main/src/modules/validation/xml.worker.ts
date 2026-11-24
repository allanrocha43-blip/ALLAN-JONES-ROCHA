// TISS Guard - XML Stream Worker
// Implements "Split-and-Parse" strategy for low memory footprint validation.

import { validateTiss, ValidationError } from "./XmlValidatorService"; // Reusing logic but slightly adapted
import { AppSettings, DEFAULT_SETTINGS } from "../../types";

// Polyfill/Type for FileReaderSync (Available in Worker, missing in standard lib.dom.d.ts)
declare class FileReaderSync {
  readAsText(blob: Blob, encoding?: string): string;
}

// Stream Processor
const processFileInChunks = async (file: File, settings: AppSettings) => {
  const reader = new FileReaderSync();
  const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB chunks
  let offset = 0;
  let buffer = "";
  const errors: ValidationError[] = [];

  // 2. Loop Chunks
  while (offset < file.size) {
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const text = reader.readAsText(slice, "ISO-8859-1"); // Defaulting to Latin1 for safety involved in TISS
    buffer += text;

    // Regex to find complete tags commonly used for Guides (accounting for optional namespaces)
    const guideRegex =
      /<(?:[a-zA-Z0-9-]+:)?(guia[a-zA-Z0-9-]+)[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9-]+:)?\1>/g;

    let match;
    let lastMatchEnd = 0;
    while ((match = guideRegex.exec(buffer)) !== null) {
      const fullTag = match[0];

      // We have a full guide string! Parse it.
      try {
        // Validate the raw XML string directly (validateTiss handles parsing)
        const result = await validateTiss(fullTag, settings);

        if (!result.isValid) {
          errors.push(...result.errors);
        }
      } catch (e) {
        console.error("Chunk Parse Error", e);
      }
      lastMatchEnd = match.index + fullTag.length;
    }

    // Reset Logic: remove processed items to prevent memory leaks and reset regex pointer
    if (lastMatchEnd > 0) {
      buffer = buffer.slice(lastMatchEnd);
      guideRegex.lastIndex = 0;
    } else if (buffer.length > CHUNK_SIZE * 2) {
      // Prevent infinite memory leak if no guides are found for a long time
      buffer = buffer.slice(-CHUNK_SIZE);
      guideRegex.lastIndex = 0;
    }

    offset += CHUNK_SIZE;
    self.postMessage({
      type: "progress",
      progress: (offset / file.size) * 100,
    });
  }

  return errors;
};

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, settings } = e.data;

  if (type === "VALIDATE_FILE") {
    try {
      let result;

      if (payload instanceof File && payload.size > 1024 * 1024 * 30) {
        // > 30MB triggers Stream Mode
        const errors = await processFileInChunks(
          payload,
          settings || DEFAULT_SETTINGS,
        );
        result = {
          isValid: errors.length === 0,
          errors: errors,
          message:
            errors.length === 0
              ? "Estrutura TISS Válida (Stream)"
              : "Erros detectados",
        };
      } else {
        // Classic Mode
        let content = "";
        if (payload instanceof File) {
          const reader = new FileReaderSync();
          content = reader.readAsText(payload, "ISO-8859-1");
        } else {
          content = payload;
        }
        result = await validateTiss(content, settings);
      }

      self.postMessage({ type: "result", result });
    } catch (err: any) {
      self.postMessage({
        type: "error",
        error: { code: "WORKER_ERROR", message: err.message },
      });
    }
  }
};
