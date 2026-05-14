import type { IStorage, ITransaction, ParseFn } from '@/data/storage';

/**
 * Synchronous LocalStorage-backed IStorage implementation.
 *
 * Provides a lightweight adapter for the Coach engine and other modules that
 * want to read/write persistent key/value data in a browser context without
 * paying the cost of an async IndexedDB store. All operations are kept
 * `async` to honor the `IStorage` contract.
 *
 * Storage layout: each `key` maps 1:1 to a `localStorage` entry, the value is
 * JSON-serialized. Parsing is delegated to a caller-supplied `ParseFn<T>` so
 * migrations remain the responsibility of the schema layer.
 */
export class LocalStorageAdapter implements IStorage {
  private readonly storage: Storage;

  constructor(storage?: Storage) {
    this.storage = storage ?? globalThis.localStorage;
  }

  async get<T>(key: string, parse: ParseFn<T>): Promise<T | null> {
    const raw = this.storage.getItem(key);
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (parsed === null) return null;
    return parse(parsed);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.storage.setItem(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    this.storage.removeItem(key);
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const k = this.storage.key(i);
      if (k !== null && k.startsWith(prefix)) keys.push(k);
    }
    return keys;
  }

  async query<T>(table: string, where: Partial<T>, parse: ParseFn<T>): Promise<T[]> {
    const keys = await this.list(table);
    const results: T[] = [];
    for (const key of keys) {
      const raw = this.storage.getItem(key);
      if (raw === null) continue;
      let parsedRaw: unknown;
      try {
        parsedRaw = JSON.parse(raw);
      } catch {
        continue;
      }
      if (parsedRaw === null) continue;
      const parsed = parse(parsedRaw);
      const match = Object.entries(where).every(
        ([k, v]) => (parsed as Record<string, unknown>)[k] === v,
      );
      if (match) results.push(parsed);
    }
    return results;
  }

  async transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    const tx: ITransaction = {
      get: (k, p) => this.get(k, p),
      set: (k, v) => this.set(k, v),
      delete: (k) => this.delete(k),
    };
    return fn(tx);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}
