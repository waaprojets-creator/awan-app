import { getStorage } from '@/data/storage/storageService';
import { migrateMeasurement } from '@/data/schemas/anthropo/measurement';
import type { MeasurementLatest } from '@/data/schemas/anthropo/measurement';
import { BiometricsService } from './biometricsService';

const MEASURE_PREFIX = 'anthropo.measurement';

function median([a, b, c]: [number, number, number]): number {
  return [a, b, c].sort((x, y) => x - y)[1]!;
}

// Noms de plis attendus par les formules biometricsService (clés V3)
const JP7_KEYS = ['pectoral', 'axillaire', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh_anterior'] as const;
const DW4_KEYS = ['biceps', 'triceps', 'subscapular', 'suprailiac'] as const;
const S13_KEYS = ['pectoral', 'axillaire', 'triceps', 'subscapular', 'abdominal', 'suprailiac',
  'thigh_anterior', 'biceps', 'calf_medial', 'supraspinal', 'abdominal_lateral', 'thigh_lateral', 'forearm'] as const;

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
      const sf = entry.skinfolds ?? {};

      const s13_sum = S13_KEYS.every(k => sf[k] != null)
        ? S13_KEYS.reduce((s, k) => s + median(sf[k]!), 0)
        : null;

      const bf_pct_jp7 = JP7_KEYS.every(k => sf[k] != null)
        ? BiometricsService.jacksonPollock7(
            median(sf.pectoral!), median(sf.axillaire!), median(sf.triceps!), median(sf.subscapular!),
            median(sf.abdominal!), median(sf.suprailiac!), median(sf.thigh_anterior!),
            profile.age, profile.sex,
          )
        : null;

      const bf_pct_dw4 = DW4_KEYS.every(k => sf[k] != null)
        ? BiometricsService.durninWomersley4(
            median(sf.biceps!), median(sf.triceps!), median(sf.subscapular!), median(sf.suprailiac!),
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
