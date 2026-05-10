import { NUTRITION_DB } from '../data/nutrition_db';

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

export const NutritionService = {
  // --- MOTEUR DE CALCUL (WGER) ---
  
  /**
   * Calcule le BMR (Basal Metabolic Rate) via Mifflin-St Jeor
   */
  calculateBMR: (weight: number, height: number, age: number, gender: 'm' | 'f' = 'm'): number => {
    if (!weight || !height || !age) return 0;
    const base = (10 * weight) + (6.25 * height) - (5 * age);
    return gender === 'm' ? base + 5 : base - 161;
  },

  /**
   * Calcule le TDEE (Total Daily Energy Expenditure)
   */
  calculateTDEE: (bmr: number, activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' = 'moderate'): number => {
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    return bmr * (multipliers[activityLevel] || 1.55);
  },

  /**
   * Définit l'objectif de macros selon l'objectif
   */
  calculateTargetMacros: (tdee: number, goal: 'cut' | 'maintain' | 'bulk' = 'maintain', weight?: number): Macros => {
    let targetCals = tdee;
    if (goal === 'cut') targetCals -= 500;
    if (goal === 'bulk') targetCals += 300;

    // Protéines: 2g / kg de poids de corps pour la muscu
    const protTarget = weight ? weight * 2 : 150;
    // Lipides: ~1g / kg 
    const fatTarget = weight ? weight * 1 : 70;
    
    // Le reste en glucides (1g prot = 4kcal, 1g lip = 9kcal, 1g gluc = 4kcal)
    const protCals = protTarget * 4;
    const fatCals = fatTarget * 9;
    const remainingCals = Math.max(0, targetCals - protCals - fatCals);
    const carbTarget = remainingCals / 4;

    return {
      kcal: Math.round(targetCals),
      p: Math.round(protTarget),
      c: Math.round(carbTarget),
      f: Math.round(fatTarget)
    };
  },

  // --- ANALYSE DES ENTREES JOURNALIERES (NLP / Token Parse) ---
  
  /**
   * Parse une entrée brut pour récupérer Kcal & Macros
   */
  parseEntryNutrition: (entry: any): Macros => {
    let totalKcal = 0;
    let totalP = 0, totalC = 0, totalF = 0;

    const lowerText = (entry.rawText || '').toLowerCase();

    // 1. Essayer de trouver un aliment connu
    for (const food of NUTRITION_DB) {
      if (lowerText.includes(food.name.toLowerCase())) {
        const qtyMatch = lowerText.match(/(\d+)\s*g/);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 100;
        
        const multiplier = qty / 100;
        totalKcal += food.calories * multiplier;
        totalP += food.macros.p * multiplier;
        totalC += food.macros.c * multiplier;
        totalF += food.macros.f * multiplier;
      }
    }

    // 2. Fallback parsing direct
    if (totalKcal === 0 && entry.tokens) {
      entry.tokens.forEach((tok: any) => {
        const tVal = tok.value.toLowerCase();
        if (tVal.includes('kcal') || tVal.includes('cal')) {
          totalKcal += parseInt(tVal.replace(/\D/g, ''), 10) || 0;
        } else if (tVal.match(/(\d+)g\s*p/)) {
          totalP += parseInt(tVal.replace(/\D/g, ''), 10) || 0;
        }
      });
    }

    return {
      kcal: Math.round(totalKcal),
      p: Math.round(totalP),
      c: Math.round(totalC),
      f: Math.round(totalF)
    };
  },

  /**
   * Calcule le total d'un tableau d'entrées
   */
  calculateDailyTotal: (entries: any[]): Macros => {
    const nutritionEntries = entries.filter(e => e.module === 'nutrition');
    const tot = { kcal: 0, p: 0, c: 0, f: 0 };
    
    nutritionEntries.forEach(entry => {
      const parsed = NutritionService.parseEntryNutrition(entry);
      tot.kcal += parsed.kcal;
      tot.p += parsed.p;
      tot.c += parsed.c;
      tot.f += parsed.f;
    });

    return tot;
  }
};
