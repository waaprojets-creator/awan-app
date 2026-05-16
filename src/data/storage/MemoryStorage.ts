import type { IStorage, ITransaction, ParseFn } from './IStorage';

export class MemoryStorage implements IStorage {
  private store = new Map<string, unknown>();

  async get<T>(key: string, parse: ParseFn<T>): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    return parse(raw);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.store.keys()].filter(k => k.startsWith(prefix));
  }

  async query<T>(table: string, where: Partial<T>, parse: ParseFn<T>): Promise<T[]> {
    const keys = await this.list(table);
    const results: T[] = [];
    for (const key of keys) {
      const raw = this.store.get(key);
      if (raw === undefined) continue;
      const parsed = parse(raw);
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
    this.store.clear();
  }

  async exportAll(): Promise<string> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of this.store.entries()) {
      data[key] = value;
    }
    return JSON.stringify({ type: 'awan.backup', version: 1, exported: new Date().toISOString().slice(0, 10), data });
  }

  async importAll(data: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      this.store.set(key, value);
    }
  }
}
