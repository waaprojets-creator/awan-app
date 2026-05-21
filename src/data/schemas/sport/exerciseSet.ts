import { z } from 'zod';
import { createMigrator } from '../../migrations/runner';

export const SetKindSchema = z.enum(['warmup', 'working', 'drop', 'failure']);
export type SetKind = z.infer<typeof SetKindSchema>;

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const ExerciseSetV1Schema = z.object({
  v: z.literal(1),
  exerciseId: z.string(),
  // Default backfills legacy data (pre-`kind`) as a working set — safe production migration.
  kind: SetKindSchema.default('working'),
  reps: z.number().int().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSec: z.number().int().nonnegative().optional(),
  distanceM: z.number().nonnegative().optional(),
  rir: z.number().int().min(0).max(5).optional(),
  rpe: z.number().min(1).max(10).optional(),
  restActualSec: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
  completedAt: z.number().int().nonnegative().optional(),
});

export type ExerciseSetV1 = z.infer<typeof ExerciseSetV1Schema>;

// ─── V2: planned vs actual (override tracking) ───────────────────────────────
// plannedWeightKg / plannedReps = snapshot at session start
// weightKg / reps = actual values (user override during session)

export const ExerciseSetV2Schema = ExerciseSetV1Schema.extend({
  v: z.literal(2),
  plannedWeightKg: z.number().nonnegative().optional(),
  plannedReps: z.number().int().nonnegative().optional(),
  substitutedFrom: z.string().optional(),
});

export type ExerciseSetV2 = z.infer<typeof ExerciseSetV2Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const ExerciseSetSchema = z.discriminatedUnion('v', [
  ExerciseSetV1Schema,
  ExerciseSetV2Schema,
]);
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;

export const EXERCISE_SET_LATEST_VERSION = 2;
export type ExerciseSetLatest = ExerciseSetV2;

// ─── Migrations ───────────────────────────────────────────────────────────────

const migrations = {
  1: (data: ExerciseSetV1): ExerciseSetV2 => ({
    ...data,
    v: 2,
    // Copy actual values as planned snapshot for retro-compat
    plannedWeightKg: data.weightKg,
    plannedReps: data.reps,
  }),
};

export const migrateExerciseSet = createMigrator<ExerciseSet, ExerciseSetLatest>(
  ExerciseSetSchema,
  migrations,
  EXERCISE_SET_LATEST_VERSION,
);
