import { getStorage } from '@/data/storage/storageService';
import { migrateHabitDefinition, isHabitScheduled } from '@/data/schemas/habits/habitDefinition';
import type { HabitDefinitionLatest } from '@/data/schemas/habits/habitDefinition';
import { HabitOccurrenceService } from './habitOccurrenceService';
import { eventBus } from '@/data/events/bus';

const DEF_PREFIX = 'habit.definition';

export const HabitService = {
  // ── Definitions ───────────────────────────────────────────────────────────

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
    eventBus.emit('habit.definition.modified', { habitId: def.id });
  },

  async deleteDefinition(id: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(`${DEF_PREFIX}.${id}`);
    eventBus.emit('habit.definition.modified', { habitId: id });
  },

  /** Bascule la validation d'une habitude : crée ou supprime une occurrence. */
  async toggle(date: string, habitId: string, habitName: string): Promise<boolean> {
    const existing = await HabitOccurrenceService.getByDate(date);
    const occ = existing.find(o => o.habitId === habitId);
    if (occ) {
      await HabitOccurrenceService.delete(occ.id);
      return false;
    }
    await HabitOccurrenceService.save(
      HabitOccurrenceService.build({ habitId, habitName, date }),
    );
    return true;
  },

  /** Habitudes actives prévues pour une date donnée. */
  async getScheduledForDate(date: string): Promise<HabitDefinitionLatest[]> {
    const defs = await HabitService.getDefinitions();
    return defs.filter(d => isHabitScheduled(d, date));
  },
};
