import type { CoachContext } from '../types';
import type { ForecastGenerator } from './types';
import type { ForecastLatest } from '@/data/schemas/coach/forecast';
import { rangeBack } from '../engine/dateRange';

// ─── Cross — recovery priority ────────────────────────────────────────────────
// Warns when average sleep over the last 3 nights is below 6.5 h AND a
// training session is scheduled the following day (detected via routine
// assignedDays or recent session frequency ≥ 4/week).
//
// Trigger heuristic:
//   - avg sleep < 6.5 h over the 3 most recent sleep entries (within 7 days)
//   - at least one sleep quality entry exists
//   - session likely tomorrow (routine assignedDays OR ≥4 sessions/7 days)
//
// Source: Lamon S, et al. (2021). "The effect of acute sleep deprivation on
//   skeletal muscle protein synthesis and the hormonal environment."
//   Physiol Rep. doi:10.14814/phy2.14660
//
// Also: Watson NF, et al. (2015). "Recommended amount of sleep for a healthy
//   adult." Sleep. doi:10.5665/sleep.4716

const SOURCE = 'https://doi.org/10.14814/phy2.14660';
const KNOWLEDGE_REF = 'coach.cross.sleep_workout';

const SLEEP_THRESHOLD_H = 6.5;
const SLEEP_WINDOW_DAYS = 7;
const MIN_SLEEP_ENTRIES = 2;
const HIGH_FREQUENCY_THRESHOLD = 4; // sessions per 7 days = likely session tomorrow

export const crossRecoveryPriority: ForecastGenerator = {
  id: 'cross.recovery_priority',
  domain: 'cross',
  kind: 'recovery_priority',
  knowledgeRef: KNOWLEDGE_REF,
  source: SOURCE,

  async generate(ctx: CoachContext): Promise<ForecastLatest[]> {
    // ── 1. Read recent sleep entries ─────────────────────────────────────────
    const sleepDates = new Set(rangeBack(ctx.date, SLEEP_WINDOW_DAYS));
    const sleepParse = ctx.resolveSource('sleep.entry');
    const sleepKeys = await ctx.storage.list('sleep.entry');
    const sleepHours: number[] = [];

    for (const key of sleepKeys) {
      const raw = await ctx.storage.get(key, sleepParse);
      if (raw === null) continue;
      const rec = raw as Record<string, unknown>;
      const date = typeof rec['date'] === 'string' ? rec['date'] : null;
      if (date === null || !sleepDates.has(date)) continue;
      const durationH = typeof rec['durationH'] === 'number' ? rec['durationH'] : null;
      if (durationH !== null && durationH > 0) sleepHours.push(durationH);
    }

    if (sleepHours.length < MIN_SLEEP_ENTRIES) return [];

    // Take only the 3 most recent (sorted newest-first via storage order heuristic)
    const recentSleep = sleepHours.slice(-3);
    const avgSleep = recentSleep.reduce((s, h) => s + h, 0) / recentSleep.length;

    if (avgSleep >= SLEEP_THRESHOLD_H) return [];

    // ── 2. Detect if tomorrow likely has a session ───────────────────────────
    const tomorrow = addDays(ctx.date, 1);
    const tomorrowDow = new Date(tomorrow + 'T00:00:00Z').getUTCDay(); // 0=Sun

    let sessionTomorrow = false;

    // Check routine assignedDays
    const routineParse = ctx.resolveSource('sport.routine');
    const routineKeys = await ctx.storage.list('sport.routine');
    for (const key of routineKeys) {
      const raw = await ctx.storage.get(key, routineParse);
      if (raw === null) continue;
      const rec = raw as Record<string, unknown>;
      const assignedDays = rec['assignedDays'];
      if (Array.isArray(assignedDays) && assignedDays.includes(tomorrowDow)) {
        sessionTomorrow = true;
        break;
      }
    }

    // Fallback: check frequency from recent workout logs
    if (!sessionTomorrow) {
      const workoutDates = new Set(rangeBack(ctx.date, 7));
      const workoutParse = ctx.resolveSource('sport.workoutLog');
      const workoutKeys = await ctx.storage.list('sport.workoutLog');
      let recentCount = 0;
      for (const key of workoutKeys) {
        const raw = await ctx.storage.get(key, workoutParse);
        if (raw === null) continue;
        const rec = raw as Record<string, unknown>;
        const date = typeof rec['date'] === 'string' ? rec['date'] : null;
        if (date !== null && workoutDates.has(date)) recentCount++;
      }
      if (recentCount >= HIGH_FREQUENCY_THRESHOLD) sessionTomorrow = true;
    }

    if (!sessionTomorrow) return [];

    const sleepDeficitH = round(SLEEP_THRESHOLD_H - avgSleep, 1);

    const forecast: ForecastLatest = {
      v: 1,
      id: `cross.recovery_priority.${ctx.date}.${tomorrow}`,
      generatorId: 'cross.recovery_priority',
      domain: 'cross',
      generatedAt: Date.now(),
      generatedOnDate: ctx.date,
      targetDate: tomorrow,
      horizonDays: 1,
      kind: 'recovery_priority',
      severity: 'warn',
      titleKey: 'forecast.cross.recovery_priority.title',
      detailKey: 'forecast.cross.recovery_priority.detail',
      params: {
        avgSleepH: round(avgSleep, 1),
        sleepDeficitH,
        sleepEntriesCount: recentSleep.length,
      },
      confidence: clamp01(0.5 + (SLEEP_THRESHOLD_H - avgSleep) * 0.2),
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
