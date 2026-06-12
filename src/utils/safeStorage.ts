import { Platform } from 'react-native';

// ─── Durable key-value sync facade ───────────────────────────────────────────
// API synchrone (get/set/remove) requise par les lectures au boot (appStore:
// theme/jit/banner lus à la création du store Zustand) et divers initialiseurs.
//
// • web  : localStorage (déjà durable).
// • natif: memCache (lecture sync) + write-through vers IStorage (SQLite) →
//          durable au redémarrage à froid. Hydraté une fois au boot via
//          hydrateSafeStorage(). Avant, memCache était volatil (perte de données).

const isWeb = Platform.OS === 'web';
const KV_PREFIX = 'awan.kv.';
const memCache: Record<string, string> = {};

// Import paresseux : évite tout cycle d'init avec storageService et garde le boot léger.
async function userStorage() {
  const { getUserStorage } = await import('@/data/storage/storageService');
  return getUserStorage();
}

function writeThrough(key: string, value: string): void {
  userStorage().then(s => s.set(`${KV_PREFIX}${key}`, value)).catch(() => { /* best-effort */ });
}

function deleteThrough(key: string): void {
  userStorage().then(s => s.delete(`${KV_PREFIX}${key}`)).catch(() => { /* ignore */ });
}

export const safeStorage = {
  get: (key: string): string | null => {
    if (!isWeb) return memCache[key] ?? null;
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, value: string): void => {
    if (!isWeb) { memCache[key] = value; writeThrough(key, value); return; }
    try { localStorage.setItem(key, value); } catch { /* quota */ }
  },
  remove: (key: string): void => {
    if (!isWeb) { delete memCache[key]; deleteThrough(key); return; }
    try { localStorage.removeItem(key); } catch { /* ok */ }
  },
};

/**
 * Hydrate le memCache depuis IStorage au boot (natif uniquement). À appeler une
 * fois avant de débloquer le rendu. No-op sur web (localStorage déjà durable).
 */
export async function hydrateSafeStorage(): Promise<void> {
  if (isWeb) return;
  try {
    const storage = await userStorage();
    const keys = await storage.list(KV_PREFIX);
    for (const fullKey of keys) {
      const value = await storage.get<string>(fullKey, (raw) => String(raw));
      if (value !== null) memCache[fullKey.slice(KV_PREFIX.length)] = value;
    }
  } catch { /* défauts conservés */ }
}
