import { getStorage } from '@/data/storage/storageService';
import type { WaterIntakeLatest } from '@/data/schemas/nutrition/waterIntake';
import { migrateWaterIntake } from '@/data/schemas/nutrition/waterIntake';
import { uid } from '@/utils/storage';

const PREFIX = 'nutrition.water';

function key(date: string): string {
  return `${PREFIX}.${date}`;
}

function hhmm(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const WaterService = {
  async getByDate(date: string): Promise<WaterIntakeLatest | null> {
    const storage = await getStorage();
    return storage.get(key(date), migrateWaterIntake);
  },

  async addMl(date: string, ml: number): Promise<WaterIntakeLatest> {
    const storage = await getStorage();
    const existing = await storage.get(key(date), migrateWaterIntake);
    const entry: WaterIntakeLatest = existing
      ? {
          ...existing,
          totalMl: existing.totalMl + ml,
          entries: [...existing.entries, { timeHHMM: hhmm(), ml }],
          updatedAt: Date.now(),
        }
      : {
          v: 1,
          id: uid(),
          date,
          totalMl: ml,
          entries: [{ timeHHMM: hhmm(), ml }],
          updatedAt: Date.now(),
        };
    await storage.set(key(date), entry);
    return entry;
  },

  async reset(date: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(key(date));
  },

  // Recommended target: 35 mL × kg body weight (default 70kg if unknown)
  targetMl(weightKg: number): number {
    return Math.round(weightKg * 35);
  },
};
