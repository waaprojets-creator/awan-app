import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { Coach } from '@/modules/coach/api';

const passthrough = (raw: unknown) => z.record(z.unknown()).parse(raw);
const resolver = () => passthrough;

describe('Coach.run — nutrition.fiber_low', () => {
  let storage: MemoryStorage;
  let coach: Coach;

  beforeEach(() => {
    storage = new MemoryStorage();
    coach = new Coach({ storage, resolveSource: resolver });
  });

  it('triggers when fiberG sum < 25 g', async () => {
    await storage.set('nutrition.meal.1', { date: '2026-05-10', fiberG: 8 });
    await storage.set('nutrition.meal.2', { date: '2026-05-10', fiberG: 10 });
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.fiber_low');
    expect(r?.triggered).toBe(true);
    expect(r?.signalValue).toBe(18);
  });

  it('does not trigger when fiberG sum >= 25 g', async () => {
    await storage.set('nutrition.meal.1', { date: '2026-05-10', fiberG: 15 });
    await storage.set('nutrition.meal.2', { date: '2026-05-10', fiberG: 15 });
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.fiber_low');
    expect(r?.triggered).toBe(false);
    expect(r?.signalValue).toBe(30);
  });

  it('triggers when no fiber entries (0 < 25)', async () => {
    await storage.set('nutrition.meal.1', { date: '2026-05-10', p: 50, c: 200, f: 60 });
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.fiber_low');
    expect(r?.triggered).toBe(true);
    expect(r?.signalValue).toBe(0);
  });
});

describe('Coach.run — nutrition.periworkout_protein', () => {
  let storage: MemoryStorage;
  let coach: Coach;

  beforeEach(() => {
    storage = new MemoryStorage();
    coach = new Coach({ storage, resolveSource: resolver });
  });

  it('is disabled by default — triggered:false and signalValue:0 regardless of data', async () => {
    await storage.set('nutrition.meal.1', { date: '2026-05-10', p: 10 });
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.periworkout_protein');
    // enabled:false → engine short-circuits, returns triggered:false, signalValue:0
    expect(r?.triggered).toBe(false);
    expect(r?.signalValue).toBe(0);
    expect(a.advices.find((x) => x.ruleId === 'nutrition.periworkout_protein')).toBeUndefined();
  });

  it('does not trigger when p sum >= 30 g (disabled rule still returns 0)', async () => {
    await storage.set('nutrition.meal.1', { date: '2026-05-10', p: 20 });
    await storage.set('nutrition.meal.2', { date: '2026-05-10', p: 20 });
    const a = await coach.run('nutrition', '2026-05-10');
    const r = a.ruleResults.find((x) => x.ruleId === 'nutrition.periworkout_protein');
    expect(r?.triggered).toBe(false);
    expect(r?.signalValue).toBe(0);
  });
});
