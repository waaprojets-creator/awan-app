import { describe, it, expect } from 'vitest';
import { scoreMeal } from '../../src/services/nutritionScoreService';
import type { MealEntryLatest } from '../../src/data/schemas/nutrition/mealEntry';

const BASE_TARGETS = { kcal: 2000, p: 150, c: 200, f: 67 };

function makeMeal(overrides: Partial<MealEntryLatest>): MealEntryLatest {
  return {
    v: 2,
    id: '00000000-0000-0000-0000-000000000001',
    date: '2026-01-01',
    name: 'Test meal',
    kcal: 500,
    p: 40,
    c: 50,
    f: 15,
    timestamp: 1700000000000,
    source: 'db',
    mealSlot: 1,
    ...overrides,
  };
}

describe('scoreMeal', () => {
  it('high protein dense meal → proteinDensity > 15', () => {
    // 50g protein / 400kcal = 12.5g/100kcal → score 20*(12.5/10)=20 capped at 20
    const meal = makeMeal({ kcal: 400, p: 50, c: 20, f: 10 });
    const result = scoreMeal(meal, BASE_TARGETS);
    expect(result.proteinDensity).toBeGreaterThan(15);
  });

  it('zero fiber → fiberDensity = 0', () => {
    const meal = makeMeal({ fiberG: 0 });
    const result = scoreMeal(meal, BASE_TARGETS);
    expect(result.fiberDensity).toBe(0);
  });

  it('meal with no fiberG field → fiberDensity = 0', () => {
    const meal = makeMeal({ fiberG: undefined });
    const result = scoreMeal(meal, BASE_TARGETS);
    expect(result.fiberDensity).toBe(0);
  });

  it('source db → sourceQuality = 10', () => {
    const meal = makeMeal({ source: 'db' });
    const result = scoreMeal(meal, BASE_TARGETS);
    expect(result.sourceQuality).toBe(10);
  });

  it('source manual → sourceQuality = 5', () => {
    const meal = makeMeal({ source: 'manual' });
    const result = scoreMeal(meal, BASE_TARGETS);
    expect(result.sourceQuality).toBe(5);
  });

  it('source custom → sourceQuality = 8', () => {
    const meal = makeMeal({ source: 'custom' });
    const result = scoreMeal(meal, BASE_TARGETS);
    expect(result.sourceQuality).toBe(8);
  });

  it('total is always between 0 and 100', () => {
    const meals = [
      makeMeal({ kcal: 100, p: 1, c: 5, f: 5, source: 'manual' }),
      makeMeal({ kcal: 600, p: 60, c: 60, f: 20, fiberG: 10, source: 'db' }),
      makeMeal({ kcal: 800, p: 100, c: 80, f: 15, fiberG: 20, source: 'db' }),
    ];
    for (const meal of meals) {
      const result = scoreMeal(meal, BASE_TARGETS);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
    }
  });

  it('empty meal (kcal=0) → all zeros', () => {
    const meal = makeMeal({ kcal: 0 });
    const result = scoreMeal(meal, BASE_TARGETS);
    expect(result.total).toBe(0);
    expect(result.quantity).toBe(0);
    expect(result.proteinDensity).toBe(0);
    expect(result.fiberDensity).toBe(0);
    expect(result.fatQuality).toBe(0);
    expect(result.sourceQuality).toBe(0);
  });

  it('zero dailyTargets kcal → all zeros', () => {
    const meal = makeMeal({ kcal: 500 });
    const result = scoreMeal(meal, { kcal: 0, p: 150, c: 200, f: 67 });
    expect(result.total).toBe(0);
    expect(result.quantity).toBe(0);
  });

  it('high fiber meal → fiberDensity > 0', () => {
    // 20g fiber / 400kcal = 5g/100kcal → score = 20 * min(1, 5/4) = 20
    const meal = makeMeal({ kcal: 400, fiberG: 20 });
    const result = scoreMeal(meal, BASE_TARGETS);
    expect(result.fiberDensity).toBeGreaterThan(0);
  });
});
