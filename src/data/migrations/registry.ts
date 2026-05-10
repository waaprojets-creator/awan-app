import { migrateWorkoutLog } from '../schemas/sport/workoutLog';

/**
 * Central registry mapping storage keys (or domain identifiers) to their
 * versioned migrator functions. Each migrator accepts raw unknown data and
 * returns the latest typed version, running all intermediate migration steps.
 */
export const migrators = {
  'sport.workoutLog': migrateWorkoutLog,
} as const;

export type MigratorKey = keyof typeof migrators;
