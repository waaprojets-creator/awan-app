import { getExercises } from '@/utils/sportData';
import type { ExerciseEntry } from '@/utils/sportData';
import type { GeneratorConfig } from './types';

// Maps generator muscle keys to exercise pm[] field values
const MUSCLE_TO_EX: Record<string, string[]> = {
  chest:      ['chest'],
  back:       ['lats', 'middle_back', 'lower_back'],
  shoulders:  ['shoulders'],
  biceps:     ['biceps'],
  triceps:    ['triceps'],
  quads:      ['quadriceps'],
  hamstrings: ['hamstrings'],
  calves:     ['calves'],
  glutes:     ['glutes'],
  abs:        ['abdominals'],
};

function levelOk(exLvl: string, configNiveau: string): boolean {
  if (configNiveau === 'beginner') return exLvl === 'beginner' || exLvl === 'intermediate';
  return true;
}

function levelScore(exLvl: string, configNiveau: string): number {
  if (configNiveau === 'advanced') {
    const order: Record<string, number> = { expert: 0, intermediate: 1, beginner: 2 };
    return order[exLvl] ?? 2;
  }
  const order: Record<string, number> = { beginner: 0, intermediate: 1, expert: 2 };
  return order[exLvl] ?? 1;
}

export function selectExercisesForMuscle(
  muscle: string,
  config: GeneratorConfig,
  limit: number,
): ExerciseEntry[] {
  const exerciseMuscles = MUSCLE_TO_EX[muscle] ?? [muscle];

  return getExercises()
    .filter(ex => {
      const matchesMuscle = exerciseMuscles.some(m => ex.pm.includes(m));
      const matchesEquip = ex.eq === 'body only' || (config.equipement as string[]).includes(ex.eq);
      const matchesLevel = levelOk(ex.lvl, config.niveau);
      return matchesMuscle && matchesEquip && matchesLevel;
    })
    .sort((a, b) => levelScore(a.lvl, config.niveau) - levelScore(b.lvl, config.niveau))
    .slice(0, limit);
}
