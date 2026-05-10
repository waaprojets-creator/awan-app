import { useState, useMemo } from 'react';
import { Ingredient, MealEntry, DailyNutritionInfo, MacroNutrients } from './types';

// Mock DB - offline first
const LOCAL_INGREDIENTS_DB: Ingredient[] = [
  {
    id: 'food_1',
    name: 'Poulet rôti (Halal)',
    macros: { protein: 27, carbs: 0, fat: 14, calories: 237 },
    imageUri: 'local://pack/nutrition/poulet_roti.jpg',
    certifications: ['halal'],
    additives: [],
  },
  {
    id: 'food_2',
    name: 'Lentilles Vertes',
    macros: { protein: 9, carbs: 20, fat: 0.4, calories: 116 },
    imageUri: 'local://pack/nutrition/lentilles.jpg',
    certifications: ['halal', 'vegan'],
    additives: [],
  }
];

export function useNutrition(currentDateId: string) {
  const [dailyInfo, setDailyInfo] = useState<DailyNutritionInfo>({
    dateId: currentDateId,
    tdee: 2500, // Depuis settings locaux
    bmr: 1800,
    consumedMacros: { protein: 0, carbs: 0, fat: 0, calories: 0 },
    remainingCalories: 2500,
    entries: [],
  });

  const searchIngredients = (query: string): Ingredient[] => {
    if (!query) return [];
    return LOCAL_INGREDIENTS_DB.filter(ing => 
      ing.name.toLowerCase().includes(query.toLowerCase()) && 
      !ing.additives.some(a => a.status === 'haram' || a.status === 'doubtful')
    );
  };

  const addMealEntry = (ingredient: Ingredient, quantityGrams: number, mealType: MealEntry['mealType']) => {
    const ratio = quantityGrams / 100;
    const computed: MacroNutrients = {
      protein: Math.round(ingredient.macros.protein * ratio),
      carbs: Math.round(ingredient.macros.carbs * ratio),
      fat: Math.round(ingredient.macros.fat * ratio),
      calories: Math.round(ingredient.macros.calories * ratio),
    };

    const newEntry: MealEntry = {
      id: `entry_${Date.now()}`,
      ingredientId: ingredient.id,
      quantityGrams,
      timestamp: Date.now(),
      mealType,
      computedMacros: computed,
    };

    setDailyInfo(prev => ({
      ...prev,
      consumedMacros: {
        protein: prev.consumedMacros.protein + computed.protein,
        carbs: prev.consumedMacros.carbs + computed.carbs,
        fat: prev.consumedMacros.fat + computed.fat,
        calories: prev.consumedMacros.calories + computed.calories,
      },
      remainingCalories: prev.tdee - (prev.consumedMacros.calories + computed.calories),
      entries: [...prev.entries, newEntry],
    }));
  };

  const dashboardWidgetData = useMemo(() => {
    return {
      tdee: dailyInfo.tdee,
      calories: dailyInfo.consumedMacros.calories,
      remaining: dailyInfo.remainingCalories,
      progress: Math.min(dailyInfo.consumedMacros.calories / dailyInfo.tdee, 1),
      macros: dailyInfo.consumedMacros
    };
  }, [dailyInfo]);

  return { dailyInfo, dashboardWidgetData, searchIngredients, addMealEntry };
}
