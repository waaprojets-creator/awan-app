import { getStorage } from '@/data/storage/storageService';
import { ds } from '@/utils/storage';
import { migratePeriodization } from '@/data/schemas/sport/periodization';
import type { PeriodizationLatest } from '@/data/schemas/sport/periodization';

// Silo durable `sport.periodization` avec cache synchrone hydraté au boot
// (lectures en render : SportScreen, PerformanceTab). Source de vérité = IStorage.
const KEY = 'sport.periodization';

export type MesocycleState = PeriodizationLatest;

const PHASE_LABELS: Record<0 | 1 | 2, string> = {
  0: 'REPRISE NEUROLOGIQUE',
  1: 'RECOMPOSITION ACTIVE',
  2: 'PÉRIODISATION AVANCÉE',
};

let cache: MesocycleState | null = null;

function persist(state: MesocycleState): void {
  cache = state;
  getStorage().then(s => s.set(KEY, state)).catch(() => { /* best-effort */ });
}

export const PeriodizationService = {
  /** Hydrate le cache sync depuis le silo. À appeler une fois au boot avant le rendu. */
  async hydrate(): Promise<void> {
    const storage = await getStorage();
    cache = await storage.get(KEY, migratePeriodization);
  },

  getCurrent(): MesocycleState | null {
    return cache;
  },

  getOrInit(): MesocycleState {
    if (cache) return cache;
    const initial: MesocycleState = {
      v: 1,
      phase: 0,
      mesoWeek: 1,
      startDate: ds(new Date()),
      deloadTriggered: false,
    };
    persist(initial);
    return initial;
  },

  advanceWeek(): MesocycleState {
    const state = PeriodizationService.getOrInit();
    const next: MesocycleState = { ...state, mesoWeek: state.mesoWeek + 1 };
    persist(next);
    return next;
  },

  triggerDeload(): MesocycleState {
    const state = PeriodizationService.getOrInit();
    const next: MesocycleState = { ...state, deloadTriggered: true };
    persist(next);
    return next;
  },

  getPhaseLabel(phase: 0 | 1 | 2): string {
    return PHASE_LABELS[phase];
  },
};
