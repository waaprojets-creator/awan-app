import { getStorage } from '@/data/storage/storageService';
import { migrateMeasurement } from '@/data/schemas/anthropo/measurement';
import type { MeasurementLatest } from '@/data/schemas/anthropo/measurement';
import { BiometricsService } from './biometricsService';

const MEASURE_PREFIX = 'anthropo.measurement';

// Noms de plis attendus par les formules biometricsService (ordre imposé)
const JP7_KEYS = ['pectoral', 'axillaire', 'triceps', 'subscapulaire', 'abdominal', 'suprailiac', 'cuisse_ant'] as const;
const DW4_KEYS = ['biceps', 'triceps', 'subscapulaire', 'suprailiac'] as const;
const S13_KEYS = ['pectoral','axillaire','triceps','subscapulaire','abdominal','suprailiac',
  'cuisse_ant','biceps','mollet_med','supraspinale','abdominal_lat','cuisse_lat','avant_bras'] as const;

export interface MeasurementProfile {
  age: number;
  sex: 'male' | 'female';
  heightCm: number;
  weightKg?: number;
}

export const MeasurementService = {
  async getAll(): Promise<MeasurementLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(MEASURE_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateMeasurement)));
    return all
      .filter((e): e is MeasurementLatest => e !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getByDate(date: string): Promise<MeasurementLatest | null> {
    const storage = await getStorage();
    return storage.get(`${MEASURE_PREFIX}.${date}`, migrateMeasurement);
  },

  async save(entry: MeasurementLatest, profile?: MeasurementProfile): Promise<void> {
    const storage = await getStorage();
    let enriched: MeasurementLatest = entry;

    if (profile) {
      const sf = entry.skinfolds;

      const s13_sum = S13_KEYS.every(k => sf[k] != null)
        ? S13_KEYS.reduce((s, k) => s + (sf[k] ?? 0), 0)
        : null;

      const bf_pct_jp7 = JP7_KEYS.every(k => sf[k] != null)
        ? BiometricsService.jacksonPollock7(
            sf.pectoral!, sf.axillaire!, sf.triceps!, sf.subscapulaire!,
            sf.abdominal!, sf.suprailiac!, sf.cuisse_ant!,
            profile.age, profile.sex,
          )
        : null;

      const bf_pct_dw4 = DW4_KEYS.every(k => sf[k] != null)
        ? BiometricsService.durninWomersley4(
            sf.biceps!, sf.triceps!, sf.subscapulaire!, sf.suprailiac!,
            profile.age, profile.sex,
          )
        : null;

      const ffmi = (profile.weightKg && profile.weightKg > 0 && profile.heightCm > 0 && bf_pct_jp7 != null)
        ? BiometricsService.ffmiNormalized(profile.weightKg, profile.heightCm, bf_pct_jp7, profile.sex)
        : null;

      enriched = { ...entry, s13_sum, bf_pct_jp7, bf_pct_dw4, ffmi };
    }

    // clé = date pour un seul enregistrement par jour
    await storage.set(`${MEASURE_PREFIX}.${entry.date}`, enriched);
  },

  async delete(date: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(`${MEASURE_PREFIX}.${date}`);
  },
};
