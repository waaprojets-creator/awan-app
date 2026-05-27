/** Parse + migrate function: accepts raw unknown, returns typed T or throws. */
export type ParseFn<T> = (raw: unknown) => T;

export class DbFullError extends Error {
  constructor() { super('AWAN storage quota exceeded'); this.name = 'DbFullError'; }
}

export interface ITransaction {
  get<T>(key: string, parse: ParseFn<T>): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface IStorage {
  /** Read and parse (+ migrate) a single keyed value. Returns null if absent. */
  get<T>(key: string, parse: ParseFn<T>): Promise<T | null>;
  /** Serialize and write a value (no schema needed — validated on write by caller). */
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  /** Filter keys by prefix + JSON field equality — uses SQL WHERE on SQLite, cursor on IDB. */
  listFiltered(prefix: string, where: Record<string, unknown>): Promise<string[]>;
  /** Paginated key listing ordered by key — avoids loading entire prefix at once. */
  listByPrefix(prefix: string, limit?: number, offset?: number): Promise<string[]>;
  /** SQL-native aggregation (SUM/AVG/COUNT) on a JSON field. Returns 0 if no rows match. */
  aggregate(prefix: string, field: string, op: 'SUM' | 'AVG' | 'COUNT', where?: Record<string, unknown>): Promise<number>;
  query<T>(table: string, where: Partial<T>, parse: ParseFn<T>): Promise<T[]>;
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;
  clear(): Promise<void>;
  /** Export all key-value pairs as a JSON string (awan.backup format). */
  exportAll(): Promise<string>;
  /** Import key-value pairs from a raw record. */
  importAll(data: Record<string, unknown>): Promise<void>;
}
