import { getStorage } from '@/data/storage/storageService';
import { migrateMeasurement } from '@/data/schemas/anthropo/measurement';
import type { MeasurementLatest } from '@/data/schemas/anthropo/measurement';

const MEASURE_PREFIX = 'anthropo.measurement';

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

  async save(entry: MeasurementLatest): Promise<void> {
    const storage = await getStorage();
    // clé = date pour un seul enregistrement par jour
    await storage.set(`${MEASURE_PREFIX}.${entry.date}`, entry);
  },
};
