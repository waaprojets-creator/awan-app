import type { ZodSchema } from 'zod';

export interface ITransaction {
  get<T>(key: string, schema: ZodSchema<T>): Promise<T | null>;
  set<T>(key: string, value: T, schema: ZodSchema<T>): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface IStorage {
  get<T>(key: string, schema: ZodSchema<T>): Promise<T | null>;
  set<T>(key: string, value: T, schema: ZodSchema<T>): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  query<T>(table: string, where: Partial<T>): Promise<T[]>;
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;
  clear(): Promise<void>;
}
