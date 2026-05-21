import type { CoachContext } from '../types';
import type { ForecastGenerator } from './types';
import type { ForecastLatest } from '@/data/schemas/coach/forecast';
import { rangeBack } from '../engine/dateRange';

// ─── Nutrition — refeed window ────────────────────────────────────────────────
// Recommends a refeed day when the user has been in sustained caloric deficit.
//
// Trigger heuristic:
//   - ≥ 7 consecutive days with daily kcal < DEFICIT_THRESHOLD (1700 kcal)
//   - Covers metabolic adaptation, leptin signaling, and adherence recovery
//
// Source: Trexler ET, Smith-Ryan AE, Norton LE (2014).
//   "Metabolic adaptation to weight loss: implications for the athlete"
//   J Int Soc Sports Nutr. doi:10.1186/1550-2783-11-7
//
// Secondary: Camps SG, et al. (2013). "Weight loss, weight maintenance, and
//   adaptive thermogenesis." Am J Clin Nutr. doi:10.3945/ajcn.112.050310

const SOURCE = 'https://doi.org/10.1186/1550-2783-11-7';
const KNOWLEDGE_REF = 'nutrition.tdee_adaptive';

const WINDOW_DAYS = 14;
const MIN_CONSECUTIVE_DEFICIT_DAYS = 7;
const DEFICIT_THRESHOLD_KCAL = 1700; // proxy for below-maintenance
const REFEED_HORIZON_DAYS = 3; // recommend refeed within 3 days

export const nutritionRefeedWindow: ForecastGenerator = {
  id: 'nutrition.refeed_window',
  domain: 'nutrition',
  kind: 'refeed',
  knowledgeRef: KNOWLEDGE_REF,
  source: SOURCE,

  async generate(ctx: CoachContext): Promise<ForecastLatest[]> {
    const dates = new Set(rangeBack(ctx.date, WINDOW_DAYS));
    const parse = ctx.resolveSource('nutrition.meal');
    const keys = await ctx.storage.list('nutrition.meal');

    // Aggregate daily kcal totals
    const dailyKcal = new Map<string, number>();
    for (const key of keys) {
      const raw = await ctx.storage.get(key, parse);
      if (raw === null) continue;
      const rec = raw as Record<string, unknown>;
      const date = typeof rec['date'] === 'string' ? rec['date'] : null;
      if (date === null || !dates.has(date)) continue;
      const kcal = typeof rec['kcal'] === 'number' ? rec['kcal'] : 0;
      dailyKcal.set(date, (dailyKcal.get(date) ?? 0) + kcal);
    }

    if (dailyKcal.size < MIN_CONSECUTIVE_DEFICIT_DAYS) return [];

    // Build sorted timeline (oldest → newest) for consecutive count
    const sortedDates = Array.from(dailyKcal.keys()).sort();
    let consecutiveDays = 0;
    let latestDeficitDate = '';

    for (const d of sortedDates) {
      const total = dailyKcal.get(d) ?? 0;
      if (total > 0 && total < DEFICIT_THRESHOLD_KCAL) {
        consecutiveDays++;
        latestDeficitDate = d;
      } else if (total > 0) {
        consecutiveDays = 0; // reset on non-deficit day
      }
      // days with 0 kcal (no data) don't break the streak — user may not have logged
    }

    if (consecutiveDays < MIN_CONSECUTIVE_DEFICIT_DAYS) return [];

    const targetDate = addDays(ctx.date, REFEED_HORIZON_DAYS);
    const horizonDays = REFEED_HORIZON_DAYS;
    const avgDeficitKcal = round(
      Array.from(dailyKcal.values()).reduce((s, v) => s + v, 0) / dailyKcal.size,
      0,
    );

    const forecast: ForecastLatest = {
      v: 1,
      id: `nutrition.refeed_window.${ctx.date}.${targetDate}`,
      generatorId: 'nutrition.refeed_window',
      domain: 'nutrition',
      generatedAt: Date.now(),
      generatedOnDate: ctx.date,
      targetDate,
      horizonDays,
      kind: 'refeed',
      severity: 'warn',
      titleKey: 'forecast.nutrition.refeed_window.title',
      detailKey: 'forecast.nutrition.refeed_window.detail',
      params: {
        consecutiveDays,
        avgKcal: avgDeficitKcal,
        lastDeficitDate: latestDeficitDate,
      },
      confidence: clamp01(0.6 + (consecutiveDays - 7) * 0.04),
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

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
