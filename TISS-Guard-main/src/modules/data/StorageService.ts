import { AppSettings, DEFAULT_SETTINGS } from "../../types";
export type { AppSettings };
export { DEFAULT_SETTINGS };

/**
 * Provides an interface for persistent storage of application settings
 * using the Chrome local storage API. Includes fallback to default settings
 * in non-extension environments and automatic monthly usage resets.
 */
export const StorageService = {
  /**
   * Retrieves the current application settings.
   * If running outside the extension context, returns DEFAULT_SETTINGS.
   * Automatically handles schema migrations (e.g., missing usage objects)
   * and resets the monthly usage counter if a new month has started.
   *
   * @returns {Promise<AppSettings>} The fully resolved application settings.
   */
  getSettings: async (): Promise<AppSettings> => {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.local
    ) {
      return DEFAULT_SETTINGS;
    }

    const result = await chrome.storage.local.get(["settings"]);
    let settings: AppSettings =
      (result.settings as AppSettings) || DEFAULT_SETTINGS;

    // Ensure usage object exists (migration)
    if (!settings.usage) {
      settings = { ...settings, usage: DEFAULT_SETTINGS.usage };
    }

    // Force Premium for everyone
    settings.isPremium = true;

    // Monthly Reset Check
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (settings.usage.lastReset !== currentMonth) {
      settings.usage.count = 0;
      settings.usage.lastReset = currentMonth;
      await chrome.storage.local.set({ settings }); // Auto-save reset
    }

    return settings;
  },

  /**
   * Persists the given settings object to Chrome local storage.
   * Fails silently if executed outside of an extension context.
   *
   * @param {AppSettings} settings - The complete settings configuration to save.
   * @returns {Promise<void>}
   */
  saveSettings: async (settings: AppSettings): Promise<void> => {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
    ) {
      await chrome.storage.local.set({ settings });
    }
  },

  /**
   * Increments the overall usage counter in the user's settings by one.
   * Retrieves the latest settings, increments, and persists the change.
   *
   * @returns {Promise<void>}
   */
  incrementUsage: async (): Promise<void> => {
    const settings = await StorageService.getSettings();
    settings.usage.count += 1;
    await StorageService.saveSettings(settings);
  },

  /**
   * Evaluates if the current user/context is authorized to perform validation.
   * Currently, this is hardcoded to true as part of the Open Source/Premium-for-all strategy.
   *
   * @returns {Promise<boolean>} True if validation is permitted.
   */
  canValidate: async (): Promise<boolean> => {
    // Always allowed
    return true;
  },
};
