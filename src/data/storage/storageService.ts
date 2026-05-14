import type { IStorage } from './IStorage';

let _instance: IStorage | null = null;

/**
 * Returns the active IStorage singleton.
 * - Native Capacitor (iOS/Android): SqliteStorage
 * - Browser: IndexedDBStorage (persistent across reloads)
 * - Test/SSR: MemoryStorage (injected via _setStorageForTest or fallback)
 */
export async function getStorage(): Promise<IStorage> {
  if (_instance) return _instance;

  const isNative =
    typeof (globalThis as Record<string, unknown>)['Capacitor'] !== 'undefined' &&
    (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform?.() === true;

  if (isNative) {
    const { SqliteStorage } = await import('./SqliteStorage');
    const sqlite = new SqliteStorage();
    await sqlite.open();
    _instance = sqlite;
  } else if (typeof indexedDB !== 'undefined') {
    const { IndexedDBStorage } = await import('./IndexedDBStorage');
    _instance = new IndexedDBStorage();
  } else {
    const { MemoryStorage } = await import('./MemoryStorage');
    _instance = new MemoryStorage();
  }

  return _instance;
}

/** Only used in tests to inject a custom storage (e.g. fresh MemoryStorage). */
export function _setStorageForTest(storage: IStorage): void {
  _instance = storage;
}

export function _resetStorage(): void {
  _instance = null;
}
