import { z } from 'zod';
import { IdSchema } from '../common/id';
import { createMigrator } from '../../migrations/runner';

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const FoodItemV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  n: z.string().min(1),
  kcal: z.number().nonnegative(),
  p: z.number().nonnegative(),
  c: z.number().nonnegative(),
  f: z.number().nonnegative(),
  fiberG: z.number().nonnegative().optional(),
  halal: z.boolean(),
  barcode: z.string().optional(),
  // Micronutrients (optional, progressive enrichment)
  vitD_iu: z.number().nonnegative().optional(),
  vitB12_mcg: z.number().nonnegative().optional(),
  vitB9_mcg: z.number().nonnegative().optional(),
  vitC_mg: z.number().nonnegative().optional(),
  iron_mg: z.number().nonnegative().optional(),
  magnesium_mg: z.number().nonnegative().optional(),
  zinc_mg: z.number().nonnegative().optional(),
  calcium_mg: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional(),
  potassium_mg: z.number().nonnegative().optional(),
  omega3_mg: z.number().nonnegative().optional(),
});

export type FoodItemV1 = z.infer<typeof FoodItemV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const FoodItemSchema = z.discriminatedUnion('v', [FoodItemV1Schema]);
export type FoodItem = z.infer<typeof FoodItemSchema>;

export const FOOD_ITEM_LATEST_VERSION = 1;
export type FoodItemLatest = FoodItemV1;

export const migrateFoodItem = createMigrator<FoodItem, FoodItemLatest>(
  FoodItemSchema,
  {},
  FOOD_ITEM_LATEST_VERSION,
);
