import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { ExerciseSetV1Schema } from './exerciseSet';
import { createMigrator } from '../../migrations/runner';

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const WorkoutLogV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  startedAt: TimestampSchema,
  endedAt: TimestampSchema.optional(),
  sets: z.array(ExerciseSetV1Schema),
  note: z.string().optional(),
});

export type WorkoutLogV1 = z.infer<typeof WorkoutLogV1Schema>;

// ─── V2 (example: adds templateId) ───────────────────────────────────────────

export const WorkoutLogV2Schema = WorkoutLogV1Schema.extend({
  v: z.literal(2),
  templateId: IdSchema.optional(),
});

export type WorkoutLogV2 = z.infer<typeof WorkoutLogV2Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const WorkoutLogSchema = z.discriminatedUnion('v', [
  WorkoutLogV1Schema,
  WorkoutLogV2Schema,
]);

export type WorkoutLog = z.infer<typeof WorkoutLogSchema>;

export const WORKOUT_LOG_LATEST_VERSION = 2;
export type WorkoutLogLatest = WorkoutLogV2;

// ─── Migrations ───────────────────────────────────────────────────────────────

const migrations = {
  1: (data: WorkoutLogV1): WorkoutLogV2 => ({
    ...data,
    v: 2,
    templateId: undefined,
  }),
};

export const migrateWorkoutLog = createMigrator<WorkoutLog, WorkoutLogLatest>(
  WorkoutLogSchema,
  migrations,
  WORKOUT_LOG_LATEST_VERSION,
);
