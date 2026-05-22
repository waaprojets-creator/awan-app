/**
 * Circadian energy model — based on chronobiology research.
 * Peak cognitive/physical capacity: late morning + secondary mid-afternoon.
 * Trough: post-lunch dip (13h–15h), late evening.
 *
 * Source: Blatter & Cajochen, Sleep Med Rev 2007; Monk, J Biol Rhythms 2005.
 */

export type CircadianLevel = 'low' | 'medium' | 'high';

/**
 *  'high'   → 06:00–09:00, 17:00–19:00
 *  'medium' → 09:00–11:30, 15:00–17:00, 19:00–21:00
 *  'low'    → 11:30–15:00 (post-lunch dip), 21:00–22:00
 */
export function energyAtMinute(min: number): CircadianLevel {
  const h = min / 60;
  if ((h >= 6 && h < 9) || (h >= 17 && h < 19)) return 'high';
  if ((h >= 9 && h < 11.5) || (h >= 15 && h < 17) || (h >= 19 && h < 21)) return 'medium';
  return 'low';
}

/** Compute the dominant circadian level for a window [startMin, startMin + durationMin). */
export function dominantEnergy(startMin: number, durationMin: number): CircadianLevel {
  const samples = Math.max(1, Math.floor(durationMin / 15));
  const counts: Record<CircadianLevel, number> = { low: 0, medium: 0, high: 0 };
  for (let i = 0; i < samples; i++) {
    const m = startMin + Math.floor((durationMin / samples) * i);
    counts[energyAtMinute(m)]++;
  }
  return (Object.entries(counts) as [CircadianLevel, number][])
    .sort((a, b) => b[1] - a[1])[0]![0];
}
