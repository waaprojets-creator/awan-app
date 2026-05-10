export type { IStorage, ITransaction, ParseFn } from './IStorage';
export { MemoryStorage } from './MemoryStorage';
// SqliteStorage: import directly to avoid bundling Capacitor in test environments
// import { SqliteStorage } from '@/data/storage/SqliteStorage';
