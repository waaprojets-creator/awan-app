import { describe, it, expect } from 'vitest';
import { NutritionService } from '../../src/services/nutritionService';
import { BiometricsService } from '../../src/services/biometricsService';
import { LocalAIService } from '../../src/services/localAIService';

// ── NutritionService ──────────────────────────────────────────────────────────

describe('NutritionService', () => {
  describe('calculateDailyTotal', () => {
    it('retourne zéro sur liste vide', () => {
      expect(NutritionService.calculateDailyTotal([])).toEqual({ kcal: 0, p: 0, c: 0, f: 0 });
    });

    it('extrait kcal depuis rawText', () => {
      const entries = [{ rawText: 'poulet 300kcal' }, { rawText: 'riz 150kcal' }];
      expect(NutritionService.calculateDailyTotal(entries).kcal).toBe(450);
    });

    it('extrait les macros depuis rawText', () => {
      const entries = [{ rawText: 'prot:35 glucides:50 lipides:10 400kcal' }];
      const r = NutritionService.calculateDailyTotal(entries);
      expect(r.p).toBe(35);
      expect(r.c).toBe(50);
      expect(r.f).toBe(10);
    });

    it('additionne plusieurs entrées', () => {
      const entries = [
        { rawText: 'prot:20 glucides:30 400kcal' },
        { rawText: 'prot:15 glucides:20 300kcal' },
      ];
      const r = NutritionService.calculateDailyTotal(entries);
      expect(r.kcal).toBe(700);
      expect(r.p).toBe(35);
    });
  });

  describe('calculateBMR', () => {
    it('Mifflin-St Jeor homme 80kg 180cm 30ans', () => {
      // 10*80 + 6.25*180 - 5*30 + 5 = 800+1125-150+5 = 1780
      expect(NutritionService.calculateBMR(80, 180, 30, 'man')).toBe(1780);
    });

    it('Mifflin-St Jeor femme 60kg 165cm 28ans', () => {
      // 10*60 + 6.25*165 - 5*28 - 161 = 600+1031.25-140-161 = 1330.25 → 1330
      expect(NutritionService.calculateBMR(60, 165, 28, 'woman')).toBe(1330);
    });

    it('retourne 0 si données manquantes', () => {
      expect(NutritionService.calculateBMR(0, 180, 30, 'man')).toBe(0);
    });
  });

  describe('calculateTDEE', () => {
    it('multiplie par 1.55 pour moderate', () => {
      expect(NutritionService.calculateTDEE(1780, 'moderate')).toBe(2759);
    });

    it('utilise 1.55 par défaut si activité inconnue', () => {
      expect(NutritionService.calculateTDEE(1000, 'unknown')).toBe(1550);
    });
  });

  describe('calculateTargetMacros', () => {
    it('cut : -500 kcal du TDEE', () => {
      const r = NutritionService.calculateTargetMacros(2500, 'cut', 80);
      expect(r.kcal).toBe(2000);
    });

    it('bulk : +300 kcal du TDEE', () => {
      const r = NutritionService.calculateTargetMacros(2500, 'bulk', 80);
      expect(r.kcal).toBe(2800);
    });

    it('les glucides ne sont jamais négatifs', () => {
      const r = NutritionService.calculateTargetMacros(1200, 'cut', 100);
      expect(r.c).toBeGreaterThanOrEqual(50);
    });
  });
});

// ── BiometricsService ─────────────────────────────────────────────────────────

describe('BiometricsService', () => {
  it('jacksonPollock3Men calcule un % de graisse plausible', () => {
    // Valeurs typiques jeune homme musclé : chest=10, abdomen=20, thigh=15, age=25
    const bf = BiometricsService.jacksonPollock3Men(10, 20, 15, 25);
    expect(bf).toBeGreaterThan(5);
    expect(bf).toBeLessThan(25);
  });

  it('jacksonPollock3Women calcule un % de graisse plausible', () => {
    // triceps=15, suprailiac=12, thigh=20, age=30
    const bf = BiometricsService.jacksonPollock3Women(15, 12, 20, 30);
    expect(bf).toBeGreaterThan(15);
    expect(bf).toBeLessThan(35);
  });

  it('valeurs identiques donnent le même résultat', () => {
    const a = BiometricsService.jacksonPollock3Men(10, 20, 15, 25);
    const b = BiometricsService.jacksonPollock3Men(10, 20, 15, 25);
    expect(a).toBe(b);
  });
});

// ── LocalAIService — halal audit ──────────────────────────────────────────────

describe('LocalAIService.auditHalalIngredients', () => {
  it('retourne halal pour une liste propre', () => {
    const r = LocalAIService.auditHalalIngredients('eau, farine de blé, sel, levure');
    expect(r.status).toBe('halal');
  });

  it('détecte porc comme haram', () => {
    const r = LocalAIService.auditHalalIngredients('farine, lard, sel');
    expect(r.status).toBe('haram');
    expect(r.flagged).toContain('lard');
  });

  it('détecte alcool comme haram', () => {
    const r = LocalAIService.auditHalalIngredients('arôme de vin, sucre');
    expect(r.status).toBe('haram');
  });

  it('détecte gélatine comme douteux', () => {
    const r = LocalAIService.auditHalalIngredients('sucre, gélatine, colorant');
    expect(r.status).toBe('douteux');
  });

  it('haram prend priorité sur douteux', () => {
    const r = LocalAIService.auditHalalIngredients('gélatine, porc, sel');
    expect(r.status).toBe('haram');
  });

  it('retourne halal sur texte vide', () => {
    const r = LocalAIService.auditHalalIngredients('');
    expect(r.status).toBe('halal');
  });
});
