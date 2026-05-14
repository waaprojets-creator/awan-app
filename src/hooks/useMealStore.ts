import { useState, useEffect, useCallback } from 'react';
import { MealService } from '@/services/mealService';
import type { MealEntryLatest } from '@/data/schemas/nutrition/mealEntry';

export function useMealStore(date: string) {
  const [meals, setMeals] = useState<MealEntryLatest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    MealService.getByDate(date).then(entries => {
      if (active) { setMeals(entries); setLoading(false); }
    });
    return () => { active = false; };
  }, [date]);

  const add = useCallback(async (entry: MealEntryLatest): Promise<void> => {
    await MealService.save(entry);
    setMeals(prev => [...prev, entry].sort((a, b) => a.timestamp - b.timestamp));
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await MealService.delete(id);
    setMeals(prev => prev.filter(e => e.id !== id));
  }, []);

  const totals = MealService.totals(meals);

  return { meals, loading, totals, add, remove };
}
