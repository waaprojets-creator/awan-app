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
  /** Taille approximative de la base en octets (file size sur SQLite, somme des values ailleurs). */
  getSizeBytes(): Promise<number>;
}

/** Capacité maximale par DB utilisateur. Au-delà, set() rejette avec DbFullError. */
export const MAX_DB_BYTES = 10 * 1024 * 1024;

export class DbFullError extends Error {
  readonly currentBytes: number;
  readonly maxBytes: number;
  constructor(currentBytes: number, maxBytes: number = MAX_DB_BYTES) {
    super(`Base utilisateur pleine (${(currentBytes / 1024 / 1024).toFixed(2)} / ${(maxBytes / 1024 / 1024).toFixed(0)} MB)`);
    this.name = 'DbFullError';
    this.currentBytes = currentBytes;
    this.maxBytes = maxBytes;
  }
}
