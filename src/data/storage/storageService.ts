import { Platform } from 'react-native';
import type { IStorage } from './IStorage';
import { safeStorage } from '../../utils/safeStorage';

// Stub retained for API compat (LockScreen imports it); encryption handled by OS on expo-sqlite
export async function initStorageEncryption(): Promise<void> {}

const MIGRATION_FLAG = 'awan.migration.multidb';

let _appInstance: IStorage | null = null;
let _userInstance: IStorage | null = null;
let _migrationPromise: Promise<void> | null = null;

function isNativePlatform(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

async function createStorage(role: 'app' | 'user'): Promise<IStorage> {
  if (isNativePlatform()) {
    const { SqliteStorage } = await import('./SqliteStorage');
    const sqlite = new SqliteStorage({
      dbName: role === 'app' ? 'awan-app' : 'awan-user',
      encrypted: false, // chiffrement activé en v6
    });
    await sqlite.open();
    return sqlite;
  }
  if (typeof indexedDB !== 'undefined') {
    const { IndexedDBStorage } = await import('./IndexedDBStorage');
    return new IndexedDBStorage(role === 'app' ? 'awan-app-kv' : 'awan-user-kv');
  }
  const { MemoryStorage } = await import('./MemoryStorage');
  return new MemoryStorage();
}

/**
 * One-shot migration from the legacy single 'awan' / 'awan-kv' DB to the
 * new 'awan-user-*' DB. Runs at most once, marked by safeStorage flag.
 */
async function migrateLegacyData(userStorage: IStorage): Promise<void> {
  if (safeStorage.get(MIGRATION_FLAG) === '1') return;
  try {
    let legacyKeys: string[] = [];
    let legacyGet: ((key: string) => Promise<unknown>) | null = null;

    if (isNativePlatform()) {
      const { SqliteStorage } = await import('./SqliteStorage');
      const legacy = new SqliteStorage({ dbName: 'awan', encrypted: false });
      await legacy.open();
      legacyKeys = await legacy.list('');
      legacyGet = (k: string) => legacy.get(k, (raw) => raw);
      for (const key of legacyKeys) {
        const value = await legacyGet(key);
        if (value !== null) await userStorage.set(key, value);
      }
      await legacy.close();
    } else if (typeof indexedDB !== 'undefined') {
      const { IndexedDBStorage, deleteIndexedDB } = await import('./IndexedDBStorage');
      const legacy = new IndexedDBStorage('awan-kv');
      legacyKeys = await legacy.list('');
      for (const key of legacyKeys) {
        const value = await legacy.get(key, (raw) => raw);
        if (value !== null) await userStorage.set(key, value);
      }
      await deleteIndexedDB('awan-kv').catch(() => undefined);
    }
    safeStorage.set(MIGRATION_FLAG, '1');
  } catch {
    /* migration silent — données legacy probablement absentes */
  }
}

/** Storage utilisateur (données perso, chiffré sur natif). Alias par défaut. */
export async function getUserStorage(): Promise<IStorage> {
  if (_userInstance) return _userInstance;
  _userInstance = await createStorage('user');
  if (!_migrationPromise) _migrationPromise = migrateLegacyData(_userInstance);
  await _migrationPromise;
  return _userInstance;
}

/** Storage applicatif (catalogues read-only, non chiffré). */
export async function getAppStorage(): Promise<IStorage> {
  if (_appInstance) return _appInstance;
  _appInstance = await createStorage('app');
  return _appInstance;
}

/** Alias de compatibilité — tous les services existants pointent vers getUserStorage(). */
export async function getStorage(): Promise<IStorage> {
  return getUserStorage();
}

export function _setStorageForTest(storage: IStorage): void {
  _userInstance = storage;
  _appInstance = storage;
}

export function _resetStorage(): void {
  _userInstance = null;
  _appInstance = null;
  _migrationPromise = null;
}
