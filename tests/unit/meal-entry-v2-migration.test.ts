import { describe, it, expect } from 'vitest';
import {
  migrateMealEntry,
  type MealEntryV1,
  type MealEntryV2,
} from '../../src/data/schemas/nutrition/mealEntry';

const BASE_FIELDS = {
  id: '00000000-0000-0000-0000-000000000001' as const,
  date: '2026-01-01',
  name: 'Test meal',
  kcal: 400,
  p: 30,
  c: 40,
  f: 12,
  timestamp: 1700000000000,
  source: 'db' as const,
};

function makeV1(meal?: MealEntryV1['meal']): MealEntryV1 {
  return meal
    ? { v: 1, ...BASE_FIELDS, meal }
    : { v: 1, ...BASE_FIELDS };
}

describe('migrateMealEntry: V1 → V2 slot mapping', () => {
  it('V1 with meal=suhoor → V2 with mealSlot=1', () => {
    const result = migrateMealEntry(makeV1('suhoor'));
    expect(result.v).toBe(2);
    expect(result.mealSlot).toBe(1);
  });

  it('V1 with meal=dejeuner → V2 with mealSlot=2', () => {
    const result = migrateMealEntry(makeV1('dejeuner'));
    expect(result.v).toBe(2);
    expect(result.mealSlot).toBe(2);
  });

  it('V1 with meal=diner → V2 with mealSlot=3', () => {
    const result = migrateMealEntry(makeV1('diner'));
    expect(result.v).toBe(2);
    expect(result.mealSlot).toBe(3);
  });

  it('V1 with meal=collation → V2 with mealSlot=4', () => {
    const result = migrateMealEntry(makeV1('collation'));
    expect(result.v).toBe(2);
    expect(result.mealSlot).toBe(4);
  });

  it('V1 without meal field → V2 with mealSlot=5 (default)', () => {
    const result = migrateMealEntry(makeV1());
    expect(result.v).toBe(2);
    expect(result.mealSlot).toBe(5);
  });

  it('original nutrition fields are preserved through migration', () => {
    const result = migrateMealEntry(makeV1('dejeuner'));
    expect(result.id).toBe(BASE_FIELDS.id);
    expect(result.date).toBe('2026-01-01');
    expect(result.kcal).toBe(400);
    expect(result.p).toBe(30);
    expect(result.c).toBe(40);
    expect(result.f).toBe(12);
    expect(result.source).toBe('db');
  });

  it('V1 mealLabel is set to the meal type name', () => {
    const result = migrateMealEntry(makeV1('suhoor'));
    expect(result.mealLabel).toBe('suhoor');
  });

  it('V1 without meal → mealLabel is undefined', () => {
    const result = migrateMealEntry(makeV1());
    expect(result.mealLabel).toBeUndefined();
  });
});

describe('migrateMealEntry: V2 passthrough', () => {
  it('V2 input passes through unchanged with existing mealSlot', () => {
    const v2: MealEntryV2 = {
      v: 2,
      ...BASE_FIELDS,
      mealSlot: 3,
    };
    const result = migrateMealEntry(v2);
    expect(result.v).toBe(2);
    expect(result.mealSlot).toBe(3);
  });

  it('V2 with mealSlot=5 is preserved', () => {
    const v2: MealEntryV2 = {
      v: 2,
      ...BASE_FIELDS,
      mealSlot: 5,
    };
    const result = migrateMealEntry(v2);
    expect(result.mealSlot).toBe(5);
  });

  it('V2 optional fields (mealLabel, items, nutritionScore) are preserved', () => {
    const v2: MealEntryV2 = {
      v: 2,
      ...BASE_FIELDS,
      mealSlot: 2,
      mealLabel: 'Pré-séance',
      nutritionScore: 72,
    };
    const result = migrateMealEntry(v2);
    expect(result.mealLabel).toBe('Pré-séance');
    expect(result.nutritionScore).toBe(72);
  });
});
