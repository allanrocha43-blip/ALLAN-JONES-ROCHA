import { TissRule } from "../core/TissRule";
import { ValidationError } from "../XmlValidatorService";
import { getVersionStatus } from "../../config/VersionMatrix";

export const TissVersionRule: TissRule = {
  id: "TISS_VERSION_VIGENTE",
  description: "Verifica a versão do padrão TISS no arquivo.",
  validate: (jsonObj: any) => {
    const errors: ValidationError[] = [];
    // Helper to find the version tag deep in the object
    const findVersion = (obj: any): string | null => {
      if (!obj) return null;
      // Common tag names for version
      if (obj.padrao) return obj.padrao;
      if (obj["ans:padrao"]) return obj["ans:padrao"];
      if (obj.versaoPadrao) return obj.versaoPadrao;
      if (obj["ans:versaoPadrao"]) return obj["ans:versaoPadrao"];

      if (typeof obj === "object") {
        for (const key in obj) {
          const res = findVersion(obj[key]);
          if (res) return res;
        }
      }
      return null;
    };

    const version = findVersion(jsonObj);

    if (!version) {
      errors.push({
        code: "VERSAO_NAO_ENCONTRADA",
        message:
          "Não foi possível identificar a versão do padrão TISS no arquivo (Tag <padrao> ausente).",
      });
      return errors;
    }

    const status = getVersionStatus(version);

    if (!status.isValid) {
      errors.push({
        code: "TISS_VERSAO_OBSOLETA",
        message: status.message || `A versão TISS ${version} está obsoleta.`,
      });
    }

    return errors;
  },
};
