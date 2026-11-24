import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import { validateTiss } from "../XmlValidatorService";
import { DEFAULT_SETTINGS } from "../../../types";

describe("XmlValidatorService", () => {
  it("should invalidate XML with future date", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <mensagemTISS>
        <prestadorParaOperadora>
          <loteGuias>
            <guiasTISS>
              <guiaSP-SADT>
                <procedimentosExecutados>
                  <procedimentoExecutado>
                    <dataExecucao>2099-12-31</dataExecucao>
                  </procedimentoExecutado>
                </procedimentosExecutados>
              </guiaSP-SADT>
            </guiasTISS>
          </loteGuias>
        </prestadorParaOperadora>
      </mensagemTISS>`;

    const result = await validateTiss(xml, DEFAULT_SETTINGS);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === "DATA_FUTURA_DETECTADA")).toBe(
      true,
    );
  });

  it("should warn about high complexity procedures without password", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <mensagemTISS>
        <prestadorParaOperadora>
          <loteGuias>
            <guiasTISS>
              <guiaSP-SADT>
                <procedimentosExecutados>
                  <procedimentoExecutado>
                    <procedimento>
                      <codigoProcedimento>41001017</codigoProcedimento>
                    </procedimento>
                  </procedimentoExecutado>
                </procedimentosExecutados>
              </guiaSP-SADT>
            </guiasTISS>
          </loteGuias>
        </prestadorParaOperadora>
      </mensagemTISS>`;

    const result = await validateTiss(xml, DEFAULT_SETTINGS);
    expect(
      result.errors.some((e) => e.code === "POSSIVEL_GLOSA_AUTORIZACAO"),
    ).toBe(true);
  });
});
