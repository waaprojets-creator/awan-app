import { z } from 'zod';
import { createMigrator } from '../../migrations/runner';

// ─── Profil nutritionnel (singleton) ─────────────────────────────────────────
// Forme réelle utilisée par l'app (Mifflin-St Jeor + cibles macros). Distinct de
// nutritionTargets.ts (modèle adaptatif non câblé).

export const ActivitySchema = z.enum(['sedentary', 'light', 'moderate', 'active', 'veryActive']);
export type Activity = z.infer<typeof ActivitySchema>;

export const GoalSchema = z.enum(['lose', 'maintain', 'gain']);
export type Goal = z.infer<typeof GoalSchema>;

export const NutritionProfileV1Schema = z.object({
  v: z.literal(1),
  weightKg: z.number().positive(),
  heightCm: z.number().positive(),
  age: z.number().int().positive(),
  activity: ActivitySchema,
  goal: GoalSchema,
  targetKcal: z.number().nonnegative(),
  targetP: z.number().nonnegative(),
  targetC: z.number().nonnegative(),
  targetF: z.number().nonnegative(),
});

export type NutritionProfileV1 = z.infer<typeof NutritionProfileV1Schema>;
export type NutritionProfileLatest = NutritionProfileV1;

export const NutritionProfileSchema = z.discriminatedUnion('v', [NutritionProfileV1Schema]);
export type NutritionProfile = z.infer<typeof NutritionProfileSchema>;

export const NUTRITION_PROFILE_LATEST_VERSION = 1;

export const migrateNutritionProfile = createMigrator<NutritionProfile, NutritionProfileLatest>(
  NutritionProfileSchema,
  {},
  NUTRITION_PROFILE_LATEST_VERSION,
);
