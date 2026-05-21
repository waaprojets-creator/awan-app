import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import type { CoachContext } from '@/modules/coach/types';
import { sportDeloadPredicted } from '@/modules/coach/forecasts/sport.deload_predicted';
import { anthropoNextBiweekly } from '@/modules/coach/forecasts/anthropo.next_biweekly';

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
