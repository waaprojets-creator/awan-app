import { loadExerciseCatalog } from '@/utils/sportData';
import { uuid } from '@/utils/id';
import { DEFAULT_PLANNED_SETS, DEFAULT_REST_SEC } from '@/data/schemas/sport/routine';
import type { RoutineLatest, RoutineExercise } from '@/data/schemas/sport/routine';
import type { GeneratorConfig } from './types';
import { getTemplate } from './templates';
import { selectExercisesForMuscle } from './exerciseSelector';
import { allocateSetsPerMuscle } from './volumeAllocator';

const REST_BY_OBJECTIF: Record<string, number> = {
  hypertrophie: 90,
  force: 180,
  endurance: 60,
  recomposition: 90,
};

const REPS_BY_OBJECTIF: Record<string, number> = {
  hypertrophie: 10,
  force: 5,
  endurance: 15,
  recomposition: 12,
};

export async function generateRoutines(config: GeneratorConfig): Promise<RoutineLatest[]> {
  try { await loadExerciseCatalog(); } catch { /* empty catalog in test env */ }

  const template = getTemplate(config.frequenceJours);
  const allMuscles = [...new Set(template.days.flatMap(d => d.primaryMuscles))];
  const weeklyAlloc = allocateSetsPerMuscle(allMuscles, config.objectif, config.frequenceJours);

  // Count how many days each muscle appears in (for even distribution)
  const muscleDayCount: Record<string, number> = {};
  for (const day of template.days) {
    for (const muscle of day.primaryMuscles) {
      muscleDayCount[muscle] = (muscleDayCount[muscle] ?? 0) + 1;
    }
  }

  const restSec = REST_BY_OBJECTIF[config.objectif] ?? DEFAULT_REST_SEC;
  const plannedReps = REPS_BY_OBJECTIF[config.objectif] ?? 10;

  return template.days.map((day) => {
    const exercises: RoutineExercise[] = [];

    for (const muscle of day.primaryMuscles) {
      const weeklySets = weeklyAlloc[muscle] ?? 0;
      const daysCount = muscleDayCount[muscle] ?? 1;
      const setsPerDay = Math.max(DEFAULT_PLANNED_SETS, Math.ceil(weeklySets / daysCount));
      const exerciseCount = Math.max(1, Math.ceil(setsPerDay / DEFAULT_PLANNED_SETS));

      const picked = selectExercisesForMuscle(muscle, config, exerciseCount);
      const setsEach = Math.max(1, Math.round(setsPerDay / Math.max(1, picked.length)));

      for (const ex of picked) {
        exercises.push({
          rid: uuid(),
          exerciseId: ex.id,
          name: ex.n,
          primaryMuscle: ex.pm[0],
          equipment: ex.eq,
          plannedSets: setsEach,
          plannedReps,
          restSec,
          order: exercises.length,
        });
      }
    }

    return {
      v: 1,
      id: uuid(),
      name: `${day.label} · ${config.objectif.toUpperCase()}`,
      cycleLetter: day.cycleLetter,
      exercises,
      defaultRestSec: restSec,
      createdAt: Date.now(),
      source: 'coach',
    };
  });
}
