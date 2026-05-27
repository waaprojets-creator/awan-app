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

  async listFiltered(prefix: string, where: Record<string, unknown>): Promise<string[]> {
    const results: string[] = [];
    for (const [key, value] of this.store.entries()) {
      if (!key.startsWith(prefix)) continue;
      const obj = value as Record<string, unknown>;
      if (Object.entries(where).every(([k, v]) => obj[k] === v)) results.push(key);
    }
    return results;
  }

  async listByPrefix(prefix: string, limit?: number, offset?: number): Promise<string[]> {
    const keys = [...this.store.keys()].filter(k => k.startsWith(prefix)).sort();
    const start = offset ?? 0;
    return limit !== undefined ? keys.slice(start, start + limit) : keys.slice(start);
  }

  async aggregate(prefix: string, field: string, op: 'SUM' | 'AVG' | 'COUNT', where?: Record<string, unknown>): Promise<number> {
    let sum = 0; let count = 0;
    for (const [key, value] of this.store.entries()) {
      if (!key.startsWith(prefix)) continue;
      const obj = value as Record<string, unknown>;
      if (where && !Object.entries(where).every(([k, v]) => obj[k] === v)) continue;
      count++;
      if (op !== 'COUNT') {
        const v = obj[field];
        if (typeof v === 'number') sum += v;
      }
    }
    if (op === 'COUNT') return count;
    if (op === 'AVG') return count > 0 ? sum / count : 0;
    return sum;
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
