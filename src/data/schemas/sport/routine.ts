import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

const RoutineExerciseSchema = z.object({
  rid: z.string(),
}).catchall(z.unknown());

export const RoutineV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  name: z.string().min(1),
  exercises: z.array(RoutineExerciseSchema),
  createdAt: TimestampSchema,
});

export type RoutineV1 = z.infer<typeof RoutineV1Schema>;
export type RoutineLatest = RoutineV1;

export const RoutineSchema = z.discriminatedUnion('v', [RoutineV1Schema]);
export type Routine = z.infer<typeof RoutineSchema>;

export const ROUTINE_LATEST_VERSION = 1;

export const migrateRoutine = createMigrator<Routine, RoutineLatest>(
  RoutineSchema,
  {},
  ROUTINE_LATEST_VERSION,
);

// ─── WorkoutSession (séance complétée) ───────────────────────────────────────

export const WorkoutSessionV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  name: z.string(),
  date: DateStringSchema,
  duration: z.number().int().nonnegative(),
  startTime: TimestampSchema,
  endTime: TimestampSchema,
  exercises: z.array(RoutineExerciseSchema),
});

export type WorkoutSessionV1 = z.infer<typeof WorkoutSessionV1Schema>;
export type WorkoutSessionLatest = WorkoutSessionV1;

export const WorkoutSessionSchema = z.discriminatedUnion('v', [WorkoutSessionV1Schema]);
export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>;

export const WORKOUT_SESSION_LATEST_VERSION = 1;

export const migrateWorkoutSession = createMigrator<WorkoutSession, WorkoutSessionLatest>(
  WorkoutSessionSchema,
  {},
  WORKOUT_SESSION_LATEST_VERSION,
);
