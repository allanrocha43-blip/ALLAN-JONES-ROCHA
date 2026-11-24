export interface AppSettings {
  checkFutureDates: boolean;
  checkNegativeValues: boolean;
  isPremium: boolean;
  theme: "light" | "dark" | "system";
  usage: {
    count: number;
    lastReset: string; // YYYY-MM format
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  checkFutureDates: true,
  checkNegativeValues: true,
  isPremium: true, // Always Premium/Open Source
  theme: "light",
  usage: {
    count: 0,
    lastReset: new Date().toISOString().slice(0, 7), // "2023-10"
  },
};
