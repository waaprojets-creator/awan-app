import { migrateRule } from '@/data/schemas/coach/rule';
import type { RuleLatest } from '@/data/schemas/coach/rule';

import sportNoWorkout from './rules/sport.no_workout_7d.json';
import sportStagnationCharge from './rules/sport.stagnation_charge.json';
import sportFatigueRpe from './rules/sport.fatigue_rpe.json';
import sportDeconditioning from './rules/sport.deconditioning.json';
import sportInsufficientFrequency from './rules/sport.insufficient_frequency.json';
import sportConsecutiveDays from './rules/sport.consecutive_days.json';
import nutritionProtein from './rules/nutrition.protein_low.json';
import nutritionDeficitAgressif from './rules/nutrition.deficit_agressif.json';
import nutritionProteinesFaibles from './rules/nutrition.proteines_faibles.json';
import nutritionTdeeSurplus from './rules/nutrition.tdee_surplus.json';
import nutritionMealRegularity from './rules/nutrition.meal_regularity.json';
import anthropoWeight from './rules/anthropo.weight_gain_trend.json';
import anthropoPerteRapide from './rules/anthropo.perte_rapide.json';
import anthropoNoMeasurement from './rules/anthropo.no_measurement_21d.json';
import anthropoWeightGainRapid from './rules/anthropo.weight_gain_rapid.json';
import sleepShort from './rules/sleep.short_avg.json';
import crossSleepWorkout from './rules/cross.sleep_workout.json';
import crossUnderfueledTraining from './rules/cross.underfueled_training.json';
import sportLowRecovery from './rules/sport.low_recovery.json';
import sportDeloadDue from './rules/sport.deload_due.json';
import nutritionFatLow from './rules/nutrition.fat_low.json';
import anthropoWhtElevated from './rules/anthropo.wht_elevated.json';
import sportAcwrDanger from './rules/sport.acwr_danger.json';
import sportInsufficientRest48h from './rules/sport.insufficient_rest_48h.json';
import nutritionFiberLow from './rules/nutrition.fiber_low.json';
import nutritionPeriworkoutProtein from './rules/nutrition.periworkout_protein.json';

const RAW_BUNDLED: unknown[] = [
  sportNoWorkout,
  sportStagnationCharge,
  sportFatigueRpe,
  sportDeconditioning,
  sportInsufficientFrequency,
  sportConsecutiveDays,
  nutritionProtein,
  nutritionDeficitAgressif,
  nutritionProteinesFaibles,
  nutritionTdeeSurplus,
  nutritionMealRegularity,
  anthropoWeight,
  anthropoPerteRapide,
  anthropoNoMeasurement,
  anthropoWeightGainRapid,
  sleepShort,
  crossSleepWorkout,
  crossUnderfueledTraining,
  sportLowRecovery,
  sportDeloadDue,
  nutritionFatLow,
  anthropoWhtElevated,
  sportAcwrDanger,
  sportInsufficientRest48h,
  nutritionFiberLow,
  nutritionPeriworkoutProtein,
];

/**
 * Load and validate the bundled default rule set.
 * Each JSON file is parsed through the versioned migrator so future bumps
 * (rule v2 etc.) keep older files working.
 */
export function loadDefaultRules(): RuleLatest[] {
  return RAW_BUNDLED.map((raw) => migrateRule(raw));
}
