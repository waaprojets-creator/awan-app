export type AdditiveStatus = 'safe' | 'doubtful' | 'haram' | 'unknown';
export type DietCompatibility = 'halal' | 'vegan' | 'vegetarian' | 'pescatarian';

export interface MacroNutrients {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface Ingredient {
  id: string;
  name: string;
  brand?: string;
  macros: MacroNutrients;
  imageUri: string;
  certifications: DietCompatibility[];
  additives: {
    code: string;
    status: AdditiveStatus;
  }[];
  seasonality?: number[];
  aminoAcidsProfile?: string;
}

export interface MealEntry {
  id: string;
  ingredientId: string;
  quantityGrams: number;
  timestamp: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  computedMacros: MacroNutrients;
}

export interface DailyNutritionInfo {
  dateId: string;
  tdee: number;
  bmr: number;
  consumedMacros: MacroNutrients;
  remainingCalories: number;
  entries: MealEntry[];
}
