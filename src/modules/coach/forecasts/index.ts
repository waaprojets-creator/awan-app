import type { ForecastGenerator } from './types';
import { sportDeloadPredicted } from './sport.deload_predicted';
import { sportNextPlannedSession } from './sport.next_planned_session';
import { anthropoNextBiweekly } from './anthropo.next_biweekly';
import { anthropoNextQuarterly } from './anthropo.next_quarterly';
import { nutritionRefeedWindow } from './nutrition.refeed_window';
import { crossRecoveryPriority } from './cross.recovery_priority';

/**
 * Registry of all built-in forecast generators. Add new generators here.
 * Like rulesLoader, this is a bundled list — no dynamic loading at runtime.
 */
const BUILTIN_GENERATORS: ForecastGenerator[] = [
  sportDeloadPredicted,
  sportNextPlannedSession,
  anthropoNextBiweekly,
  anthropoNextQuarterly,
  nutritionRefeedWindow,
  crossRecoveryPriority,
];

export function loadDefaultForecastGenerators(): ForecastGenerator[] {
  return BUILTIN_GENERATORS.slice();
}

export type { ForecastGenerator };
