import { getStorage } from '@/data/storage/storageService';
import { migrateAnthropoProfile } from '@/data/schemas/anthropo/userProfile';
import type { AnthropoProfileLatest } from '@/data/schemas/anthropo/userProfile';

const PROFILE_PREFIX = 'anthropo.profile';

export const AnthropoProfileService = {
  async getAll(): Promise<AnthropoProfileLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(PROFILE_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateAnthropoProfile)));
    return all
      .filter((e): e is AnthropoProfileLatest => e !== null)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async getLatest(): Promise<AnthropoProfileLatest | null> {
    const all = await AnthropoProfileService.getAll();
    return all[0] ?? null;
  },

  async getByDate(date: string): Promise<AnthropoProfileLatest | null> {
    const storage = await getStorage();
    return storage.get(`${PROFILE_PREFIX}.${date}`, migrateAnthropoProfile);
  },

  async save(entry: AnthropoProfileLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(`${PROFILE_PREFIX}.${entry.date}`, entry);
  },

  async delete(date: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(`${PROFILE_PREFIX}.${date}`);
  },
};
