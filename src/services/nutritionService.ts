const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

function parseNutrientValue(text: string, pattern: RegExp): number {
  const m = text.match(pattern);
  const raw = m?.[1];
  return raw != null ? parseFloat(raw) : 0;
}

export const NutritionService = {
  calculateDailyTotal(entries?: unknown[]): { kcal: number; p: number; c: number; f: number } {
    if (!entries?.length) return { kcal: 0, p: 0, c: 0, f: 0 };
    let kcal = 0, p = 0, c = 0, f = 0;

    for (const entry of entries) {
      const e = entry as Record<string, unknown>;
      const text = ((e.rawText as string) || '').toLowerCase();

      const kcalVal = parseNutrientValue(text, /(\d+(?:\.\d+)?)\s*kcal/i);
      const calVal = parseNutrientValue(text, /(\d+(?:\.\d+)?)\s*cal\b/i);
      kcal += kcalVal || calVal;

      p += parseNutrientValue(text, /(?:prot(?:éines?)?|^p)[:\s](\d+(?:\.\d+)?)/i);
      c += parseNutrientValue(text, /(?:glucides?|carbs?|^c)[:\s](\d+(?:\.\d+)?)/i);
      f += parseNutrientValue(text, /(?:lipides?|fats?|^f)[:\s](\d+(?:\.\d+)?)/i);
    }

    return { kcal: Math.round(kcal), p: Math.round(p), c: Math.round(c), f: Math.round(f) };
  },

  // Mifflin-St Jeor
  calculateBMR(weight = 0, height = 0, age = 0, gender = 'man'): number {
    if (!weight || !height || !age) return 0;
    const base = 10 * weight + 6.25 * height - 5 * age;
    return Math.round(gender === 'man' ? base + 5 : base - 161);
  },

  calculateTDEE(bmr = 0, activity = 'moderate'): number {
    const key = activity as keyof typeof ACTIVITY_MULTIPLIERS;
    const multiplier = ACTIVITY_MULTIPLIERS[key] ?? 1.55;
    return Math.round(bmr * multiplier);
  },

  calculateTargetMacros(tdee = 2_000, goal = 'maintain', weight = 70): {
    kcal: number; p: number; c: number; f: number
  } {
    let targetKcal = tdee;
    if (goal === 'cut') targetKcal = tdee - 500;
    if (goal === 'bulk') targetKcal = tdee + 300;

    const proteinMultiplier = goal === 'cut' ? 2.4 : goal === 'bulk' ? 1.8 : 2.0;
    const p = Math.round(weight * proteinMultiplier);
    const f = Math.round((targetKcal * 0.25) / 9);
    const c = Math.round((targetKcal - p * 4 - f * 9) / 4);

    return { kcal: targetKcal, p, c: Math.max(c, 50), f };
  },
};
