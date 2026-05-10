import { migrateRule } from '@/data/schemas/coach/rule';
import type { RuleLatest } from '@/data/schemas/coach/rule';

import sportNoWorkout from './rules/sport.no_workout_7d.json';
import nutritionProtein from './rules/nutrition.protein_low.json';
import anthropoWeight from './rules/anthropo.weight_gain_trend.json';
import sleepShort from './rules/sleep.short_avg.json';
import crossSleepWorkout from './rules/cross.sleep_workout.json';

const RAW_BUNDLED: unknown[] = [
  sportNoWorkout,
  nutritionProtein,
  anthropoWeight,
  sleepShort,
  crossSleepWorkout,
];

/**
 * Load and validate the bundled default rule set.
 * Each JSON file is parsed through the versioned migrator so future bumps
 * (rule v2 etc.) keep older files working.
 */
export function loadDefaultRules(): RuleLatest[] {
  return RAW_BUNDLED.map((raw) => migrateRule(raw));
}
