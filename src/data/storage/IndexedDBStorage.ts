import { DbFullError, MAX_DB_BYTES, type IStorage, type ITransaction, type ParseFn } from './IStorage';

const STORE_NAME = 'kv';
const DB_VERSION = 1;

function openDB(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function deleteIndexedDB(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDBStorage implements IStorage {
  private readonly dbPromise: Promise<IDBDatabase>;

  constructor(dbName: string = 'awan-kv') {
    this.dbPromise = openDB(dbName);
  }

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
    const projectedExtra = new TextEncoder().encode(JSON.stringify(value)).length;
    const current = await this.getSizeBytes();
    if (current + projectedExtra > MAX_DB_BYTES) {
      throw new DbFullError(current);
    }
    const s = await this.store('readwrite');
    await idbRequest(s.put(value, key));
    this.cachedSize = null;
  }

  async delete(key: string): Promise<void> {
    const s = await this.store('readwrite');
    await idbRequest(s.delete(key));
    this.cachedSize = null;
  }

  private cachedSize: number | null = null;
  private cachedSizeAt = 0;

  async getSizeBytes(): Promise<number> {
    const now = Date.now();
    if (this.cachedSize !== null && now - this.cachedSizeAt < 2000) return this.cachedSize;
    const s = await this.store('readonly');
    const keys = await idbRequest(s.getAllKeys()) as string[];
    let total = 0;
    for (const key of keys) {
      const v = await idbRequest(s.get(key));
      total += new TextEncoder().encode(JSON.stringify(v)).length;
    }
    this.cachedSize = total;
    this.cachedSizeAt = now;
    return total;
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
    this.cachedSize = 0;
  }

  async exportAll(): Promise<string> {
    const s = await this.store('readonly');
    const keys = await idbRequest(s.getAllKeys()) as string[];
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      data[key] = await idbRequest(s.get(key));
    }
    return JSON.stringify({ type: 'awan.backup', version: 1, exported: new Date().toISOString().slice(0, 10), data });
  }

  async importAll(data: Record<string, unknown>): Promise<void> {
    const s = await this.store('readwrite');
    for (const [key, value] of Object.entries(data)) {
      await idbRequest(s.put(value, key));
    }
  }
}
