import { getStorage } from '@/data/storage/storageService';
import { migrateSleepEntry } from '@/data/schemas/sleep/sleepEntry';
import type { SleepEntryLatest } from '@/data/schemas/sleep/sleepEntry';

const SLEEP_PREFIX = 'sleep.entry';

function sleepKey(id: string): string {
  return `${SLEEP_PREFIX}.${id}`;
}

export const SleepService = {
  async getAll(): Promise<SleepEntryLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(SLEEP_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateSleepEntry)));
    return all
      .filter((e): e is SleepEntryLatest => e !== null)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async getByDate(date: string): Promise<SleepEntryLatest | null> {
    const storage = await getStorage();
    return storage.get(`${SLEEP_PREFIX}.${date}`, migrateSleepEntry);
  },

  async getLast7Days(): Promise<SleepEntryLatest[]> {
    const all = await SleepService.getAll();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return all.filter(e => e.date >= cutoffStr);
  },

  async save(entry: SleepEntryLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(sleepKey(entry.id), entry);
  },

  async delete(id: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(sleepKey(id));
  },

  avgDurationH(entries: SleepEntryLatest[]): number {
    if (entries.length === 0) return 0;
    return entries.reduce((acc, e) => acc + e.durationH, 0) / entries.length;
  },
};
