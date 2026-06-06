import { getStorage } from '@/data/storage/storageService';
import { safeStorage } from '@/utils/safeStorage';
import { migrateMealEntry } from '@/data/schemas/nutrition/mealEntry';
import type { MealEntryLatest } from '@/data/schemas/nutrition/mealEntry';
import { migrateWaterIntake } from '@/data/schemas/nutrition/waterIntake';

export interface NutritionExportPayload {
  exportedAt: string;
  profile: Record<string, unknown> | null;
  meals: MealEntryLatest[];
  waterIntake: Array<{ date: string; totalMl: number }>;
}

export async function buildNutritionExport(): Promise<string> {
  const storage = await getStorage();

  const mealKeys = await storage.list('nutrition.meal');
  const meals = (
    await Promise.all(mealKeys.map(k => storage.get(k, migrateMealEntry)))
  ).filter((e): e is MealEntryLatest => e !== null);

  const waterKeys = await storage.list('nutrition.water');
  const waterIntake: Array<{ date: string; totalMl: number }> = [];
  for (const key of waterKeys) {
    const entry = await storage.get(key, migrateWaterIntake);
    if (entry) waterIntake.push({ date: entry.date, totalMl: entry.totalMl });
  }

  let profile: Record<string, unknown> | null = null;
  try {
    const raw = safeStorage.get('awan.nutrition.profile');
    profile = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch { /* ignore */ }

  const payload: NutritionExportPayload = {
    exportedAt: new Date().toISOString(),
    profile,
    meals: meals.sort((a, b) => a.timestamp - b.timestamp),
    waterIntake: waterIntake.sort((a, b) => a.date.localeCompare(b.date)),
  };

  return JSON.stringify(payload, null, 2);
}
