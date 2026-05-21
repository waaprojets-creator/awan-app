// Adaptive TDEE recalibration service
// Methodology: weekly weight trend slope vs average calorie intake
// Source: Thomas et al. 2014 (doi:10.1016/j.jand.2014.02.003)
// Minimum 7 days observation before first adjustment; 14 days for reliable signal

export interface WeightEntry {
  date: string;       // YYYY-MM-DD
  weightKg: number;
}

export interface IntakeEntry {
  date: string;
  kcal: number;
}

export interface AdaptiveTDEEResult {
  estimatedTDEE: number;
  confidence: 'low' | 'medium' | 'high';
  observationDays: number;
  weightTrendGPerDay: number;
  avgIntakeKcal: number;
}

// Linear regression slope (g/day) from weight series
function weightSlopeGPerDay(entries: WeightEntry[]): number {
  if (entries.length < 2) return 0;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const x0 = new Date(sorted[0]!.date).getTime();
  const xArr = sorted.map(e => (new Date(e.date).getTime() - x0) / 86_400_000);
  const yArr = sorted.map(e => e.weightKg * 1000); // convert to grams
  const sumX = xArr.reduce((a, b) => a + b, 0);
  const sumY = yArr.reduce((a, b) => a + b, 0);
  const sumXY = xArr.reduce((acc, x, i) => acc + x * (yArr[i] ?? 0), 0);
  const sumX2 = xArr.reduce((acc, x) => acc + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return isFinite(slope) ? parseFloat(slope.toFixed(1)) : 0;
}

// 7700 kcal ≈ 1 kg body weight change
const KCAL_PER_KG = 7700;

/**
 * Estimate real TDEE from weight trend + calorie intake over a period.
 * Returns null if insufficient data (< 7 days).
 */
export function estimateAdaptiveTDEE(
  weightHistory: WeightEntry[],
  intakeHistory: IntakeEntry[],
  baseTDEE: number,
): AdaptiveTDEEResult | null {
  const observationDays = Math.max(
    weightHistory.length,
    intakeHistory.length,
  );
  if (observationDays < 7) return null;

  const avgIntakeKcal =
    intakeHistory.reduce((s, e) => s + e.kcal, 0) / intakeHistory.length;

  const slopeGPerDay = weightSlopeGPerDay(weightHistory);

  // TDEE = avgIntake - (slope_g/day * kcal_per_g)
  // If weight is rising 10g/day at 2000kcal intake → TDEE ≈ 2000 - (10 * 7.7) = 1923
  const kcalPerGram = KCAL_PER_KG / 1000;
  const estimatedTDEE = Math.round(avgIntakeKcal - slopeGPerDay * kcalPerGram);

  // Fallback: if estimate is far from base TDEE, constrain to ±40%
  const minTDEE = baseTDEE * 0.6;
  const maxTDEE = baseTDEE * 1.4;
  const clampedTDEE = Math.max(minTDEE, Math.min(maxTDEE, estimatedTDEE));

  const confidence: 'low' | 'medium' | 'high' =
    observationDays >= 14 ? 'high' : observationDays >= 10 ? 'medium' : 'low';

  return {
    estimatedTDEE: Math.round(clampedTDEE),
    confidence,
    observationDays,
    weightTrendGPerDay: slopeGPerDay,
    avgIntakeKcal: Math.round(avgIntakeKcal),
  };
}
