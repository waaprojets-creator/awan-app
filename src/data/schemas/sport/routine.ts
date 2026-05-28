import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { ExerciseSetSchema } from './exerciseSet';
import type { ExerciseSetLatest } from './exerciseSet';
import { createMigrator } from '../../migrations/runner';

// ─── Routine (template d'entraînement) ──────────────────────────────────────

export const CycleLetterSchema = z.enum(['A', 'B', 'C', 'D']);
export type CycleLetter = z.infer<typeof CycleLetterSchema>;

export const RoutineExerciseSchema = z.object({
  rid: z.string(),
  exerciseId: z.string(),
  name: z.string(),
  primaryMuscle: z.string().optional(),
  secondaryMuscles: z.array(z.string()).optional(),
  equipment: z.string().optional(),
  plannedSets: z.number().int().positive(),
  plannedReps: z.number().int().positive(),
  plannedWeightKg: z.number().nonnegative().optional(),
  restSec: z.number().int().nonnegative(),
  order: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

export const DEFAULT_PLANNED_SETS = 3;
export const DEFAULT_PLANNED_REPS = 10;
export const DEFAULT_REST_SEC = 90;

export type RoutineExercise = z.infer<typeof RoutineExerciseSchema>;

export const RoutineV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  name: z.string().min(1),
  cycleLetter: CycleLetterSchema.nullable().optional(),
  assignedDays: z.array(z.number().int().min(0).max(6)).optional(),
  exercises: z.array(RoutineExerciseSchema),
  defaultRestSec: z.number().int().nonnegative(),
  createdAt: TimestampSchema,
  source: z.enum(['user', 'coach']).optional(),
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

export const WorkoutExerciseLogSchema = z.object({
  rid: z.string(),
  exerciseId: z.string(),
  name: z.string(),
  primaryMuscle: z.string().optional(),
  secondaryMuscles: z.array(z.string()).optional(),
  equipment: z.string().optional(),
  order: z.number().int().nonnegative(),
  sets: z.array(ExerciseSetSchema),
  substitutedFrom: z.string().optional(),
});

export type WorkoutExerciseLog = z.infer<typeof WorkoutExerciseLogSchema>;
// Re-export for consumers building new sets
export type { ExerciseSetLatest };

export const WorkoutSessionV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  routineId: IdSchema.optional(),
  name: z.string(),
  cycleLetter: CycleLetterSchema.nullable().optional(),
  date: DateStringSchema,
  startTime: TimestampSchema,
  endTime: TimestampSchema,
  duration: z.number().int().nonnegative(),
  warmupStartedAt: TimestampSchema.optional(),
  workoutEndedAt: TimestampSchema.optional(),
  solo: z.boolean(),
  availableTimeMin: z.number().int().positive().optional(),
  feeling: z.number().int().min(1).max(5).optional(),
  sessionRPE: z.number().int().min(1).max(10).optional(),
  recoveryScore: z.number().int().min(1).max(10).optional(),
  note: z.string().optional(),
  isException: z.boolean(),
  exercises: z.array(WorkoutExerciseLogSchema),
});

export type WorkoutSessionV1 = z.infer<typeof WorkoutSessionV1Schema>;

// ─── WorkoutSession V2: score séance + exitedAt (vestiaire) ──────────────────

export const WorkoutSessionV2Schema = WorkoutSessionV1Schema.extend({
  v: z.literal(2),
  scoreSeance: z.number().int().min(0).max(100).optional(),
  exitedAt: TimestampSchema.optional(),
  adherence: z.number().min(0).max(1).optional(),
});

export type WorkoutSessionV2 = z.infer<typeof WorkoutSessionV2Schema>;

// ─── WorkoutSession V3: champs pré-calculés pour agrégation SQL ──────────────
// tonnage et durationMin stockés à l'écriture → aggregate() sans itérer les sets
// rpe = alias de sessionRPE → computeACWR() lit session.rpe directement

export const WorkoutSessionV3Schema = WorkoutSessionV2Schema.extend({
  v: z.literal(3),
  tonnage: z.number().nonnegative(),          // sum(set.weightKg × set.reps, kind='working')
  durationMin: z.number().nonnegative(),      // (endTime - startTime) / 60000
  rpe: z.number().min(1).max(10).optional(),  // alias sessionRPE — top-level pour aggregate
});

export type WorkoutSessionV3 = z.infer<typeof WorkoutSessionV3Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const WorkoutSessionSchema = z.discriminatedUnion('v', [
  WorkoutSessionV1Schema,
  WorkoutSessionV2Schema,
  WorkoutSessionV3Schema,
]);
export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>;

export const WORKOUT_SESSION_LATEST_VERSION = 3;
export type WorkoutSessionLatest = WorkoutSessionV3;

// ─── Migrations ───────────────────────────────────────────────────────────────

function computeTonnage(exercises: WorkoutSessionV1['exercises']): number {
  return exercises.reduce((t, ex) =>
    t + ex.sets.reduce((s, set) =>
      set.kind === 'working' ? s + (set.weightKg ?? 0) * (set.reps ?? 0) : s, 0), 0);
}

const sessionMigrations = {
  1: (data: WorkoutSessionV1): WorkoutSessionV2 => ({
    ...data,
    v: 2,
  }),
  2: (data: WorkoutSessionV2): WorkoutSessionV3 => ({
    ...data,
    v: 3,
    tonnage: computeTonnage(data.exercises),
    durationMin: data.endTime && data.startTime
      ? Math.round((data.endTime - data.startTime) / 60000) : 0,
    rpe: data.sessionRPE,
  }),
};

export const migrateWorkoutSession = createMigrator<WorkoutSession, WorkoutSessionLatest>(
  WorkoutSessionSchema,
  sessionMigrations,
  WORKOUT_SESSION_LATEST_VERSION,
);

// ─── Helpers cycle dynamique ────────────────────────────────────────────────

const CYCLE_ORDER: CycleLetter[] = ['A', 'B', 'C', 'D'];

export function nextCycleLetter(
  current: CycleLetter | null | undefined,
  availableLetters: CycleLetter[],
): CycleLetter | null {
  if (availableLetters.length === 0) return null;
  if (!current) return availableLetters[0] ?? null;
  const sorted = [...availableLetters].sort(
    (a, b) => CYCLE_ORDER.indexOf(a) - CYCLE_ORDER.indexOf(b),
  );
  const curIdx = CYCLE_ORDER.indexOf(current);
  const next = sorted.find(l => CYCLE_ORDER.indexOf(l) > curIdx);
  return next ?? sorted[0] ?? null;
}
