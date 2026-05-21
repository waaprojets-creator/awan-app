import { z } from 'zod';
import { TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const ActivityLevelSchema = z.enum([
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active',
]);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const GoalSchema = z.enum(['cut', 'maintain', 'bulk']);
export type Goal = z.infer<typeof GoalSchema>;

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const NutritionTargetsV1Schema = z.object({
  v: z.literal(1),
  tdee: z.number().positive(),
  targetKcal: z.number().positive(),
  targetProteinG: z.number().positive(),
  targetCarbsG: z.number().nonnegative(),
  targetFatG: z.number().positive(),
  targetFiberG: z.number().positive().optional(),
  goal: GoalSchema,
  activityLevel: ActivityLevelSchema,
  updatedAt: TimestampSchema,
  // For adaptive TDEE: computed from real trend vs intake
  adaptiveMultiplier: z.number().min(0.5).max(2).optional(),
  lastAdaptiveRecalcAt: TimestampSchema.optional(),
});

export type NutritionTargetsV1 = z.infer<typeof NutritionTargetsV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const NutritionTargetsSchema = z.discriminatedUnion('v', [NutritionTargetsV1Schema]);
export type NutritionTargets = z.infer<typeof NutritionTargetsSchema>;

export const NUTRITION_TARGETS_LATEST_VERSION = 1;
export type NutritionTargetsLatest = NutritionTargetsV1;

export const migrateNutritionTargets = createMigrator<NutritionTargets, NutritionTargetsLatest>(
  NutritionTargetsSchema,
  {},
  NUTRITION_TARGETS_LATEST_VERSION,
);
