// Secure Storage Facade (True Encryption via Web Crypto API)

const ALGORITHM = "AES-GCM";
const KEY_STORAGE_NAME = "TISS_GUARD_MASTER_KEY";

// Helpers for buffer conversion
const buff_to_base64 = (buff: Uint8Array): string =>
  btoa(String.fromCharCode(...buff));
const base64_to_buff = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// Key Management (Lazy Singleton)
let cachedKey: CryptoKey | null = null;

const getMasterKey = async (): Promise<CryptoKey> => {
  if (cachedKey) return cachedKey;

  // 1. Try to load existing key from storage
  const stored = await chrome.storage.local.get(KEY_STORAGE_NAME);
  if (stored[KEY_STORAGE_NAME]) {
    // Import key
    const jwk = stored[KEY_STORAGE_NAME];
    cachedKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: ALGORITHM },
      false,
      ["encrypt", "decrypt"],
    );
    return cachedKey;
  }

  // 2. Generate new key
  cachedKey = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: 256 },
    true, // extractable (to save it)
    ["encrypt", "decrypt"],
  );

  // 3. Export and save
  const jwk = await crypto.subtle.exportKey("jwk", cachedKey);
  await chrome.storage.local.set({ [KEY_STORAGE_NAME]: jwk });

  return cachedKey;
};

export const SecureStorage = {
  // Save PII (Encrypted with AES-GCM)
  setItem: async (key: string, value: any) => {
    try {
      const masterKey = await getMasterKey();
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
      const encodedData = new TextEncoder().encode(JSON.stringify(value));

      const encrypted = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv: iv },
        masterKey,
        encodedData,
      );

      // Store as "IV_BASE64:CIPHER_BASE64"
      const payload = `${buff_to_base64(iv)}:${buff_to_base64(new Uint8Array(encrypted))}`;

      await chrome.storage.local.set({ [`SEC_${key}`]: payload });
    } catch (e) {
      console.error("[SecureStorage] Encryption failed", e);
      throw e;
    }
  },

  // Retrieve PII
  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      const store = await chrome.storage.local.get([`SEC_${key}`]);
      const payload = store[`SEC_${key}`] as string | undefined;
      if (!payload) return null;

      const [ivB64, cipherB64] = payload.split(":");
      if (!ivB64 || !cipherB64) return null;

      const masterKey = await getMasterKey();
      const iv = base64_to_buff(ivB64);
      const cipher = base64_to_buff(cipherB64);

      const decrypted = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv: iv as any },
        masterKey,
        cipher as any,
      );

      const str = new TextDecoder().decode(decrypted);
      return JSON.parse(str) as T;
    } catch (e) {
      console.error("[SecureStorage] Decryption failed", e);
      return null;
    }
  },

  clearSecrets: async () => {
    const all = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(all).filter((k) => k.startsWith("SEC_"));
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  },
};
