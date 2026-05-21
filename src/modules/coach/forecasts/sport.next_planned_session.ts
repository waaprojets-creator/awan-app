import type { CoachContext } from '../types';
import type { ForecastGenerator } from './types';
import type { ForecastLatest } from '@/data/schemas/coach/forecast';
import { rangeBack } from '../engine/dateRange';

// ─── Sport — next planned session ────────────────────────────────────────────
// Projects the next training session based on routine assignedDays or inferred
// frequency from recent sessions. Helps the user visualize their upcoming
// training calendar in the Coach "À VENIR" section.
//
// Logic:
//   1. Read all active routines → collect assignedDays (0=Sun…6=Sat)
//   2. Find the next calendar day matching any assignedDay (within 7 days)
//   3. Fallback: if no assignedDays, infer average gap from last 5 sessions
//      and project lastSessionDate + avgGap.
//   4. If the projected day is today or already past → skip (not a forecast)
//
// Source: Schoenfeld BJ (2016). "Effects of resistance training frequency on
//   measures of muscle hypertrophy." J Strength Cond Res.
//   doi:10.1519/JSC.0000000000001546

const SOURCE = 'https://doi.org/10.1519/JSC.0000000000001546';
const KNOWLEDGE_REF = 'sport.frequency_recommendations';

const MAX_HORIZON_DAYS = 7;

export const sportNextPlannedSession: ForecastGenerator = {
  id: 'sport.next_planned_session',
  domain: 'sport',
  kind: 'planned_session',
  knowledgeRef: KNOWLEDGE_REF,
  source: SOURCE,

  async generate(ctx: CoachContext): Promise<ForecastLatest[]> {
    // ── 1. Read routine assignedDays ─────────────────────────────────────────
    const routineParse = ctx.resolveSource('sport.routine');
    const routineKeys = await ctx.storage.list('sport.routine');
    const assignedDows = new Set<number>(); // day-of-week numbers 0-6
    const routineNames: string[] = [];

    for (const key of routineKeys) {
      const raw = await ctx.storage.get(key, routineParse);
      if (raw === null) continue;
      const rec = raw as Record<string, unknown>;
      const days = rec['assignedDays'];
      if (Array.isArray(days)) {
        for (const d of days) {
          if (typeof d === 'number') assignedDows.add(d);
        }
      }
      if (typeof rec['name'] === 'string') routineNames.push(rec['name']);
    }

    let targetDate: string | null = null;
    let method: 'routine' | 'frequency' = 'routine';

    if (assignedDows.size > 0) {
      // ── 2. Find next matching day within MAX_HORIZON_DAYS ────────────────
      for (let delta = 1; delta <= MAX_HORIZON_DAYS; delta++) {
        const candidate = addDays(ctx.date, delta);
        const dow = new Date(candidate + 'T00:00:00Z').getUTCDay();
        if (assignedDows.has(dow)) {
          targetDate = candidate;
          break;
        }
      }
    }

    if (targetDate === null) {
      // ── 3. Frequency fallback: infer average gap from recent sessions ────
      const sessionDates = new Set(rangeBack(ctx.date, 28));
      const workoutParse = ctx.resolveSource('sport.workoutLog');
      const workoutKeys = await ctx.storage.list('sport.workoutLog');
      const recentDates: string[] = [];

      for (const key of workoutKeys) {
        const raw = await ctx.storage.get(key, workoutParse);
        if (raw === null) continue;
        const rec = raw as Record<string, unknown>;
        const date = typeof rec['date'] === 'string' ? rec['date'] : null;
        if (date !== null && sessionDates.has(date)) recentDates.push(date);
      }

      const uniqueSorted = Array.from(new Set(recentDates)).sort();
      if (uniqueSorted.length >= 2) {
        const gaps: number[] = [];
        for (let i = 1; i < uniqueSorted.length; i++) {
          gaps.push(daysBetween(uniqueSorted[i - 1]!, uniqueSorted[i]!));
        }
        const avgGap = Math.max(1, Math.round(gaps.reduce((s, v) => s + v, 0) / gaps.length));
        const lastDate = uniqueSorted[uniqueSorted.length - 1]!;
        // Compute next session from lastDate; if still ≤ today, project from today instead
        let projected = addDays(lastDate, avgGap);
        if (projected <= ctx.date) projected = addDays(ctx.date, avgGap);
        targetDate = projected;
        method = 'frequency';
      }
    }

    if (targetDate === null) return [];

    const horizonDays = daysBetween(ctx.date, targetDate);
    if (horizonDays <= 0) return [];

    const forecast: ForecastLatest = {
      v: 1,
      id: `sport.next_planned_session.${ctx.date}.${targetDate}`,
      generatorId: 'sport.next_planned_session',
      domain: 'sport',
      generatedAt: Date.now(),
      generatedOnDate: ctx.date,
      targetDate,
      horizonDays,
      kind: 'planned_session',
      severity: 'info',
      titleKey: 'forecast.sport.next_planned_session.title',
      detailKey: method === 'routine'
        ? 'forecast.sport.next_planned_session.detail_routine'
        : 'forecast.sport.next_planned_session.detail_frequency',
      params: {
        horizonDays,
        method,
      },
      confidence: method === 'routine' ? 0.9 : 0.65,
      source: SOURCE,
      knowledgeRef: KNOWLEDGE_REF,
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
