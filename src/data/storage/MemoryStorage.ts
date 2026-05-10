import type { ZodSchema } from 'zod';
import type { IStorage, ITransaction } from './IStorage';

export class MemoryStorage implements IStorage {
  private store = new Map<string, unknown>();

  async get<T>(key: string, schema: ZodSchema<T>): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    return schema.parse(raw);
  }

  async set<T>(key: string, value: T, schema: ZodSchema<T>): Promise<void> {
    schema.parse(value);
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.store.keys()].filter(k => k.startsWith(prefix));
  }

  async query<T>(table: string, where: Partial<T>): Promise<T[]> {
    const keys = await this.list(table);
    const results: T[] = [];
    for (const key of keys) {
      const raw = this.store.get(key) as T | undefined;
      if (!raw) continue;
      const match = Object.entries(where).every(
        ([k, v]) => (raw as Record<string, unknown>)[k] === v,
      );
      if (match) results.push(raw);
    }
    return results;
  }

  async transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    const tx: ITransaction = {
      get: (k, s) => this.get(k, s),
      set: (k, v, s) => this.set(k, v, s),
      delete: (k) => this.delete(k),
    };
    return fn(tx);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
