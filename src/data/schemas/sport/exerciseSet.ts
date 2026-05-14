import { z } from 'zod';

export const SetKindSchema = z.enum(['warmup', 'working', 'drop', 'failure']);
export type SetKind = z.infer<typeof SetKindSchema>;

export const ExerciseSetV1Schema = z.object({
  v: z.literal(1),
  exerciseId: z.string(),
  kind: SetKindSchema,
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

export const ExerciseSetSchema = ExerciseSetV1Schema;
export type ExerciseSet = ExerciseSetV1;
