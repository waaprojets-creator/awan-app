import { getStorage } from '@/data/storage/storageService';
import { migrateAnthropoGoals } from '@/data/schemas/anthropo/anthropoGoals';
import type { AnthropoGoalsLatest } from '@/data/schemas/anthropo/anthropoGoals';

const GOALS_KEY = 'anthropo.goals';

export const AnthropoGoalsService = {
  async get(): Promise<AnthropoGoalsLatest | null> {
    const storage = await getStorage();
    return storage.get(GOALS_KEY, migrateAnthropoGoals);
  },

  async save(goals: AnthropoGoalsLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(GOALS_KEY, goals);
  },
};
