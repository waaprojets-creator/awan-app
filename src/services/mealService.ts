import { getStorage } from '@/data/storage/storageService';
import { migrateMealEntry } from '@/data/schemas/nutrition/mealEntry';
import type { MealEntryLatest } from '@/data/schemas/nutrition/mealEntry';

const MEAL_PREFIX = 'nutrition.meal';

function mealKey(id: string): string {
  return `${MEAL_PREFIX}.${id}`;
}

export const MealService = {
  async getByDate(date: string): Promise<MealEntryLatest[]> {
    const storage = await getStorage();
    let keys = await storage.list(`${MEAL_PREFIX}.${date}`);
    if (keys.length === 0) keys = await storage.listFiltered(MEAL_PREFIX, { date });
    const all = await Promise.all(keys.map(k => storage.get(k, migrateMealEntry)));
    return all
      .filter((e): e is MealEntryLatest => e !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  async getDailyTotals(date: string): Promise<{ kcal: number; p: number; c: number; f: number; fiberG: number }> {
    const entries = await MealService.getByDate(date);
    return MealService.totals(entries);
  },

  async save(entry: MealEntryLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(mealKey(entry.id), entry);
  },

  async delete(id: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(mealKey(id));
  },

  totals(entries: MealEntryLatest[]): { kcal: number; p: number; c: number; f: number; fiberG: number } {
    return entries.reduce(
      (acc, e) => ({
        kcal: acc.kcal + e.kcal,
        p: acc.p + e.p,
        c: acc.c + e.c,
        f: acc.f + e.f,
        fiberG: acc.fiberG + (e.fiberG ?? 0),
      }),
      { kcal: 0, p: 0, c: 0, f: 0, fiberG: 0 },
    );
  },
};
