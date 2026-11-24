export interface TussItem {
  code: string; // 8 digits
  description: string;
  // We could add validity dates here later
}

const DB_NAME = "TissGuardDB";
const STORE_NAME = "CurrentTussTable"; // Single store for the active table
const DB_VERSION = 1;

import seedData from "./tuss_seed_light.json";

export const TussDatabaseService = {
  db: null as IDBDatabase | null,

  async init(): Promise<void> {
    if (this.db) return;

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Create object store with 'code' as keyPath (fast lookup)
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "code" });
        }
      };
    });

    // Auto-Seed Check
    const count = await this.getCount();
    if (count === 0) {
      console.log("[TISS Guard] DB Empty. Seeding with default dataset...");
      // The JSON import might be strict, so we cast if necessary or map
      const items: TussItem[] = seedData.map((s) => ({
        code: s.code,
        description: s.description,
      }));
      await this.importTable(items);
      console.log(
        `[TISS Guard] Seed complete. ${items.length} codes imported.`,
      );
    }
  },

  async checkCodeExists(code: string): Promise<boolean> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");

      const transaction = this.db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(code);

      request.onsuccess = () => {
        resolve(!!request.result); // true if found, false if undefined
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Bulk import feature for the user
  async importTable(items: TussItem[]): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");

      const transaction = this.db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing table to avoid zombie codes
      store.clear();

      let count = 0;
      items.forEach((item) => {
        store.put(item);
        count++;
      });

      transaction.oncomplete = () => resolve(count);
      transaction.onerror = () => reject(transaction.error);
    });
  },

  async getCount(): Promise<number> {
    if (!this.db) await this.init();
    return new Promise((resolve, _reject) => {
      if (!this.db) return resolve(0);
      const store = this.db
        .transaction([STORE_NAME], "readonly")
        .objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
    });
  },
};
