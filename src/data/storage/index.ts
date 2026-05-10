export type { IStorage, ITransaction } from './IStorage';
export { MemoryStorage } from './MemoryStorage';

// SqliteStorage exported separately to avoid importing Capacitor in tests
