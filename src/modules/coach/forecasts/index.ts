import type { ForecastGenerator } from './types';
import { sportDeloadPredicted } from './sport.deload_predicted';
import { anthropoNextBiweekly } from './anthropo.next_biweekly';

/**
 * Registry of all built-in forecast generators. Add new generators here.
 * Like rulesLoader, this is a bundled list — no dynamic loading at runtime.
 */
const BUILTIN_GENERATORS: ForecastGenerator[] = [
  sportDeloadPredicted,
  anthropoNextBiweekly,
];

export function loadDefaultForecastGenerators(): ForecastGenerator[] {
  return BUILTIN_GENERATORS.slice();
}

export type { ForecastGenerator };
