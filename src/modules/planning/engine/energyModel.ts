import type { EnergyLevel } from '@/data/schemas/planning/scheduleTask';

/**
 * Energy profile of the day by minute-of-day.
 * Based on circadian research: peak cognitive/physical capacity in late morning
 * and a secondary peak mid-afternoon, trough around 13h–15h.
 *
 *  'high'   → 06:00–09:00, 17:00–19:00
 *  'medium' → 09:00–11:30, 15:00–17:00, 19:00–21:00
 *  'low'    → 11:30–15:00 (post-lunch dip), 21:00–22:00
 */
export function energyAtMinute(min: number): EnergyLevel {
  const h = min / 60;
  if ((h >= 6 && h < 9) || (h >= 17 && h < 19)) return 'high';
  if ((h >= 9 && h < 11.5) || (h >= 15 && h < 17) || (h >= 19 && h < 21)) return 'medium';
  return 'low';
}

/**
 * Score bonus when task energy requirement matches slot energy (0–2).
 *   exact match → 2
 *   one level off → 1
 *   two levels off → 0
 */
export function energyMatchScore(
  required: EnergyLevel,
  available: EnergyLevel,
): number {
  const rank: Record<EnergyLevel, number> = { low: 0, medium: 1, high: 2 };
  const diff = Math.abs(rank[required] - rank[available]);
  return Math.max(0, 2 - diff);
}

/** Compute the dominant energy level for a window [startMin, startMin + durationMin). */
export function dominantEnergy(startMin: number, durationMin: number): EnergyLevel {
  const samples = Math.max(1, Math.floor(durationMin / 15));
  const counts: Record<EnergyLevel, number> = { low: 0, medium: 0, high: 0 };
  for (let i = 0; i < samples; i++) {
    const m = startMin + Math.floor((durationMin / samples) * i);
    counts[energyAtMinute(m)]++;
  }
  return (Object.entries(counts) as [EnergyLevel, number][])
    .sort((a, b) => b[1] - a[1])[0]![0];
}
