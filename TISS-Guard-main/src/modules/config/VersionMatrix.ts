export interface TissVersionConfig {
  version: number; // 30500 for 3.05.00
  validFrom: string; // ISO Date "2021-01-01"
  validUntil: string | null; // Null means "current/forever"
  isDeprecated: boolean;
}

// Official ANS History (Simplified)
export const TISS_VERSION_MATRIX: TissVersionConfig[] = [
  {
    version: 30200,
    validFrom: "2014-01-01",
    validUntil: "2020-12-31",
    isDeprecated: true,
  },
  {
    version: 30300,
    validFrom: "2016-01-01",
    validUntil: "2021-05-31",
    isDeprecated: true,
  },
  {
    version: 30500,
    validFrom: "2021-05-01",
    validUntil: null,
    isDeprecated: false,
  },
  {
    version: 40000,
    validFrom: "2023-01-01",
    validUntil: null,
    isDeprecated: false,
  },
  {
    version: 40100,
    validFrom: "2023-06-01",
    validUntil: null,
    isDeprecated: false,
  },
];

export const getVersionStatus = (versionStr: string) => {
  const num = parseFloat(versionStr.replace(/\./g, ""));

  // Find exact match or closest lower bound?
  // TISS versions are usually exact.
  const config = TISS_VERSION_MATRIX.find((v) => v.version === num);

  // Fallback logic: If > 30500, assume valid (newer than known list)
  if (!config) {
    if (num >= 30500)
      return { isValid: true, message: "Versão Recente (Desconhecida)" };
    return { isValid: false, message: "Versão Desconhecida ou Obsoleta" };
  }

  if (config.isDeprecated) {
    return {
      isValid: false,
      message: `Versão ${versionStr} descontinuada em ${config.validUntil}.`,
    };
  }

  return { isValid: true, message: "Versão Vigente" };
};
