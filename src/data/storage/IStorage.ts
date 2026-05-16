/** Parse + migrate function: accepts raw unknown, returns typed T or throws. */
export type ParseFn<T> = (raw: unknown) => T;

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
  query<T>(table: string, where: Partial<T>, parse: ParseFn<T>): Promise<T[]>;
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;
  clear(): Promise<void>;
  /** Export all key-value pairs as a JSON string (awan.backup format). */
  exportAll(): Promise<string>;
  /** Import key-value pairs from a raw record. */
  importAll(data: Record<string, unknown>): Promise<void>;
}
