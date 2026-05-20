import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../../src/data/storage/MemoryStorage';
import { _setStorageForTest } from '../../src/data/storage/storageService';
import { LocalAIService } from '../../src/services/localAIService';
import { BiometricsService } from '../../src/services/biometricsService';
import { NutritionService } from '../../src/services/nutritionService';
import { IslamService } from '../../src/services/islamService';
import { MealService } from '../../src/services/mealService';
import type { MealEntryLatest } from '../../src/data/schemas/nutrition/mealEntry';

const UUID = '550e8400-e29b-41d4-a716-446655440001';
const DATE = '2026-05-10';

// ─── LocalAIService.generateZenSummary ───────────────────────────────────────

describe('LocalAIService.generateZenSummary', () => {
  it('retourne le placeholder si aucune donnée', async () => {
    const s = await LocalAIService.generateZenSummary({});
    expect(s).toContain('Analyse disponible');
  });

  it('mentionne les prières complètes', async () => {
    const s = await LocalAIService.generateZenSummary({ prayersDone: 5, prayersTotal: 5 });
    expect(s).toContain('alignement maximal');
  });

  it('mentionne le compte partiel de prières', async () => {
    const s = await LocalAIService.generateZenSummary({ prayersDone: 3, prayersTotal: 5 });
    expect(s).toContain('3/5');
  });

  it('0 prières ne génère rien sur les prières', async () => {
    const s = await LocalAIService.generateZenSummary({ prayersDone: 0, prayersTotal: 5 });
    expect(s).toContain('Analyse disponible');
  });

  it('bilan calorique optimal', async () => {
    const s = await LocalAIService.generateZenSummary({ kcalToday: 2000, kcalTarget: 2100 });
    expect(s).toContain('optimal');
  });

  it('alerte déficit calorique', async () => {
    const s = await LocalAIService.generateZenSummary({ kcalToday: 1200, kcalTarget: 2000 });
    expect(s).toContain('surveillance');
  });

  it('alerte excédent calorique', async () => {
    const s = await LocalAIService.generateZenSummary({ kcalToday: 2600, kcalTarget: 2000 });
    expect(s).toContain('ajustement');
  });

  it('kcal sans cible = mention simple', async () => {
    const s = await LocalAIService.generateZenSummary({ kcalToday: 1800 });
    expect(s).toContain('1800 kcal');
  });

  it('affiche la dernière séance', async () => {
    const s = await LocalAIService.generateZenSummary({ lastWorkoutName: 'Push Day A' });
    expect(s).toContain('Push Day A');
  });

  it('affiche le poids avec tendance hausse', async () => {
    const s = await LocalAIService.generateZenSummary({ weightKg: 82.5, weightTrend: 'up' });
    expect(s).toContain('82.5');
    expect(s).toContain('↑');
  });

  it('affiche le poids avec tendance baisse', async () => {
    const s = await LocalAIService.generateZenSummary({ weightKg: 79.0, weightTrend: 'down' });
    expect(s).toContain('↓');
  });

  it('combine plusieurs données en une phrase', async () => {
    const s = await LocalAIService.generateZenSummary({
      prayersDone: 5, prayersTotal: 5,
      kcalToday: 2100, kcalTarget: 2000,
      lastWorkoutName: 'Legs',
      weightKg: 80, weightTrend: 'stable',
    });
    expect(s).toContain('alignement maximal');
    expect(s).toContain('Legs');
    expect(s).toContain('80');
  });
});

// ─── BiometricsService ───────────────────────────────────────────────────────

describe('BiometricsService.jacksonPollock3Men', () => {
  it('calcul nominal (homme, 25 ans, plis standards)', () => {
    const bf = BiometricsService.jacksonPollock3Men(12, 20, 15, 25);
    expect(bf).toBeGreaterThan(8);
    expect(bf).toBeLessThan(20);
  });

  it('renvoie un nombre fini (pas NaN/Infinity)', () => {
    const bf = BiometricsService.jacksonPollock3Men(10, 15, 12, 30);
    expect(Number.isFinite(bf)).toBe(true);
  });

  it('ne retourne pas de valeur négative (plis très faibles)', () => {
    const bf = BiometricsService.jacksonPollock3Men(1, 1, 1, 20);
    expect(bf).toBeGreaterThanOrEqual(0);
  });

  it('athlète sec ~6% de MG', () => {
    const bf = BiometricsService.jacksonPollock3Men(4, 7, 8, 22);
    expect(bf).toBeLessThan(10);
  });
});

describe('BiometricsService.jacksonPollock3Women', () => {
  it('calcul nominal (femme, 30 ans)', () => {
    const bf = BiometricsService.jacksonPollock3Women(16, 14, 18, 30);
    expect(bf).toBeGreaterThan(15);
    expect(bf).toBeLessThan(35);
  });

  it('renvoie un nombre fini', () => {
    const bf = BiometricsService.jacksonPollock3Women(12, 10, 14, 25);
    expect(Number.isFinite(bf)).toBe(true);
  });
});

// ─── NutritionService ────────────────────────────────────────────────────────

describe('NutritionService.calculateBMR', () => {
  it('homme 30 ans 75kg 178cm', () => {
    const bmr = NutritionService.calculateBMR(75, 178, 30, 'man');
    expect(bmr).toBeGreaterThan(1600);
    expect(bmr).toBeLessThan(2000);
  });

  it('femme 28 ans 60kg 165cm', () => {
    const bmr = NutritionService.calculateBMR(60, 165, 28, 'woman');
    expect(bmr).toBeGreaterThan(1300);
    expect(bmr).toBeLessThan(1700);
  });

  it('retourne 0 si données manquantes', () => {
    expect(NutritionService.calculateBMR(0, 178, 30)).toBe(0);
    expect(NutritionService.calculateBMR(75, 0, 30)).toBe(0);
    expect(NutritionService.calculateBMR(75, 178, 0)).toBe(0);
  });
});

describe('NutritionService.calculateTDEE', () => {
  it('sédentaire × 1.2', () => {
    const tdee = NutritionService.calculateTDEE(2000, 'sedentary');
    expect(tdee).toBe(2400);
  });

  it('très actif × 1.9', () => {
    const tdee = NutritionService.calculateTDEE(2000, 'very_active');
    expect(tdee).toBe(3800);
  });

  it('niveau inconnu → modéré × 1.55', () => {
    const tdee = NutritionService.calculateTDEE(2000, 'unknown_level');
    expect(tdee).toBe(3100);
  });
});

describe('NutritionService.calculateTargetMacros', () => {
  it('cut réduit les calories de 500', () => {
    const m = NutritionService.calculateTargetMacros(2500, 'cut', 80);
    expect(m.kcal).toBe(2000);
    expect(m.p).toBeGreaterThan(150);
  });

  it('bulk ajoute 300 calories', () => {
    const m = NutritionService.calculateTargetMacros(2500, 'bulk', 80);
    expect(m.kcal).toBe(2800);
  });

  it('glucides non négatifs', () => {
    const m = NutritionService.calculateTargetMacros(1200, 'cut', 100);
    expect(m.c).toBeGreaterThanOrEqual(0);
  });
});

// ─── IslamService edge cases ─────────────────────────────────────────────────

describe('IslamService.advanceReading — edge cases', () => {
  beforeEach(() => {
    _setStorageForTest(new MemoryStorage());
  });

  it('avancer par 0 crée un enregistrement sans changer l\'ayah', async () => {
    const p = await IslamService.advanceReading(0, UUID, DATE);
    expect(p.currentAyah).toBe(1);
    expect(p.totalAyahsRead).toBe(0);
  });

  it('reculer de 1 ne descend pas sous ayah 1', async () => {
    await IslamService.advanceReading(3, UUID, DATE);
    const p = await IslamService.advanceReading(-10, UUID, DATE);
    expect(p.currentAyah).toBeGreaterThanOrEqual(1);
  });

  it('totalAyahsRead ne devient pas négatif', async () => {
    await IslamService.advanceReading(2, UUID, DATE);
    const p = await IslamService.advanceReading(-100, UUID, DATE);
    expect(p.totalAyahsRead).toBeGreaterThanOrEqual(0);
  });

  it('grandes valeurs sont acceptées', async () => {
    const p = await IslamService.advanceReading(6236, UUID, DATE);
    expect(p.totalAyahsRead).toBe(6236);
  });
});

// ─── MealService.totals ───────────────────────────────────────────────────────

describe('MealService.totals', () => {
  const meal = (id: string, kcal: number, p = 0, c = 0, f = 0): MealEntryLatest => ({
    v: 1, id, date: DATE, name: 'Repas', kcal, p, c, f,
    timestamp: Date.now(), source: 'manual',
  });

  it('tableau vide → zéros', () => {
    const t = MealService.totals([]);
    expect(t).toEqual({ kcal: 0, p: 0, c: 0, f: 0, fiberG: 0 });
  });

  it('somme correcte sur plusieurs repas', () => {
    const t = MealService.totals([
      meal('m1', 400, 35, 40, 15),
      meal('m2', 600, 50, 60, 20),
    ]);
    expect(t.kcal).toBe(1000);
    expect(t.p).toBe(85);
    expect(t.c).toBe(100);
    expect(t.f).toBe(35);
  });

  it('un seul repas', () => {
    const t = MealService.totals([meal('m1', 500, 40, 50, 18)]);
    expect(t.kcal).toBe(500);
  });
});
