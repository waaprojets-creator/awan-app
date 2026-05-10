import type { IStorage } from './IStorage';
import { MemoryStorage } from './MemoryStorage';

let _instance: IStorage | null = null;

/**
 * Returns the active IStorage singleton.
 * - On native Capacitor (iOS/Android): SqliteStorage (lazy-imported to keep Capacitor out of web bundle)
 * - On web / test: MemoryStorage
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
  } else {
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
