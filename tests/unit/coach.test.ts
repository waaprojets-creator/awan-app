import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { Coach } from '@/modules/coach/api';
import { loadDefaultRules } from '@/modules/coach/rulesLoader';
import { matchesCondition } from '@/modules/coach/engine/scorer';
import { rangeBack } from '@/modules/coach/engine/dateRange';
import type { RuleLatest } from '@/data/schemas/coach/rule';
import { eventBus } from '@/data/events/bus';

const passthrough = (raw: unknown) => z.record(z.unknown()).parse(raw);
const resolver = () => passthrough;

describe('rulesLoader', () => {
  it('loads all bundled rules through the migrator', () => {
    const rules = loadDefaultRules();
    expect(rules).toHaveLength(26);
    for (const r of rules) expect(r.v).toBe(1);
    const ids = rules.map((r) => r.id);
    expect(ids).toContain('sport.no_workout_7d');
    expect(ids).toContain('sport.low_recovery');
    expect(ids).toContain('sport.deload_due');
    expect(ids).toContain('nutrition.fat_low');
    expect(ids).toContain('anthropo.wht_elevated');
    expect(ids).toContain('cross.sleep_workout');
    expect(ids).toContain('sport.acwr_danger');
    expect(ids).toContain('sport.insufficient_rest_48h');
    expect(ids).toContain('nutrition.fiber_low');
    expect(ids).toContain('nutrition.periworkout_protein');
  });
});

describe('matchesCondition', () => {
  it('handles all operators', () => {
    expect(matchesCondition(5, { op: 'lt', value: 10 })).toBe(true);
    expect(matchesCondition(5, { op: 'gt', value: 10 })).toBe(false);
    expect(matchesCondition(5, { op: 'eq', value: 5 })).toBe(true);
    expect(matchesCondition(5, { op: 'between', min: 0, max: 10 })).toBe(true);
    expect(matchesCondition(15, { op: 'between', min: 0, max: 10 })).toBe(false);
  });
});

describe('rangeBack', () => {
  it('produces N consecutive dates ending at the anchor', () => {
    const r = rangeBack('2026-05-10', 3);
    expect(r).toEqual(['2026-05-10', '2026-05-09', '2026-05-08']);
  });
});

describe('Coach.run — sport.no_workout_7d', () => {
  let storage: MemoryStorage;
  let coach: Coach;

  beforeEach(() => {
    storage = new MemoryStorage();
    coach = new Coach({ storage, resolveSource: resolver });
    eventBus.clear();
  });

  it('triggers when no workouts in last 7 days', async () => {
    const a = await coach.run('sport', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'sport.no_workout_7d');
    expect(r?.triggered).toBe(true);
    expect(r?.signalValue).toBe(0);
    expect(a.advices.find((x) => x.ruleId === 'sport.no_workout_7d')).toBeDefined();
  });

  it('does not trigger when there is a workout', async () => {
    await storage.set('sport.session.abc', {
      date: '2026-05-08', sessionRPE: 7,
    });
    const a = await coach.run('sport', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'sport.no_workout_7d');
    expect(r?.triggered).toBe(false);
    expect(r?.signalValue).toBe(1);
  });
});

describe('Coach.run — sport.low_recovery', () => {
  let storage: MemoryStorage;
  let coach: Coach;

  beforeEach(() => {
    storage = new MemoryStorage();
    coach = new Coach({ storage, resolveSource: resolver });
    eventBus.clear();
  });

  it('triggers when latest recoveryScore < 6', async () => {
    await storage.set('sport.session.1', {
      date: '2026-05-10', recoveryScore: 4,
    });
    const a = await coach.run('sport', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'sport.low_recovery');
    expect(r?.triggered).toBe(true);
    expect(r?.signalValue).toBe(4);
  });

  it('does not trigger when recoveryScore >= 6', async () => {
    await storage.set('sport.session.1', {
      date: '2026-05-10', recoveryScore: 8,
    });
    const a = await coach.run('sport', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'sport.low_recovery');
    expect(r?.triggered).toBe(false);
    expect(r?.signalValue).toBe(8);
  });
});

describe('Coach.run — nutrition.protein_low', () => {
  let storage: MemoryStorage;
  let coach: Coach;

  beforeEach(() => {
    storage = new MemoryStorage();
    coach = new Coach({ storage, resolveSource: resolver });
  });

  it('triggers when protein sum (field p) < 131 g', async () => {
    await storage.set('nutrition.meal.1', { date: '2026-05-10', p: 30 });
    await storage.set('nutrition.meal.2', { date: '2026-05-10', p: 25 });
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.protein_low');
    expect(r?.signalValue).toBe(55);
    expect(r?.triggered).toBe(true);
  });

  it('does not trigger when protein sum (field p) >= 131 g', async () => {
    await storage.set('nutrition.meal.1', { date: '2026-05-10', p: 70 });
    await storage.set('nutrition.meal.2', { date: '2026-05-10', p: 80 });
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.protein_low');
    expect(r?.signalValue).toBe(150);
    expect(r?.triggered).toBe(false);
  });
});

describe('Coach.run — nutrition.fat_low', () => {
  let storage: MemoryStorage;
  let coach: Coach;

  beforeEach(() => {
    storage = new MemoryStorage();
    coach = new Coach({ storage, resolveSource: resolver });
  });

  it('triggers when fat sum < 74 g', async () => {
    await storage.set('nutrition.meal.1', { date: '2026-05-10', f: 20 });
    await storage.set('nutrition.meal.2', { date: '2026-05-10', f: 30 });
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.fat_low');
    expect(r?.signalValue).toBe(50);
    expect(r?.triggered).toBe(true);
  });

  it('does not trigger when fat sum >= 74 g', async () => {
    await storage.set('nutrition.meal.1', { date: '2026-05-10', f: 40 });
    await storage.set('nutrition.meal.2', { date: '2026-05-10', f: 40 });
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.fat_low');
    expect(r?.signalValue).toBe(80);
    expect(r?.triggered).toBe(false);
  });
});

describe('Coach.run — anthropo.weight_gain_trend', () => {
  it('detects positive trend in the weight.entry series (field: weight)', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    // Weight lives in weight.entry.* (not anthropo.measurement, which dropped weight in V2)
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.UTC(2026, 4, 10 - i)).toISOString().slice(0, 10);
      await storage.set(`weight.entry.${d}`, {
        date: d,
        weight: 80 - i * 0.2, // slope ~0.2/day > threshold 0.15
      });
    }
    const a = await coach.run('anthropo', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'anthropo.weight_gain_trend');
    expect(r?.triggered).toBe(true);
    expect(r?.signalValue).toBeGreaterThan(0.15);
  });
});

describe('Coach assessment persistence', () => {
  it('stores and reads back the assessment via getAssessment', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    const written = await coach.run('sport', '2026-05-10');
    const read = await coach.getAssessment('2026-05-10', 'sport');
    expect(read?.id).toBe(written.id);
    expect(read?.domain).toBe('sport');
  });
});

describe('Coach EventBus subscription', () => {
  it('emits coach.assessment.ready after run', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    eventBus.clear();

    let received: { domain: string; date: string } | null = null;
    eventBus.on('coach.assessment.ready', (p) => { received = p; });

    await coach.run('sport', '2026-05-10');
    expect(received).toEqual({ domain: 'sport', date: '2026-05-10' });
    eventBus.clear();
  });

  it('reacts to workout.completed when subscribed', async () => {
    const storage = new MemoryStorage();
    const coach = new Coach({ storage, resolveSource: resolver });
    eventBus.clear();
    const off = coach.subscribe();

    eventBus.emit('workout.completed', { workoutId: 'x', date: '2026-05-10' });
    await new Promise((r) => setTimeout(r, 0));

    const stored = await coach.getAssessment('2026-05-10', 'sport');
    expect(stored).not.toBeNull();
    off();
    eventBus.clear();
  });
});

describe('Coach with custom rules', () => {
  it('runs only the rules passed in', async () => {
    const storage = new MemoryStorage();
    const customRule: RuleLatest = {
      v: 1,
      id: 'custom.test',
      domain: 'sport',
      name: 'always-trigger',
      signals: [{ type: 'count', source: 'sport.workoutLog', window: { days: 1 } }],
      condition: { op: 'eq', value: 0 },
      signalIndex: 0,
      severity: 'info',
      adviceKey: 'coach.test',
      enabled: true,
    };
    const coach = new Coach({ storage, rules: [customRule], resolveSource: resolver });
    const a = await coach.run('sport', '2026-05-10');
    expect(a.ruleResults).toHaveLength(1);
    expect(a.ruleResults[0]?.ruleId).toBe('custom.test');
    expect(a.ruleResults[0]?.triggered).toBe(true);
  });
});
