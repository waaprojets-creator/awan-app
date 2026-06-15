import type { Signal } from '@/data/schemas/coach/signal';
import type { CoachContext } from '../types';
import { rangeBack } from './dateRange';

/**
 * Reads raw records under signal.source for the requested time window and
 * computes a single numeric value via the chosen aggregation type.
 *
 * Source records are bulk-loaded once per prefix and memoised in ctx.sourceCache
 * to avoid N+1 storage reads across multiple signals sharing the same source.
 */
export async function analyzeSignal(signal: Signal, ctx: CoachContext): Promise<number> {
  const allSourceRecords = await loadSource(signal.source, ctx);

  const dates = new Set(rangeBack(ctx.date, signal.window.days));
  const records = allSourceRecords.filter((rec) => {
    const recDate = typeof rec['date'] === 'string' ? rec['date'] : null;
    return recDate !== null && dates.has(recDate) && matchesFilter(rec, signal.filter);
  });

  switch (signal.type) {
    case 'count':
      return records.length;

    case 'sum': {
      const f = requireField(signal);
      return records.reduce((acc, r) => acc + numberOrZero(r[f]), 0);
    }

    case 'avg': {
      if (records.length === 0) return 0;
      const f = requireField(signal);
      const sum = records.reduce((acc, r) => acc + numberOrZero(r[f]), 0);
      return sum / records.length;
    }

    case 'avgDaily': {
      // Per-day mean: divide by window length, not record count. Correct for
      // sources with several records/day (meals) when the threshold is a daily total.
      const f = requireField(signal);
      const sum = records.reduce((acc, r) => acc + numberOrZero(r[f]), 0);
      return signal.window.days > 0 ? sum / signal.window.days : 0;
    }

    case 'latest': {
      const f = requireField(signal);
      const sorted = [...records].sort((a, b) =>
        String(b['date']).localeCompare(String(a['date'])),
      );
      const head = sorted[0];
      return head !== undefined ? numberOrZero(head[f]) : 0;
    }

    case 'trend': {
      const f = requireField(signal);
      const series = records
        .map((r) => ({ t: String(r['date']), y: numberOrZero(r[f]) }))
        .sort((a, b) => a.t.localeCompare(b.t));
      return linearSlope(series.map((p, i) => [i, p.y] as [number, number]));
    }

    case 'ratio': {
      const f = requireField(signal);
      if (!signal.ratioWindow) throw new Error("Signal 'ratio' requires 'ratioWindow'");
      const longDates = new Set(rangeBack(ctx.date, signal.ratioWindow.days));
      let longSum = 0;
      for (const rec of allSourceRecords) {
        const recDate = typeof rec['date'] === 'string' ? rec['date'] : null;
        if (recDate === null || !longDates.has(recDate)) continue;
        if (!matchesFilter(rec, signal.filter)) continue;
        longSum += numberOrZero(rec[f]);
      }
      const shortSum = records.reduce((acc, r) => acc + numberOrZero(r[f]), 0);
      const shortAvg = shortSum / signal.window.days;
      const longAvg = longSum / signal.ratioWindow.days;
      if (longAvg === 0) return 0;
      return shortAvg / longAvg;
    }
  }
}

async function loadSource(
  source: string,
  ctx: CoachContext,
): Promise<Record<string, unknown>[]> {
  if (ctx.sourceCache.has(source)) return ctx.sourceCache.get(source)!;
  const parse = ctx.resolveSource(source);
  const records = await ctx.storage.getAll(source, (raw) => parse(raw) as Record<string, unknown>);
  ctx.sourceCache.set(source, records);
  return records;
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
