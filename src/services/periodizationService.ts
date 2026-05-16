import { safeStorage } from '@/utils/safeStorage';
import { ds } from '@/utils/storage';

const PERIODIZATION_KEY = 'awan.periodization.current';

export interface MesocycleState {
  phase: 0 | 1 | 2;
  mesoWeek: number;
  startDate: string;
  deloadTriggered: boolean;
}

const PHASE_LABELS: Record<0 | 1 | 2, string> = {
  0: 'REPRISE NEUROLOGIQUE',
  1: 'RECOMPOSITION ACTIVE',
  2: 'PÉRIODISATION AVANCÉE',
};

export const PeriodizationService = {
  getCurrent(): MesocycleState | null {
    const raw = safeStorage.get(PERIODIZATION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as MesocycleState; } catch { return null; }
  },

  save(state: MesocycleState): void {
    safeStorage.set(PERIODIZATION_KEY, JSON.stringify(state));
  },

  getOrInit(): MesocycleState {
    const existing = PeriodizationService.getCurrent();
    if (existing) return existing;
    const initial: MesocycleState = {
      phase: 0,
      mesoWeek: 1,
      startDate: ds(new Date()),
      deloadTriggered: false,
    };
    PeriodizationService.save(initial);
    return initial;
  },

  advanceWeek(): MesocycleState {
    const state = PeriodizationService.getOrInit();
    const next: MesocycleState = {
      ...state,
      mesoWeek: state.mesoWeek + 1,
    };
    PeriodizationService.save(next);
    return next;
  },

  triggerDeload(): MesocycleState {
    const state = PeriodizationService.getOrInit();
    const next: MesocycleState = { ...state, deloadTriggered: true };
    PeriodizationService.save(next);
    return next;
  },

  getPhaseLabel(phase: 0 | 1 | 2): string {
    return PHASE_LABELS[phase];
  },
};
