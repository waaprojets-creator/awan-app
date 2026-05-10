import { z } from 'zod';

export const ExerciseSetV1Schema = z.object({
  v: z.literal(1),
  exerciseId: z.string(),
  reps: z.number().int().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSec: z.number().int().nonnegative().optional(),
  distanceM: z.number().nonnegative().optional(),
  rpe: z.number().min(1).max(10).optional(),
  note: z.string().optional(),
});

export type ExerciseSetV1 = z.infer<typeof ExerciseSetV1Schema>;

// Union — extend here when v2 is introduced
export const ExerciseSetSchema = ExerciseSetV1Schema;
export type ExerciseSet = ExerciseSetV1;
