import { getStorage } from '@/data/storage/storageService';
import { eventBus } from '@/data/events/bus';
import { migrateHabitOccurrence } from '@/data/schemas/habits/habitOccurrence';
import type { HabitOccurrenceLatest } from '@/data/schemas/habits/habitOccurrence';
import { dateId } from '@/utils/id';

const PREFIX = 'habit.occurrence';

export const HabitOccurrenceService = {
  async save(occurrence: HabitOccurrenceLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(`${PREFIX}.${occurrence.id}`, occurrence);
    eventBus.emit('habit.logged', { date: occurrence.date });
  },

  async delete(id: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(`${PREFIX}.${id}`);
  },

  async getByDate(date: string): Promise<HabitOccurrenceLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(`${PREFIX}.${date}`);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateHabitOccurrence)));
    return all
      .filter((o): o is HabitOccurrenceLatest => o !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  async getByHabitId(habitId: string, from: string, to: string): Promise<HabitOccurrenceLatest[]> {
    const storage = await getStorage();
    const keys = await storage.listFiltered(PREFIX, { habitId });
    const all = await Promise.all(keys.map(k => storage.get(k, migrateHabitOccurrence)));
    return all
      .filter((o): o is HabitOccurrenceLatest => o !== null && o.date >= from && o.date <= to)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  /** Crée une occurrence depuis une définition validée. */
  build(params: {
    habitId: string;
    habitName: string;
    date: string;
    timeHHMM?: string;
    durationMin?: number;
    note?: string;
  }): HabitOccurrenceLatest {
    const now = Date.now();
    return {
      v: 1,
      id: dateId(params.date),
      date: params.date,
      habitId: params.habitId,
      habitName: params.habitName,
      timeHHMM: params.timeHHMM,
      durationMin: params.durationMin,
      note: params.note,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: now,
    };
  },
};
