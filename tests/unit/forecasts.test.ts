import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import type { CoachContext } from '@/modules/coach/types';
import { sportDeloadPredicted } from '@/modules/coach/forecasts/sport.deload_predicted';
import { sportNextPlannedSession } from '@/modules/coach/forecasts/sport.next_planned_session';
import { anthropoNextBiweekly } from '@/modules/coach/forecasts/anthropo.next_biweekly';
import { anthropoNextQuarterly } from '@/modules/coach/forecasts/anthropo.next_quarterly';
import { nutritionRefeedWindow } from '@/modules/coach/forecasts/nutrition.refeed_window';
import { crossRecoveryPriority } from '@/modules/coach/forecasts/cross.recovery_priority';

const passthrough = (raw: unknown) => z.record(z.unknown()).parse(raw);
const resolver = () => passthrough;

function makeCtx(storage: MemoryStorage, date: string): CoachContext {
  return { storage, date, resolveSource: resolver };
}

function dateMinusDays(anchor: string, n: number): string {
  const d = new Date(anchor + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── sport.deload_predicted ──────────────────────────────────────────────────

describe('forecast — sport.deload_predicted', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('emits a deload forecast when RPE trends upward over 3 weeks', async () => {
    const today = '2026-05-21';
    // 9 sessions over 21 days with RPE rising from 6 to 9 (strong upward trend)
    const rpes = [6, 6.5, 7, 7, 7.5, 8, 8.5, 9, 9];
    for (let i = 0; i < rpes.length; i++) {
      const d = dateMinusDays(today, 20 - i * 2);
      await storage.set(`sport.workoutLog.${i}`, {
        date: d,
        sessionRPE: rpes[i],
      });
    }
    const out = await sportDeloadPredicted.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.kind).toBe('deload');
    expect(out[0]!.severity).toBe('warn');
    expect(out[0]!.targetDate > today).toBe(true);
    expect(out[0]!.confidence).toBeGreaterThan(0.5);
    expect(out[0]!.source).toContain('doi.org');
  });

  it('does not emit when RPE is stable and low', async () => {
    const today = '2026-05-21';
    for (let i = 0; i < 9; i++) {
      const d = dateMinusDays(today, 20 - i * 2);
      await storage.set(`sport.workoutLog.${i}`, { date: d, sessionRPE: 7 });
    }
    const out = await sportDeloadPredicted.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });

  it('does not emit when too few sessions to project (<6)', async () => {
    const today = '2026-05-21';
    for (let i = 0; i < 4; i++) {
      const d = dateMinusDays(today, 5 - i);
      await storage.set(`sport.workoutLog.${i}`, { date: d, sessionRPE: 9 });
    }
    const out = await sportDeloadPredicted.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });

  it('does not emit when last-week avg RPE is below 8 (even with positive slope)', async () => {
    const today = '2026-05-21';
    const rpes = [5, 5.2, 5.4, 5.6, 5.8, 6, 6.2, 6.5];
    for (let i = 0; i < rpes.length; i++) {
      const d = dateMinusDays(today, 20 - i * 2);
      await storage.set(`sport.workoutLog.${i}`, { date: d, sessionRPE: rpes[i] });
    }
    const out = await sportDeloadPredicted.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });

  it('targetDate falls on a Monday', async () => {
    const today = '2026-05-21'; // Thursday
    const rpes = [7, 7.5, 8, 8, 8.5, 9, 9, 9, 9];
    for (let i = 0; i < rpes.length; i++) {
      const d = dateMinusDays(today, 20 - i * 2);
      await storage.set(`sport.workoutLog.${i}`, { date: d, sessionRPE: rpes[i] });
    }
    const out = await sportDeloadPredicted.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    const target = new Date(out[0]!.targetDate + 'T00:00:00Z');
    expect(target.getUTCDay()).toBe(1); // Monday
  });
});

// ─── anthropo.next_biweekly ─────────────────────────────────────────────────

describe('forecast — anthropo.next_biweekly', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('emits onboarding forecast (T+7) when no measurement exists', async () => {
    const today = '2026-05-21';
    const out = await anthropoNextBiweekly.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.severity).toBe('info');
    expect(out[0]!.targetDate).toBe('2026-05-28');
    expect(out[0]!.horizonDays).toBe(7);
    expect(out[0]!.detailKey).toContain('onboarding');
  });

  it('emits T+14 forecast from last measurement when on schedule', async () => {
    const today = '2026-05-21';
    await storage.set('anthropo.measurement.1', { date: '2026-05-14', weight: 80 });
    const out = await anthropoNextBiweekly.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.targetDate).toBe('2026-05-28');
    expect(out[0]!.severity).toBe('info');
    expect(out[0]!.params['lastMeasurement']).toBe('2026-05-14');
  });

  it('flags overdue when last measurement >14 days ago', async () => {
    const today = '2026-05-21';
    // Last measurement 20 days ago → expected was 6 days ago → overdue
    await storage.set('anthropo.measurement.1', { date: '2026-05-01', weight: 80 });
    const out = await anthropoNextBiweekly.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.severity).toBe('warn');
    expect(out[0]!.detailKey).toContain('overdue');
    expect(out[0]!.targetDate).toBe('2026-05-22'); // tomorrow
    expect(out[0]!.params['overdueDays']).toBe(6);
  });

  it('id is deterministic across runs (idempotent)', async () => {
    const today = '2026-05-21';
    await storage.set('anthropo.measurement.1', { date: '2026-05-14', weight: 80 });
    const a = await anthropoNextBiweekly.generate(makeCtx(storage, today));
    const b = await anthropoNextBiweekly.generate(makeCtx(storage, today));
    expect(a[0]!.id).toBe(b[0]!.id);
  });
});

// ─── anthropo.next_quarterly ─────────────────────────────────────────────────

describe('forecast — anthropo.next_quarterly', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('emits onboarding forecast (T+30) when no measurement exists', async () => {
    const today = '2026-05-21';
    const out = await anthropoNextQuarterly.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.severity).toBe('info');
    expect(out[0]!.targetDate).toBe('2026-06-20');
    expect(out[0]!.horizonDays).toBe(30);
    expect(out[0]!.detailKey).toContain('onboarding');
  });

  it('emits T+90 forecast from last measurement when on schedule', async () => {
    const today = '2026-05-21';
    await storage.set('anthropo.measurement.1', { date: '2026-05-01', weight: 80 });
    const out = await anthropoNextQuarterly.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    // 2026-05-01 + 90d = 2026-07-30
    expect(out[0]!.targetDate).toBe('2026-07-30');
    expect(out[0]!.severity).toBe('info');
  });

  it('flags overdue when last measurement > 90 days ago', async () => {
    const today = '2026-05-21';
    // 100 days ago → candidate was 10 days ago → overdue
    await storage.set('anthropo.measurement.1', { date: dateMinusDays(today, 100), weight: 80 });
    const out = await anthropoNextQuarterly.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.severity).toBe('warn');
    expect(out[0]!.detailKey).toContain('overdue');
    expect(out[0]!.targetDate).toBe('2026-05-22'); // tomorrow
    expect(out[0]!.params['overdueDays']).toBe(10);
  });

  it('id is deterministic', async () => {
    const today = '2026-05-21';
    await storage.set('anthropo.measurement.1', { date: '2026-05-01', weight: 80 });
    const a = await anthropoNextQuarterly.generate(makeCtx(storage, today));
    const b = await anthropoNextQuarterly.generate(makeCtx(storage, today));
    expect(a[0]!.id).toBe(b[0]!.id);
  });
});

// ─── nutrition.refeed_window ─────────────────────────────────────────────────

describe('forecast — nutrition.refeed_window', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('emits refeed forecast after 7+ consecutive deficit days', async () => {
    const today = '2026-05-21';
    // 8 consecutive days of ~1400 kcal (below threshold)
    for (let i = 0; i < 8; i++) {
      const d = dateMinusDays(today, 8 - i);
      await storage.set(`nutrition.meal.${i}`, { date: d, kcal: 1400, p: 100, c: 150, f: 40 });
    }
    const out = await nutritionRefeedWindow.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.kind).toBe('refeed');
    expect(out[0]!.severity).toBe('warn');
    expect(out[0]!.params['consecutiveDays']).toBeGreaterThanOrEqual(7);
    expect(out[0]!.confidence).toBeGreaterThan(0.5);
    expect(out[0]!.source).toContain('doi.org');
  });

  it('does not emit when fewer than 7 deficit days', async () => {
    const today = '2026-05-21';
    for (let i = 0; i < 5; i++) {
      const d = dateMinusDays(today, 5 - i);
      await storage.set(`nutrition.meal.${i}`, { date: d, kcal: 1400, p: 100, c: 150, f: 40 });
    }
    const out = await nutritionRefeedWindow.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });

  it('does not emit when daily kcal is above deficit threshold', async () => {
    const today = '2026-05-21';
    for (let i = 0; i < 9; i++) {
      const d = dateMinusDays(today, 9 - i);
      await storage.set(`nutrition.meal.${i}`, { date: d, kcal: 2200, p: 150, c: 200, f: 70 });
    }
    const out = await nutritionRefeedWindow.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });

  it('resets streak on a non-deficit day and does not emit', async () => {
    const today = '2026-05-21';
    // 4 deficit, 1 normal, 4 deficit = streak resets to 4
    for (let i = 0; i < 4; i++) {
      await storage.set(`nutrition.meal.a${i}`, { date: dateMinusDays(today, 9 - i), kcal: 1400, p: 100, c: 150, f: 40 });
    }
    // normal day
    await storage.set('nutrition.meal.normal', { date: dateMinusDays(today, 5), kcal: 2200, p: 150, c: 250, f: 70 });
    for (let i = 0; i < 4; i++) {
      await storage.set(`nutrition.meal.b${i}`, { date: dateMinusDays(today, 4 - i), kcal: 1400, p: 100, c: 150, f: 40 });
    }
    const out = await nutritionRefeedWindow.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });
});

// ─── cross.recovery_priority ─────────────────────────────────────────────────

describe('forecast — cross.recovery_priority', () => {
  let storage: MemoryStorage;
  const today = '2026-05-21'; // Thursday

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('emits when avg sleep < 6.5h and routine assigns tomorrow (Friday=5)', async () => {
    // Friday = DOW 5
    const tomorrow = '2026-05-22';
    await storage.set('sleep.entry.1', { date: dateMinusDays(today, 2), durationH: 5.5, quality: 3 });
    await storage.set('sleep.entry.2', { date: dateMinusDays(today, 1), durationH: 6.0, quality: 3 });
    await storage.set('sleep.entry.3', { date: today, durationH: 5.0, quality: 2 });
    // Routine with assignedDays=[5] (Friday)
    await storage.set('sport.routine.1', { name: 'Push', assignedDays: [5] });

    const out = await crossRecoveryPriority.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.kind).toBe('recovery_priority');
    expect(out[0]!.severity).toBe('warn');
    expect(out[0]!.targetDate).toBe(tomorrow);
    expect(out[0]!.params['avgSleepH']).toBeLessThan(6.5);
    expect(out[0]!.source).toContain('doi.org');
  });

  it('does not emit when avg sleep >= 6.5h', async () => {
    await storage.set('sleep.entry.1', { date: dateMinusDays(today, 2), durationH: 7.0, quality: 4 });
    await storage.set('sleep.entry.2', { date: dateMinusDays(today, 1), durationH: 7.5, quality: 4 });
    await storage.set('sleep.entry.3', { date: today, durationH: 7.0, quality: 4 });
    await storage.set('sport.routine.1', { name: 'Push', assignedDays: [5] });

    const out = await crossRecoveryPriority.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });

  it('does not emit when sleep is low but no session tomorrow', async () => {
    await storage.set('sleep.entry.1', { date: dateMinusDays(today, 2), durationH: 5.0, quality: 2 });
    await storage.set('sleep.entry.2', { date: dateMinusDays(today, 1), durationH: 5.5, quality: 2 });
    await storage.set('sleep.entry.3', { date: today, durationH: 5.0, quality: 2 });
    // Routine with Saturday and Sunday — not tomorrow (Friday)
    await storage.set('sport.routine.1', { name: 'Push', assignedDays: [6, 0] });

    const out = await crossRecoveryPriority.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });

  it('does not emit when fewer than 2 sleep entries', async () => {
    await storage.set('sleep.entry.1', { date: today, durationH: 4.0, quality: 1 });
    await storage.set('sport.routine.1', { name: 'Push', assignedDays: [5] });

    const out = await crossRecoveryPriority.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });
});

// ─── sport.next_planned_session ──────────────────────────────────────────────

describe('forecast — sport.next_planned_session', () => {
  let storage: MemoryStorage;
  const today = '2026-05-21'; // Thursday (DOW=4)

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('emits next session date matching routine assignedDays', async () => {
    // Monday (1) and Thursday (4) → next is Friday? No: today is Thursday, so tomorrow is Friday (5)
    // next assignedDay after Thursday: Monday (1) is next week
    await storage.set('sport.routine.1', { name: 'Push', assignedDays: [1, 4] }); // Mon + Thu
    const out = await sportNextPlannedSession.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.kind).toBe('planned_session');
    expect(out[0]!.severity).toBe('info');
    // Next Monday after 2026-05-21 (Thursday) = 2026-05-25
    expect(out[0]!.targetDate).toBe('2026-05-25');
    expect(out[0]!.confidence).toBe(0.9);
  });

  it('falls back to frequency inference when no assignedDays', async () => {
    // 4 sessions over 8 days (every 2 days)
    for (let i = 0; i < 4; i++) {
      await storage.set(`sport.workoutLog.${i}`, { date: dateMinusDays(today, 8 - i * 2), sessionRPE: 7 });
    }
    const out = await sportNextPlannedSession.generate(makeCtx(storage, today));
    expect(out.length).toBe(1);
    expect(out[0]!.params['method']).toBe('frequency');
    expect(out[0]!.targetDate > today).toBe(true);
  });

  it('does not emit when no routines and insufficient session history', async () => {
    const out = await sportNextPlannedSession.generate(makeCtx(storage, today));
    expect(out).toEqual([]);
  });

  it('id is deterministic', async () => {
    await storage.set('sport.routine.1', { name: 'A', assignedDays: [1] });
    const a = await sportNextPlannedSession.generate(makeCtx(storage, today));
    const b = await sportNextPlannedSession.generate(makeCtx(storage, today));
    if (a.length > 0) {
      expect(a[0]!.id).toBe(b[0]!.id);
    }
  });
});
