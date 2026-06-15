import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { Coach } from '@/modules/coach/api';
import { analyzeSignal } from '@/modules/coach/engine/analyzer';
import type { Signal } from '@/data/schemas/coach/signal';
import type { CoachContext } from '@/modules/coach/types';
import type { RuleLatest } from '@/data/schemas/coach/rule';

const passthrough = (raw: unknown) => z.record(z.unknown()).parse(raw);
const resolver = () => passthrough;

function makeCtx(storage: MemoryStorage, date: string): CoachContext {
  return { storage, date, resolveSource: resolver, sourceCache: new Map() };
}

describe('analyzer — ratio signal', () => {
  it('computes ACWR correctly: shortAvg / longAvg', async () => {
    const storage = new MemoryStorage();
    // 7 sessions × 8 RPE on the last 7 days → shortSum=56, shortAvg=8
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(2026, 4, 10 - i));
      await storage.set(`sport.session.${i}`, {
        date: d.toISOString().slice(0, 10),
        sessionRPE: 8,
      });
    }
    // 14 sessions × 5 RPE on days 8-21 ago → longSum (28d) = 56 + 14*5 = 126, longAvg = 4.5
    for (let i = 7; i < 21; i++) {
      const d = new Date(Date.UTC(2026, 4, 10 - i));
      await storage.set(`sport.session.${i}`, {
        date: d.toISOString().slice(0, 10),
        sessionRPE: 5,
      });
    }
    const signal: Signal = {
      type: 'ratio', source: 'sport.session', field: 'sessionRPE',
      window: { days: 7 }, ratioWindow: { days: 28 },
    };
    const r = await analyzeSignal(signal, makeCtx(storage, '2026-05-10'));
    // shortAvg = 56/7 = 8 ; longAvg = 126/28 = 4.5 → ratio ≈ 1.777
    expect(r).toBeCloseTo(8 / 4.5, 3);
  });

  it('returns 0 when long-window sum is 0 (division by zero guard)', async () => {
    const storage = new MemoryStorage();
    const signal: Signal = {
      type: 'ratio', source: 'sport.session', field: 'sessionRPE',
      window: { days: 7 }, ratioWindow: { days: 28 },
    };
    const r = await analyzeSignal(signal, makeCtx(storage, '2026-05-10'));
    expect(r).toBe(0);
  });

  it('throws when ratioWindow is missing', async () => {
    const storage = new MemoryStorage();
    const signal: Signal = {
      type: 'ratio', source: 'sport.session', field: 'sessionRPE',
      window: { days: 7 },
    };
    await expect(analyzeSignal(signal, makeCtx(storage, '2026-05-10'))).rejects.toThrow(/ratioWindow/);
  });
});

describe('analyzer — avgDaily signal', () => {
  it('divides by window.days, not by record count (per-day mean)', async () => {
    const storage = new MemoryStorage();
    // 4 meals over 2 days, total 1000 kcal → avgDaily = 1000/2 = 500 (avg would be 250)
    await storage.set('nutrition.meal.1', { date: '2026-05-10', kcal: 300 });
    await storage.set('nutrition.meal.2', { date: '2026-05-10', kcal: 200 });
    await storage.set('nutrition.meal.3', { date: '2026-05-09', kcal: 250 });
    await storage.set('nutrition.meal.4', { date: '2026-05-09', kcal: 250 });
    const signal: Signal = {
      type: 'avgDaily', source: 'nutrition.meal', field: 'kcal', window: { days: 2 },
    };
    const r = await analyzeSignal(signal, makeCtx(storage, '2026-05-10'));
    expect(r).toBe(500);
  });

  it('returns 0 when no records in window', async () => {
    const storage = new MemoryStorage();
    const signal: Signal = {
      type: 'avgDaily', source: 'nutrition.meal', field: 'kcal', window: { days: 7 },
    };
    const r = await analyzeSignal(signal, makeCtx(storage, '2026-05-10'));
    expect(r).toBe(0);
  });
});

describe('Coach.run — nutrition.deficit_agressif (avgDaily)', () => {
  it('does NOT trigger on a normal daily intake split across many meals', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    // 7 days × 5 meals × ~430 kcal ≈ 2150 kcal/day → avgDaily ≈ 2150, well above 1200
    for (let d = 0; d < 7; d++) {
      const date = new Date(Date.UTC(2026, 4, 10 - d)).toISOString().slice(0, 10);
      for (let m = 0; m < 5; m++) {
        await storage.set(`nutrition.meal.${date}.${m}`, { date, kcal: 430 });
      }
    }
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.deficit_agressif');
    expect(r?.signalValue).toBeCloseTo(2150, 0);
    expect(r?.triggered).toBe(false);
  });

  it('triggers when the true daily average is below 1200 kcal', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    // 7 days × 2 meals × 400 kcal = 800 kcal/day → avgDaily = 800 < 1200
    for (let d = 0; d < 7; d++) {
      const date = new Date(Date.UTC(2026, 4, 10 - d)).toISOString().slice(0, 10);
      for (let m = 0; m < 2; m++) {
        await storage.set(`nutrition.meal.${date}.${m}`, { date, kcal: 400 });
      }
    }
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.deficit_agressif');
    expect(r?.signalValue).toBeCloseTo(800, 0);
    expect(r?.triggered).toBe(true);
  });
});

describe('Coach.run — sport.acwr_danger', () => {
  it('triggers when ACWR > 1.5', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    // Heavy spike on last 7 days, light load before
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(2026, 4, 10 - i));
      await storage.set(`sport.session.${i}`, {
        date: d.toISOString().slice(0, 10), sessionRPE: 10,
      });
    }
    for (let i = 7; i < 28; i++) {
      const d = new Date(Date.UTC(2026, 4, 10 - i));
      await storage.set(`sport.session.${i}`, {
        date: d.toISOString().slice(0, 10), sessionRPE: 3,
      });
    }
    const a = await coach.run('sport', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'sport.acwr_danger');
    expect(r?.triggered).toBe(true);
    expect(r?.signalValue).toBeGreaterThan(1.5);
  });

  it('does not trigger when ACWR is in safe zone', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    for (let i = 0; i < 28; i++) {
      const d = new Date(Date.UTC(2026, 4, 10 - i));
      await storage.set(`sport.session.${i}`, {
        date: d.toISOString().slice(0, 10), sessionRPE: 7,
      });
    }
    const a = await coach.run('sport', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'sport.acwr_danger');
    expect(r?.triggered).toBe(false);
    expect(r?.signalValue).toBeCloseTo(1, 1);
  });
});

describe('Coach.run — sport.insufficient_rest_48h', () => {
  it('triggers when > 2 sessions in 2 days', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    await storage.set('sport.session.1', { date: '2026-05-10', sessionRPE: 7 });
    await storage.set('sport.session.2', { date: '2026-05-10', sessionRPE: 7 });
    await storage.set('sport.session.3', { date: '2026-05-09', sessionRPE: 7 });
    const a = await coach.run('sport', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'sport.insufficient_rest_48h');
    expect(r?.triggered).toBe(true);
    expect(r?.signalValue).toBe(3);
  });

  it('does not trigger with 2 sessions in 2 days', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    await storage.set('sport.session.1', { date: '2026-05-10', sessionRPE: 7 });
    await storage.set('sport.session.2', { date: '2026-05-09', sessionRPE: 7 });
    const a = await coach.run('sport', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'sport.insufficient_rest_48h');
    expect(r?.triggered).toBe(false);
    expect(r?.signalValue).toBe(2);
  });
});

describe('Coach with ratio rule via custom rules', () => {
  it('runs a ratio-based custom rule end-to-end', async () => {
    const storage = new MemoryStorage();
    const customRule: RuleLatest = {
      v: 1,
      id: 'custom.ratio.test',
      domain: 'sport',
      name: 'ratio-test',
      signals: [{ type: 'ratio', source: 'sport.session', field: 'sessionRPE', window: { days: 1 }, ratioWindow: { days: 7 } }],
      condition: { op: 'gt', value: 2 },
      signalIndex: 0,
      severity: 'warn',
      adviceKey: 'coach.test',
      enabled: true,
    };
    const coach = new Coach({ storage, rules: [customRule], resolveSource: resolver });
    // 1 session today with RPE 10, 1 session 4 days ago RPE 2
    await storage.set('sport.session.1', { date: '2026-05-10', sessionRPE: 10 });
    await storage.set('sport.session.2', { date: '2026-05-06', sessionRPE: 2 });
    const a = await coach.run('sport', '2026-05-10');
    // shortAvg = 10/1 = 10, longAvg = (10+2)/7 ≈ 1.71 → ratio ≈ 5.83
    expect(a.ruleResults[0]?.triggered).toBe(true);
    expect(a.ruleResults[0]?.signalValue).toBeGreaterThan(2);
  });
});
