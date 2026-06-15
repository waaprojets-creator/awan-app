import { getStorage } from '@/data/storage/storageService';
import { eventBus } from '@/data/events/bus';
import { migrateDayState } from '@/data/schemas/planning/dayState';
import type { DayStateLatest, LifeState, StateSegment } from '@/data/schemas/planning/dayState';
import { applySegment, defaultSegments } from '@/modules/planning/dayState';

const PREFIX = 'planning.state';

// Clé : planning.state.{YYYY-MM-DD}  (un enregistrement par jour)
export const DayStateService = {
  async getByDate(date: string): Promise<DayStateLatest | null> {
    const storage = await getStorage();
    return storage.get(`${PREFIX}.${date}`, migrateDayState);
  },

  /** Segments stockés, ou partition par défaut (journée libre) si absent. */
  async segmentsForDate(date: string): Promise<StateSegment[]> {
    const stored = await DayStateService.getByDate(date);
    return stored?.segments ?? defaultSegments();
  },

  async save(state: DayStateLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(`${PREFIX}.${state.date}`, state);
    eventBus.emit('state.changed', { date: state.date });
  },

  /** Peint un état sur [startMin,endMin) puis persiste. Crée le jour si absent. */
  async setSegment(
    date: string,
    state: LifeState,
    startMin: number,
    endMin: number,
  ): Promise<DayStateLatest> {
    const segments = applySegment(await DayStateService.segmentsForDate(date), state, startMin, endMin);
    const next: DayStateLatest = {
      v: 1,
      date,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      segments,
      savedAt: Date.now(),
    };
    await DayStateService.save(next);
    return next;
  },

  /** Réinitialise la journée (retour au défaut libre). */
  async reset(date: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(`${PREFIX}.${date}`);
    eventBus.emit('state.changed', { date });
  },
};
