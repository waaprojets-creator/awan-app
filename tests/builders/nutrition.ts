import { MealEntryV1Schema, type MealEntryLatest } from '@/data/schemas/nutrition/mealEntry';

export function makeMeal(overrides: Partial<MealEntryLatest> = {}): MealEntryLatest {
  return MealEntryV1Schema.parse({
    v: 1,
    id: '990e8400-e29b-41d4-a716-446655440000',
    date: '2026-05-10',
    meal: 'dejeuner',
    name: 'Test meal',
    kcal: 500,
    p: 40,
    c: 50,
    f: 18,
    ...overrides,
  });
}
