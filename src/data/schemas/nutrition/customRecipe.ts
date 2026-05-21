import { z } from 'zod';
import { IdSchema } from '../common/id';
import { TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

const RecipeIngredientSchema = z.object({
  foodId: z.string().min(1),
  grams: z.number().positive(),
});

const MacrosPer100gSchema = z.object({
  kcal: z.number().nonnegative(),
  p: z.number().nonnegative(),
  c: z.number().nonnegative(),
  f: z.number().nonnegative(),
  fiberG: z.number().nonnegative().optional(),
});

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const CustomRecipeV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  name: z.string().min(1),
  ingredients: z.array(RecipeIngredientSchema).min(1),
  totalGrams: z.number().positive(),
  computedPer100g: MacrosPer100gSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type CustomRecipeV1 = z.infer<typeof CustomRecipeV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const CustomRecipeSchema = z.discriminatedUnion('v', [CustomRecipeV1Schema]);
export type CustomRecipe = z.infer<typeof CustomRecipeSchema>;

export const CUSTOM_RECIPE_LATEST_VERSION = 1;
export type CustomRecipeLatest = CustomRecipeV1;

export const migrateCustomRecipe = createMigrator<CustomRecipe, CustomRecipeLatest>(
  CustomRecipeSchema,
  {},
  CUSTOM_RECIPE_LATEST_VERSION,
);
