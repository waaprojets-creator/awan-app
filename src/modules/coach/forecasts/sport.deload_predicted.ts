import type { CoachContext } from '../types';
import type { ForecastGenerator } from './types';
import type { ForecastLatest } from '@/data/schemas/coach/forecast';
import { uuid } from '@/utils/id';
import { rangeBack } from '../engine/dateRange';

// ─── Sport — deload predicted ────────────────────────────────────────────────
// Predicts a deload week N+1 when session-RPE trends upward over 3 weeks.
// Source: Halson 2014, "Monitoring training load to understand fatigue in athletes"
//         doi:10.1007/s40279-014-0253-z
//
// Trigger heuristic:
//   - ≥ 6 sessions over the last 21 days
//   - linear slope of session-RPE > +0.15 / session (≈ +1 RPE every ~7 sessions)
//   - last-week average RPE ≥ 8
// → emits deload forecast targeting next Monday with severity 'warn'

const SOURCE = 'https://doi.org/10.1007/s40279-014-0253-z';
const KNOWLEDGE_REF = 'sport.overtraining_signals';

interface SessionRecord {
  date: string;
  sessionRPE: number | undefined;
  startTime: number | undefined;
}

export const sportDeloadPredicted: ForecastGenerator = {
  id: 'sport.deload_predicted',
  domain: 'sport',
  kind: 'deload',
  knowledgeRef: KNOWLEDGE_REF,
  source: SOURCE,

  async generate(ctx: CoachContext): Promise<ForecastLatest[]> {
    const dates = new Set(rangeBack(ctx.date, 21));
    const parse = ctx.resolveSource('sport.workoutLog');
    const keys = await ctx.storage.list('sport.workoutLog');
    const sessions: SessionRecord[] = [];

    for (const key of keys) {
      const raw = await ctx.storage.get(key, parse);
      if (raw === null) continue;
      const rec = raw as Record<string, unknown>;
      const date = typeof rec['date'] === 'string' ? rec['date'] : null;
      if (date === null || !dates.has(date)) continue;
      const rpe = typeof rec['sessionRPE'] === 'number' ? rec['sessionRPE'] : undefined;
      const startTime = typeof rec['startTime'] === 'number' ? rec['startTime'] : undefined;
      sessions.push({ date, sessionRPE: rpe, startTime });
    }

    const withRpe = sessions.filter(s => typeof s.sessionRPE === 'number');
    if (withRpe.length < 6) return [];

    // Sort by date asc, compute linear slope of RPE over the series index
    const series = withRpe
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s, i) => [i, s.sessionRPE!] as [number, number]);

    const slope = linearSlope(series);
    const lastWeekRpe = withRpe
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4)
      .map(s => s.sessionRPE!);
    const lastWeekAvg = lastWeekRpe.length > 0
      ? lastWeekRpe.reduce((a, v) => a + v, 0) / lastWeekRpe.length
      : 0;

    if (slope <= 0.15 || lastWeekAvg < 8) return [];

    const targetDate = nextMonday(ctx.date);
    const horizonDays = daysBetween(ctx.date, targetDate);

    const forecast: ForecastLatest = {
      v: 1,
      id: deterministicId('sport.deload_predicted', ctx.date, targetDate),
      generatorId: 'sport.deload_predicted',
      domain: 'sport',
      generatedAt: Date.now(),
      generatedOnDate: ctx.date,
      targetDate,
      horizonDays,
      kind: 'deload',
      severity: 'warn',
      titleKey: 'forecast.sport.deload_predicted.title',
      detailKey: 'forecast.sport.deload_predicted.detail',
      params: {
        slope: round(slope, 2),
        lastWeekAvgRpe: round(lastWeekAvg, 1),
        sessionCount: withRpe.length,
      },
      confidence: clamp01(0.5 + (slope - 0.15) * 2 + (lastWeekAvg - 8) * 0.1),
      source: SOURCE,
      knowledgeRef: KNOWLEDGE_REF,
    };
    return [forecast];
  },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function linearSlope(points: Array<[number, number]>): number {
  const n = points.length;
  if (n < 2) return 0;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of points) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const denom = n * sxx - sx * sx;
  return denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
}

function nextMonday(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon
  const delta = dow === 0 ? 1 : ((8 - dow) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86_400_000);
}

function deterministicId(generatorId: string, runDate: string, targetDate: string): string {
  return `${generatorId}.${runDate}.${targetDate}`;
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
