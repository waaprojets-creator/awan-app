import type { CoachContext } from '../types';
import type { ForecastGenerator } from './types';
import type { ForecastLatest } from '@/data/schemas/coach/forecast';

// ─── Anthropo — next quarterly review ────────────────────────────────────────
// Projects the next quarterly (90-day) full anthropometric assessment.
// Standard clinical body composition follow-up cadence.
// Source: Heyward & Wagner 2004, Applied Body Composition Assessment 2nd ed.,
//         standard clinical practice for long-term morphological tracking.

const QUARTERLY_DAYS = 90;
const ONBOARDING_DAYS = 30; // first reminder: 30 days from today

export const anthropoNextQuarterly: ForecastGenerator = {
  id: 'anthropo.next_quarterly',
  domain: 'anthropo',
  kind: 'measurement_due',

  async generate(ctx: CoachContext): Promise<ForecastLatest[]> {
    const parse = ctx.resolveSource('anthropo.measurement');
    const keys = await ctx.storage.list('anthropo.measurement');
    const dates: string[] = [];

    for (const key of keys) {
      const raw = await ctx.storage.get(key, parse);
      if (raw === null) continue;
      const rec = raw as Record<string, unknown>;
      if (typeof rec['date'] === 'string') dates.push(rec['date']);
    }

    let targetDate: string;
    let confidence: number;
    let severity: 'info' | 'warn';
    let detailKey: string;
    const params: Record<string, string | number> = {};

    if (dates.length === 0) {
      targetDate = addDays(ctx.date, ONBOARDING_DAYS);
      confidence = 0.5;
      severity = 'info';
      detailKey = 'forecast.anthropo.next_quarterly.detail_onboarding';
    } else {
      const latest = dates.slice().sort().pop()!;
      const candidate = addDays(latest, QUARTERLY_DAYS);
      const overdue = candidate <= ctx.date;
      targetDate = overdue ? addDays(ctx.date, 1) : candidate;
      confidence = overdue ? 0.9 : 0.75;
      severity = overdue ? 'warn' : 'info';
      detailKey = overdue
        ? 'forecast.anthropo.next_quarterly.detail_overdue'
        : 'forecast.anthropo.next_quarterly.detail_due';
      params['lastMeasurement'] = latest;
      if (overdue) params['overdueDays'] = daysBetween(candidate, ctx.date);
    }

    const horizonDays = daysBetween(ctx.date, targetDate);

    const forecast: ForecastLatest = {
      v: 1,
      id: `anthropo.next_quarterly.${ctx.date}.${targetDate}`,
      generatorId: 'anthropo.next_quarterly',
      domain: 'anthropo',
      generatedAt: Date.now(),
      generatedOnDate: ctx.date,
      targetDate,
      horizonDays,
      kind: 'measurement_due',
      severity,
      titleKey: 'forecast.anthropo.next_quarterly.title',
      detailKey,
      params,
      confidence,
    };
    return [forecast];
  },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86_400_000);
}
