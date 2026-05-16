import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { IStorage, ITransaction, ParseFn } from './IStorage';

const DB_VERSION = 1;

const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

export interface SqliteStorageConfig {
  dbName?: string;
  encrypted?: boolean;
}

export class SqliteStorage implements IStorage {
  private db: SQLiteDBConnection | null = null;
  private readonly conn = new SQLiteConnection(CapacitorSQLite);
  private readonly dbName: string;
  private readonly encrypted: boolean;

  constructor(config: SqliteStorageConfig = {}) {
    this.dbName = config.dbName ?? 'awan';
    this.encrypted = config.encrypted ?? false;
  }

  async open(): Promise<void> {
    await this.conn.checkConnectionsConsistency();
    const isConn = (await this.conn.isConnection(this.dbName, this.encrypted)).result ?? false;
    const mode = this.encrypted ? 'secret' : 'no-encryption';

    this.db = isConn
      ? await this.conn.retrieveConnection(this.dbName, this.encrypted)
      : await this.conn.createConnection(this.dbName, this.encrypted, mode, DB_VERSION, false);

    await this.db.open();
    await this.db.execute(CREATE_TABLES);
  }

  async close(): Promise<void> {
    await this.conn.closeConnection(this.dbName, this.encrypted);
    this.db = null;
  }

  private get handle(): SQLiteDBConnection {
    if (!this.db) throw new Error('SqliteStorage: call open() first');
    return this.db;
  }

  async get<T>(key: string, parse: ParseFn<T>): Promise<T | null> {
    const res = await this.handle.query('SELECT value FROM kv WHERE key = ?', [key]);
    const row = res.values?.[0] as { value: string } | undefined;
    if (!row) return null;
    return parse(JSON.parse(row.value));
  }

  async set<T>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value);
    await this.handle.run(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, json],
    );
  }

  async delete(key: string): Promise<void> {
    await this.handle.run('DELETE FROM kv WHERE key = ?', [key]);
  }

  async list(prefix: string): Promise<string[]> {
    const res = await this.handle.query(
      'SELECT key FROM kv WHERE key LIKE ?',
      [prefix + '%'],
    );
    return (res.values ?? []).map((r: { key: string }) => r.key);
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
    await this.handle.beginTransaction();
    try {
      const tx: ITransaction = {
        get: (k, p) => this.get(k, p),
        set: (k, v) => this.set(k, v),
        delete: (k) => this.delete(k),
      };
      const result = await fn(tx);
      await this.handle.commitTransaction();
      return result;
    } catch (err) {
      await this.handle.rollbackTransaction();
      throw err;
    }
  }

  async clear(): Promise<void> {
    await this.handle.run('DELETE FROM kv', []);
  }

  async exportAll(): Promise<string> {
    const res = await this.handle.query('SELECT key, value FROM kv', []);
    const data: Record<string, unknown> = {};
    for (const row of (res.values ?? []) as Array<{ key: string; value: string }>) {
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
