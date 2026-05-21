import type { CoachContext } from '../types';
import type { ForecastGenerator } from './types';
import type { ForecastLatest } from '@/data/schemas/coach/forecast';

// ─── Anthropo — next biweekly measurement ────────────────────────────────────
// Projects the next bimensuel anthropométrique measurement reminder, 14 days
// after the last recorded measurement. If no measurement exists yet, projects
// 7 days from today (gentle onboarding).
// Source: Heyward & Wagner 2004, Applied Body Composition Assessment 2nd ed.,
//         standard clinical practice for tracking body composition trends.

const BIWEEKLY_DAYS = 14;
const FALLBACK_ONBOARDING_DAYS = 7;

interface MeasurementRecord {
  date: string;
}

export const anthropoNextBiweekly: ForecastGenerator = {
  id: 'anthropo.next_biweekly',
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
      targetDate = addDays(ctx.date, FALLBACK_ONBOARDING_DAYS);
      confidence = 0.6;
      severity = 'info';
      detailKey = 'forecast.anthropo.next_biweekly.detail_onboarding';
    } else {
      const latest = dates.slice().sort().pop()!;
      const candidate = addDays(latest, BIWEEKLY_DAYS);
      // If candidate is already in the past, target tomorrow (overdue)
      const today = ctx.date;
      targetDate = candidate <= today ? addDays(today, 1) : candidate;
      const overdue = candidate <= today;
      confidence = overdue ? 0.95 : 0.85;
      severity = overdue ? 'warn' : 'info';
      detailKey = overdue
        ? 'forecast.anthropo.next_biweekly.detail_overdue'
        : 'forecast.anthropo.next_biweekly.detail_due';
      params['lastMeasurement'] = latest;
      params['overdueDays'] = overdue ? daysBetween(candidate, today) : 0;
    }

    const horizonDays = daysBetween(ctx.date, targetDate);

    const forecast: ForecastLatest = {
      v: 1,
      id: `anthropo.next_biweekly.${ctx.date}.${targetDate}`,
      generatorId: 'anthropo.next_biweekly',
      domain: 'anthropo',
      generatedAt: Date.now(),
      generatedOnDate: ctx.date,
      targetDate,
      horizonDays,
      kind: 'measurement_due',
      severity,
      titleKey: 'forecast.anthropo.next_biweekly.title',
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
