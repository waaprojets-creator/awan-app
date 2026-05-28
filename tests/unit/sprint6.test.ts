import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../../src/data/storage/MemoryStorage';
import { _setStorageForTest } from '../../src/data/storage/storageService';
import { MealService } from '../../src/services/mealService';
import { MeasurementService } from '../../src/services/measurementService';
import type { MealEntryLatest } from '../../src/data/schemas/nutrition/mealEntry';
import type { MeasurementLatest } from '../../src/data/schemas/anthropo/measurement';

const makeMeal = (id: string, date: string, kcal = 400): MealEntryLatest => ({
  v: 1,
  id,
  date,
  name: 'Poulet rôti',
  kcal,
  p: 35,
  c: 5,
  f: 12,
  timestamp: Date.now(),
  source: 'quick',
});

const makeMeasure = (date: string): MeasurementLatest => ({
  v: 1,
  id: '880e8400-e29b-41d4-a716-446655440000',
  date,
  weight: 82.5,
  bpm_rest: 62,
  body_fat_pct: 14.5,
  measurements: { waist: 82, hips: 95 },
  skinfolds: { chest: 10, abdomen: 18, thigh: 14 },
  savedAt: Date.now(),
});

// ── MealService ───────────────────────────────────────────────────────────────

describe('MealService', () => {
  beforeEach(() => _setStorageForTest(new MemoryStorage()));

  it('sauvegarde et récupère des repas par date', async () => {
    await MealService.save(makeMeal('990e8400-e29b-41d4-a716-446655440001', '2026-05-10'));
    await MealService.save(makeMeal('990e8400-e29b-41d4-a716-446655440002', '2026-05-10'));
    await MealService.save(makeMeal('990e8400-e29b-41d4-a716-446655440003', '2026-05-11'));
    const today = await MealService.getByDate('2026-05-10');
    expect(today).toHaveLength(2);
  });

  it('n\'inclut pas les repas d\'une autre date', async () => {
    await MealService.save(makeMeal('990e8400-e29b-41d4-a716-446655440004', '2026-05-09'));
    const today = await MealService.getByDate('2026-05-10');
    expect(today).toHaveLength(0);
  });

  it('supprime un repas', async () => {
    const id = '990e8400-e29b-41d4-a716-446655440005';
    await MealService.save(makeMeal(id, '2026-05-10'));
    await MealService.delete(id);
    expect(await MealService.getByDate('2026-05-10')).toHaveLength(0);
  });

  it('calcule les totaux correctement', () => {
    const meals = [
      makeMeal('a', '2026-05-10', 400),
      makeMeal('b', '2026-05-10', 200),
    ];
    const totals = MealService.totals(meals);
    expect(totals.kcal).toBe(600);
    expect(totals.p).toBe(70);  // 35+35
  });

  it('retourne totaux à zéro pour liste vide', () => {
    expect(MealService.totals([])).toEqual({ kcal: 0, p: 0, c: 0, f: 0, fiberG: 0 });
  });
});

// ── MeasurementService ────────────────────────────────────────────────────────

describe('MeasurementService', () => {
  beforeEach(() => _setStorageForTest(new MemoryStorage()));

  it('sauvegarde et récupère par date', async () => {
    await MeasurementService.save(makeMeasure('2026-05-10'));
    const entry = await MeasurementService.getByDate('2026-05-10');
    // weight est retiré en V2 (stocké dans WeightEntry séparément)
    expect((entry as any)?.weight).toBeUndefined();
    expect(entry?.body_fat_pct).toBe(14.5);
  });

  it('retourne null si aucune mesure pour cette date', async () => {
    const entry = await MeasurementService.getByDate('2026-01-01');
    expect(entry).toBeNull();
  });

  it('écrase l\'entrée du même jour (un enregistrement par jour)', async () => {
    await MeasurementService.save(makeMeasure('2026-05-10'));
    await MeasurementService.save({ ...makeMeasure('2026-05-10'), bpm_rest: 65 });
    const all = await MeasurementService.getAll();
    expect(all).toHaveLength(1);
    // bpm_rest mis à jour, weight absent (V2)
    expect(all[0].bpm_rest).toBe(65);
  });

  it('getAll retourne l\'historique trié par date', async () => {
    await MeasurementService.save({ ...makeMeasure('2026-05-10'), weight: 82.5 });
    await MeasurementService.save({ ...makeMeasure('2026-04-01'), weight: 83.0 });
    await MeasurementService.save({ ...makeMeasure('2026-03-15'), weight: 84.0 });
    const all = await MeasurementService.getAll();
    expect(all[0].date).toBe('2026-03-15');
    expect(all[2].date).toBe('2026-05-10');
  });

  it('stocke et récupère les plis cutanés', async () => {
    await MeasurementService.save(makeMeasure('2026-05-10'));
    const entry = await MeasurementService.getByDate('2026-05-10');
    expect(entry?.skinfolds['chest']).toBe(10);
    expect(entry?.skinfolds['abdomen']).toBe(18);
  });
});
