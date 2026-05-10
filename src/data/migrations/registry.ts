import { migrateWorkoutLog } from '../schemas/sport/workoutLog';
import { migrateRule } from '../schemas/coach/rule';
import { migrateAssessment } from '../schemas/coach/assessment';

/**
 * Central registry mapping storage keys (or domain identifiers) to their
 * versioned migrator functions. Each migrator accepts raw unknown data and
 * returns the latest typed version, running all intermediate migration steps.
 */
export const migrators = {
  'sport.workoutLog': migrateWorkoutLog,
  'coach.rule': migrateRule,
  'coach.assessment': migrateAssessment,
} as const;

export type MigratorKey = keyof typeof migrators;
