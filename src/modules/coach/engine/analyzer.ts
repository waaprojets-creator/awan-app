import type { Signal } from '@/data/schemas/coach/signal';
import type { CoachContext } from '../types';
import { rangeBack } from './dateRange';

/**
 * Reads raw records under signal.source for the requested time window and
 * computes a single numeric value via the chosen aggregation type.
 *
 * The analyzer is the only layer that touches storage. Once it returns,
 * the rest of the engine works on plain numbers.
 */
export async function analyzeSignal(signal: Signal, ctx: CoachContext): Promise<number> {
  const dates = new Set(rangeBack(ctx.date, signal.window.days));
  const parse = ctx.resolveSource(signal.source);

  const allKeys = await ctx.storage.list(signal.source);
  const records: Array<{ key: string; record: Record<string, unknown> }> = [];

  for (const key of allKeys) {
    const raw = await ctx.storage.get(key, parse);
    if (raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const recDate = typeof rec['date'] === 'string' ? rec['date'] : null;
    if (recDate === null || !dates.has(recDate)) continue;
    if (!matchesFilter(rec, signal.filter)) continue;
    records.push({ key, record: rec });
  }

  switch (signal.type) {
    case 'count':
      return records.length;

    case 'sum': {
      const f = requireField(signal);
      return records.reduce((acc, r) => acc + numberOrZero(r.record[f]), 0);
    }

    case 'avg': {
      if (records.length === 0) return 0;
      const f = requireField(signal);
      const sum = records.reduce((acc, r) => acc + numberOrZero(r.record[f]), 0);
      return sum / records.length;
    }

    case 'latest': {
      const f = requireField(signal);
      const sorted = [...records].sort((a, b) =>
        String(b.record['date']).localeCompare(String(a.record['date'])),
      );
      const head = sorted[0];
      return head ? numberOrZero(head.record[f]) : 0;
    }

    case 'trend': {
      const f = requireField(signal);
      const series = records
        .map((r) => ({
          t: String(r.record['date']),
          y: numberOrZero(r.record[f]),
        }))
        .sort((a, b) => a.t.localeCompare(b.t));
      return linearSlope(series.map((p, i) => [i, p.y] as [number, number]));
    }

    case 'ratio': {
      const f = requireField(signal);
      if (!signal.ratioWindow) throw new Error("Signal 'ratio' requires 'ratioWindow'");
      const longDates = new Set(rangeBack(ctx.date, signal.ratioWindow.days));
      let longSum = 0;
      for (const key of allKeys) {
        const raw = await ctx.storage.get(key, parse);
        if (raw === null) continue;
        const rec = raw as Record<string, unknown>;
        const recDate = typeof rec['date'] === 'string' ? rec['date'] : null;
        if (recDate === null || !longDates.has(recDate)) continue;
        if (!matchesFilter(rec, signal.filter)) continue;
        longSum += numberOrZero(rec[f]);
      }
      const shortSum = records.reduce((acc, r) => acc + numberOrZero(r.record[f]), 0);
      // Normalize per-day: ACWR = (shortSum / shortDays) / (longSum / longDays)
      const shortAvg = shortSum / signal.window.days;
      const longAvg = longSum / signal.ratioWindow.days;
      if (longAvg === 0) return 0;
      return shortAvg / longAvg;
    }
  }
}

function requireField(s: Signal): string {
  if (!s.field) throw new Error(`Signal ${s.type} requires 'field'`);
  return s.field;
}

function numberOrZero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function matchesFilter(
  rec: Record<string, unknown>,
  filter: Record<string, string | number | boolean> | undefined,
): boolean {
  if (!filter) return true;
  for (const [k, v] of Object.entries(filter)) {
    if (rec[k] !== v) return false;
  }
  return true;
}

/** Slope of best-fit line over (x, y) points. Empty / single-point → 0. */
function linearSlope(points: Array<[number, number]>): number {
  const n = points.length;
  if (n < 2) return 0;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of points) {
    sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return 0;
  return (n * sxy - sx * sy) / denom;
}
