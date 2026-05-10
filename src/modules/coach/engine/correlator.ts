import type { Rule } from '@/data/schemas/coach/rule';
import type { Correlation } from '@/data/schemas/coach/assessment';
import type { CoachContext } from '../types';
import { analyzeSignal } from './analyzer';
import { matchesCondition } from './scorer';

/**
 * Cross-domain rules read multiple signals across domains and compute a
 * correlation strength via Pearson's r over the time series. The condition is
 * evaluated against |r| (correlation magnitude), so a rule like { op: 'gt', value: 0.6 }
 * triggers whenever the two signals are strongly correlated (positive or negative).
 *
 * Signals are sampled day-by-day over the longest window of the two so that the
 * resulting series have matching cardinality.
 */
export async function findCorrelations(
  rules: Rule[],
  ctx: CoachContext,
): Promise<Correlation[]> {
  const out: Correlation[] = [];

  for (const rule of rules) {
    if (rule.domain !== 'cross') continue;
    if (!rule.enabled) continue;
    if (rule.signals.length < 2) continue;

    const sigA = rule.signals[0];
    const sigB = rule.signals[1];
    if (!sigA || !sigB) continue;

    // Sample both signals over the same window: per-day aggregation
    const days = Math.max(sigA.window.days, sigB.window.days);
    const seriesA: number[] = [];
    const seriesB: number[] = [];

    for (let offset = 0; offset < days; offset++) {
      const sampleDate = shiftDate(ctx.date, -offset);
      const sub = { ...ctx, date: sampleDate };
      const a = await analyzeSignal({ ...sigA, window: { days: 1 } }, sub);
      const b = await analyzeSignal({ ...sigB, window: { days: 1 } }, sub);
      seriesA.push(a);
      seriesB.push(b);
    }

    const r = pearson(seriesA, seriesB);
    if (!Number.isFinite(r)) continue;

    if (matchesCondition(Math.abs(r), rule.condition)) {
      out.push({
        ruleId: rule.id,
        domains: extractDomains(rule),
        strength: r,
        description: rule.name,
      });
    }
  }

  return out;
}

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i] ?? 0; sy += ys[i] ?? 0; }
  const mx = sx / n;
  const my = sy / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - mx;
    const dy = (ys[i] ?? 0) - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

function shiftDate(iso: string, deltaDays: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function extractDomains(rule: Rule): Array<'sport' | 'nutrition' | 'anthropo' | 'sleep' | 'cross'> {
  const domains = new Set<string>();
  for (const sig of rule.signals) {
    const prefix = sig.source.split('.')[0];
    if (prefix === 'sport' || prefix === 'nutrition' || prefix === 'anthropo' || prefix === 'sleep') {
      domains.add(prefix);
    }
  }
  return [...domains] as Array<'sport' | 'nutrition' | 'anthropo' | 'sleep' | 'cross'>;
}
