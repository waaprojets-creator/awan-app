import { getStorage } from '@/data/storage/storageService';
import { safeStorage } from '@/utils/safeStorage';
import { migrateNutritionProfile } from '@/data/schemas/nutrition/nutritionProfile';
import type { NutritionProfileLatest } from '@/data/schemas/nutrition/nutritionProfile';

// Silo durable `nutrition.profile` + cache synchrone hydraté au boot (lectures en
// render/useMemo : NutritionScreen, Dashboard, Santé, analyse). Source de vérité = IStorage.
const KEY = 'nutrition.profile';
const LEGACY_KEY = 'awan.nutrition.profile';

let cache: NutritionProfileLatest | null = null;

export const NutritionProfileService = {
  /**
   * Hydrate le cache sync depuis le silo. Migration one-shot depuis l'ancien
   * safeStorage (web localStorage / natif memCache hydraté) si le silo est vide.
   * À appeler au boot APRÈS hydrateSafeStorage().
   */
  async hydrate(): Promise<void> {
    const storage = await getStorage();
    let data = await storage.get(KEY, migrateNutritionProfile);
    if (!data) {
      const legacy = safeStorage.get(LEGACY_KEY);
      if (legacy) {
        try {
          const valid = migrateNutritionProfile({ v: 1, ...(JSON.parse(legacy) as object) });
          await storage.set(KEY, valid);
          data = valid;
        } catch { /* ancien payload invalide → onboarding */ }
      }
    }
    cache = data;
  },

  getCached(): NutritionProfileLatest | null {
    return cache;
  },

  async get(): Promise<NutritionProfileLatest | null> {
    const storage = await getStorage();
    return storage.get(KEY, migrateNutritionProfile);
  },

  async save(profile: NutritionProfileLatest): Promise<void> {
    cache = profile;
    const storage = await getStorage();
    await storage.set(KEY, profile);
  },
};
