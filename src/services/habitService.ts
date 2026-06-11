import { getStorage } from '@/data/storage/storageService';
import { migrateHabitDefinition, isHabitScheduled } from '@/data/schemas/habits/habitDefinition';
import { migrateHabitHistory } from '@/data/schemas/habits/habitHistory';
import type { HabitDefinitionLatest } from '@/data/schemas/habits/habitDefinition';
import type { HabitHistoryLatest } from '@/data/schemas/habits/habitHistory';

const DEF_PREFIX  = 'habit.definition';
const HIST_PREFIX = 'habit.history';

export const HabitService = {
  // ── Definitions ─────────────────────────────────────────────────────────────

  async getDefinitions(): Promise<HabitDefinitionLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(DEF_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateHabitDefinition)));
    return all
      .filter((e): e is HabitDefinitionLatest => e !== null)
      .sort((a, b) => a.order - b.order);
  },

  async saveDefinition(def: HabitDefinitionLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(`${DEF_PREFIX}.${def.id}`, def);
  },

  async deleteDefinition(id: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(`${DEF_PREFIX}.${id}`);
  },

  // ── History ─────────────────────────────────────────────────────────────────

  async getHistory(date: string): Promise<HabitHistoryLatest | null> {
    const storage = await getStorage();
    return storage.get(`${HIST_PREFIX}.${date}`, migrateHabitHistory);
  },

  async getHistoryRange(from: string, to: string): Promise<HabitHistoryLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(HIST_PREFIX);
    const inRange = keys.filter(k => {
      const date = k.replace(`${HIST_PREFIX}.`, '');
      return date >= from && date <= to;
    });
    const all = await Promise.all(inRange.map(k => storage.get(k, migrateHabitHistory)));
    return all
      .filter((e): e is HabitHistoryLatest => e !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /** Bascule l'état d'une habitude pour une date. Retourne l'historique mis à jour. */
  async toggle(date: string, habitId: string): Promise<HabitHistoryLatest> {
    const storage = await getStorage();
    const existing = await HabitService.getHistory(date);
    const current = existing?.validations[habitId] ?? false;
    const updated: HabitHistoryLatest = {
      v: 1 as const,
      date,
      timezone: existing?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      validations: { ...(existing?.validations ?? {}), [habitId]: !current },
      savedAt: Date.now(),
    };
    await storage.set(`${HIST_PREFIX}.${date}`, updated);
    return updated;
  },

  /** Habitudes actives prévues pour une date donnée. */
  async getScheduledForDate(date: string): Promise<HabitDefinitionLatest[]> {
    const defs = await HabitService.getDefinitions();
    return defs.filter(d => isHabitScheduled(d, date));
  },
};
