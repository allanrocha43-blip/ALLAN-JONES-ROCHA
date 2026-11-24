// Remote Configuration Service (Hotfix Capability)
// Allows updating RPA recipes and TISS versions without a full Chrome Web Store release.

interface RemoteConfig {
  recipes: {
    unimed: any;
    bradesco: any;
  };
  versionMatrix: any[];
  lastUpdated: number;
}

const CONFIG_URL =
  "https://raw.githubusercontent.com/StuartFSI/TISS-Guard/main/remote-config.json"; // Placeholder
const CACHE_KEY = "REMOTE_CONFIG_CACHE";
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours

export const RemoteConfigService = {
  async init(): Promise<void> {
    const cached = await this.getFromCache();
    const now = Date.now();

    if (cached && now - cached.lastUpdated < CACHE_DURATION_MS) {
      console.log("[RemoteConfig] Using cached config.");
      return;
    }

    try {
      console.log("[RemoteConfig] Fetching updates...");
      const response = await fetch(CONFIG_URL);
      if (!response.ok) throw new Error("Fetch failed");

      const data = await response.json();
      await this.saveToCache({ ...data, lastUpdated: now });
      console.log("[RemoteConfig] Updated successfully.");
    } catch (e) {
      console.warn("[RemoteConfig] Update failed, using fallback/bundle.", e);
    }
  },

  async getFromCache(): Promise<RemoteConfig | null> {
    const store = await chrome.storage.local.get(CACHE_KEY);
    return (store[CACHE_KEY] as RemoteConfig) || null;
  },

  async saveToCache(data: RemoteConfig) {
    await chrome.storage.local.set({ [CACHE_KEY]: data });
  },

  // Get a specific recipe (prefer remote, fallback to bundled)
  async getRecipe(portal: string, bundledDefault: any): Promise<any> {
    const config = await this.getFromCache();
    if (
      config &&
      config.recipes &&
      config.recipes[portal as keyof typeof config.recipes]
    ) {
      return config.recipes[portal as keyof typeof config.recipes];
    }
    return bundledDefault;
  },
};
