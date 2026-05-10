/**
 * Returns ISO YYYY-MM-DD strings for the [date - days, date] inclusive range.
 * Pure function, no timezone surprises (works in UTC).
 */
export function rangeBack(date: string, days: number): string[] {
  const out: string[] = [];
  const d = new Date(date + 'T00:00:00Z');
  for (let i = 0; i < days; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}
