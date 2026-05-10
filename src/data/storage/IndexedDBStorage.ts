import type { IStorage, ITransaction, ParseFn } from './IStorage';

const DB_NAME = 'awan-kv';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDBStorage implements IStorage {
  private readonly dbPromise: Promise<IDBDatabase> = openDB();

  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  async get<T>(key: string, parse: ParseFn<T>): Promise<T | null> {
    const s = await this.store('readonly');
    const raw = await idbRequest(s.get(key));
    if (raw === undefined) return null;
    return parse(raw);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const s = await this.store('readwrite');
    await idbRequest(s.put(value, key));
  }

  async delete(key: string): Promise<void> {
    const s = await this.store('readwrite');
    await idbRequest(s.delete(key));
  }

  async list(prefix: string): Promise<string[]> {
    const s = await this.store('readonly');
    const keys = await idbRequest(s.getAllKeys()) as string[];
    return keys.filter(k => k.startsWith(prefix));
  }

  async query<T>(table: string, where: Partial<T>, parse: ParseFn<T>): Promise<T[]> {
    const keys = await this.list(table);
    const results: T[] = [];
    for (const key of keys) {
      const item = await this.get(key, parse);
      if (!item) continue;
      const match = Object.entries(where).every(
        ([k, v]) => (item as Record<string, unknown>)[k] === v,
      );
      if (match) results.push(item);
    }
    return results;
  }

  async transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    // IndexedDB transactions auto-commit — we wrap in a logical tx for API compat
    const tx: ITransaction = {
      get: (k, p) => this.get(k, p),
      set: (k, v) => this.set(k, v),
      delete: (k) => this.delete(k),
    };
    return fn(tx);
  }

  async clear(): Promise<void> {
    const s = await this.store('readwrite');
    await idbRequest(s.clear());
  }
}
