import { getStorage } from '@/data/storage/storageService';
import { migrateWeightEntry } from '@/data/schemas/body/weightEntry';
import type { WeightEntryLatest } from '@/data/schemas/body/weightEntry';

const WEIGHT_PREFIX = 'weight.entry';

function weightKey(date: string): string {
  return `${WEIGHT_PREFIX}.${date}`;
}

export const WeightService = {
  async getAll(): Promise<WeightEntryLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(WEIGHT_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateWeightEntry)));
    return all
      .filter((e): e is WeightEntryLatest => e !== null)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async getByDate(date: string): Promise<WeightEntryLatest | null> {
    const all = await WeightService.getAll();
    return all.find(e => e.date === date) ?? null;
  },

  async save(entry: WeightEntryLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(weightKey(entry.date), entry);
  },

  async delete(date: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(weightKey(date));
  },

  getAvg7d(entries: WeightEntryLatest[], refDate?: Date): number {
    const ref = refDate ?? new Date();
    const cutoff = new Date(ref);
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const recent = entries.filter(e => e.date >= cutoffStr && e.weight != null);
    if (recent.length === 0) return 0;
    return recent.reduce((acc, e) => acc + e.weight!, 0) / recent.length;
  },
};
