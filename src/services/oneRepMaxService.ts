import { getStorage } from '@/data/storage/storageService';
import { migrateOneRepMax } from '@/data/schemas/sport/oneRepMax';
import type { OneRepMaxLatest } from '@/data/schemas/sport/oneRepMax';

const ONE_RM_KEY = 'sport.oneRepMax';

export const OneRepMaxService = {
  async getRecords(): Promise<Record<string, number>> {
    const storage = await getStorage();
    const data = await storage.get(ONE_RM_KEY, migrateOneRepMax);
    return data?.records ?? {};
  },

  async saveRecords(records: Record<string, number>): Promise<void> {
    const storage = await getStorage();
    const payload: OneRepMaxLatest = { v: 1, records, updatedAt: Date.now() };
    await storage.set(ONE_RM_KEY, payload);
  },
};
