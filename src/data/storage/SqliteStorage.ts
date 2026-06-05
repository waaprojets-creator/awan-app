import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { DbFullError, MAX_DB_BYTES, type IStorage, type ITransaction, type ParseFn } from './IStorage';

export interface SqliteStorageConfig {
  dbName?: string;
  encrypted?: boolean; // kept for API compat — unused with expo-sqlite
}

export class SqliteStorage implements IStorage {
  private db: SQLiteDatabase | null = null;
  private readonly dbName: string;

  constructor(config: SqliteStorageConfig = {}) {
    this.dbName = config.dbName ?? 'awan';
  }

  async open(): Promise<void> {
    this.db = await openDatabaseAsync(this.dbName);
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS kv (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }

  async close(): Promise<void> {
    await this.db?.closeAsync();
    this.db = null;
  }

  private get handle(): SQLiteDatabase {
    if (!this.db) throw new Error('SqliteStorage: call open() first');
    return this.db;
  }

  async get<T>(key: string, parse: ParseFn<T>): Promise<T | null> {
    const row = await this.handle.getFirstAsync<{ value: string }>(
      'SELECT value FROM kv WHERE key = ?', [key],
    );
    return row ? parse(JSON.parse(row.value)) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value);
    const current = await this.getSizeBytes();
    if (current + json.length > MAX_DB_BYTES) {
      throw new DbFullError(current);
    }
    try {
      await this.handle.runAsync(
        'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)',
        [key, json],
      );
    } catch (err) {
      const msg = String(err);
      if (msg.includes('disk I/O error') || msg.includes('database or disk is full') || msg.includes('SQLITE_FULL')) {
        throw new DbFullError(current);
      }
      throw err;
    }
    this.invalidateSizeCache();
  }

  async delete(key: string): Promise<void> {
    await this.handle.runAsync('DELETE FROM kv WHERE key = ?', [key]);
    this.invalidateSizeCache();
  }

  private cachedSize: number | null = null;
  private cachedSizeAt = 0;

  private invalidateSizeCache(): void {
    this.cachedSize = null;
  }

  async getSizeBytes(): Promise<number> {
    const now = Date.now();
    if (this.cachedSize !== null && now - this.cachedSizeAt < 2000) return this.cachedSize;
    const pages = await this.handle.getFirstAsync<{ page_count: number }>('PRAGMA page_count');
    const pageSize = await this.handle.getFirstAsync<{ page_size: number }>('PRAGMA page_size');
    const pc = pages?.page_count ?? 0;
    const ps = pageSize?.page_size ?? 0;
    this.cachedSize = pc * ps;
    this.cachedSizeAt = now;
    return this.cachedSize;
  }

  async list(prefix: string): Promise<string[]> {
    const rows = await this.handle.getAllAsync<{ key: string }>(
      'SELECT key FROM kv WHERE key LIKE ?', [`${prefix}%`],
    );
    return rows.map(r => r.key);
  }

  async listFiltered(prefix: string, where: Record<string, unknown>): Promise<string[]> {
    let sql = 'SELECT key FROM kv WHERE key LIKE ?';
    const params: (string | number | null)[] = [`${prefix}%`];
    for (const [k, v] of Object.entries(where)) {
      sql += ` AND json_extract(value, '$.${k}') = ?`;
      params.push(v as string | number | null);
    }
    const rows = await this.handle.getAllAsync<{ key: string }>(sql, params);
    return rows.map(r => r.key);
  }

  async listByPrefix(prefix: string, limit?: number, offset?: number): Promise<string[]> {
    let sql = 'SELECT key FROM kv WHERE key LIKE ? ORDER BY key';
    const params: (string | number | null)[] = [`${prefix}%`];
    if (limit !== undefined) { sql += ' LIMIT ?'; params.push(limit); }
    if (offset !== undefined) { sql += ' OFFSET ?'; params.push(offset); }
    const rows = await this.handle.getAllAsync<{ key: string }>(sql, params);
    return rows.map(r => r.key);
  }

  async aggregate(prefix: string, field: string, op: 'SUM' | 'AVG' | 'COUNT', where?: Record<string, unknown>): Promise<number> {
    const extract = op === 'COUNT' ? '1' : `CAST(json_extract(value, '$.${field}') AS REAL)`;
    let sql = `SELECT ${op}(${extract}) as result FROM kv WHERE key LIKE ?`;
    const params: (string | number | null)[] = [`${prefix}%`];
    for (const [k, v] of Object.entries(where ?? {})) {
      sql += ` AND json_extract(value, '$.${k}') = ?`;
      params.push(v as string | number | null);
    }
    const row = await this.handle.getFirstAsync<{ result: number | null }>(sql, params);
    return row?.result ?? 0;
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
    let result!: T;
    await this.handle.withTransactionAsync(async () => {
      const tx: ITransaction = {
        get: (k, p) => this.get(k, p),
        set: (k, v) => this.set(k, v),
        delete: (k) => this.delete(k),
      };
      result = await fn(tx);
    });
    return result;
  }

  async clear(): Promise<void> {
    await this.handle.runAsync('DELETE FROM kv');
    this.invalidateSizeCache();
  }

  async exportAll(): Promise<string> {
    const rows = await this.handle.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM kv');
    const data: Record<string, unknown> = {};
    for (const row of rows) {
      try { data[row.key] = JSON.parse(row.value); } catch { data[row.key] = row.value; }
    }
    return JSON.stringify({ type: 'awan.backup', version: 1, exported: new Date().toISOString().slice(0, 10), data });
  }

  async importAll(data: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.set(key, value);
    }
  }
}
