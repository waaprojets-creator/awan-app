import type { MealEntryLatest } from '@/data/schemas/nutrition/mealEntry';

// Nutrition Score 0-100 per meal
// Scoring:
//   Quantity adherence to targets  : 40 pts
//   Protein density                 : 20 pts
//   Fiber density                   : 20 pts
//   Fat quality (saturated heuristic): 10 pts
//   Bonus: source quality (db = real food vs manual = unknown): 10 pts

export interface MealScoreBreakdown {
  total: number;
  quantity: number;
  proteinDensity: number;
  fiberDensity: number;
  fatQuality: number;
  sourceQuality: number;
}

export interface NutritionTargets {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

// Score a single meal against daily targets (proportional to meal kcal share)
export function scoreMeal(
  meal: MealEntryLatest,
  dailyTargets: NutritionTargets,
): MealScoreBreakdown {
  if (dailyTargets.kcal <= 0 || meal.kcal <= 0) {
    return { total: 0, quantity: 0, proteinDensity: 0, fiberDensity: 0, fatQuality: 0, sourceQuality: 0 };
  }

  // Meal's expected share of daily targets (by caloric proportion)
  const kcalShare = Math.min(1, meal.kcal / dailyTargets.kcal);
  const targetP = dailyTargets.p * kcalShare;

  // Quantity (40 pts): how close is total kcal to its proportional target
  // Full score if within ±20% of share, drops linearly to 0 at ±50%
  const kcalRatio = meal.kcal / (dailyTargets.kcal * kcalShare || dailyTargets.kcal);
  const deviation = Math.abs(1 - kcalRatio);
  const quantity = Math.max(0, Math.round(40 * (1 - Math.min(1, deviation / 0.5))));

  // Protein density (20 pts): protein g per 100kcal (optimal ~8-12g/100kcal)
  const proteinPer100Kcal = (meal.p / meal.kcal) * 100;
  const proteinScore = Math.min(1, proteinPer100Kcal / 10);
  const proteinDensity = Math.round(20 * proteinScore);

  // Fiber density (20 pts): fiber g per 100kcal (optimal ~3-5g/100kcal)
  const fiberPer100Kcal = meal.fiberG ? (meal.fiberG / meal.kcal) * 100 : 0;
  const fiberScore = Math.min(1, fiberPer100Kcal / 4);
  const fiberDensity = Math.round(20 * fiberScore);

  // Fat quality (10 pts): heuristic based on fat% of calories
  // 20-35% of calories from fat = optimal; >40% or <15% reduces score
  const fatPctOfKcal = (meal.f * 9) / meal.kcal;
  const fatInRange = fatPctOfKcal >= 0.15 && fatPctOfKcal <= 0.40;
  const fatQuality = fatInRange ? 10 : Math.round(10 * (1 - Math.abs(fatPctOfKcal - 0.275) / 0.275));

  // Source quality (10 pts): db items are real catalogued foods, manual/quick less reliable
  const sourceQuality = meal.source === 'db' ? 10 : meal.source === 'custom' ? 8 : 5;

  // Protein adequacy check: if protein way below target, cap quantity bonus
  const proteinAdequacy = targetP > 0 ? Math.min(1, meal.p / (targetP * 0.7)) : 1;

  const raw = Math.round(
    (quantity * proteinAdequacy) + proteinDensity + fiberDensity + Math.max(0, fatQuality) + sourceQuality,
  );
  const total = Math.max(0, Math.min(100, raw));

  return { total, quantity, proteinDensity, fiberDensity, fatQuality: Math.max(0, fatQuality), sourceQuality };
}
