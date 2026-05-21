import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const MealSourceSchema = z.enum(['manual', 'db', 'quick', 'custom']);
export type MealSource = z.infer<typeof MealSourceSchema>;

export const MealTypeSchema = z.enum(['suhoor', 'dejeuner', 'diner', 'collation']);
export type MealType = z.infer<typeof MealTypeSchema>;

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const MealEntryV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  name: z.string().min(1),
  kcal: z.number().nonnegative(),
  p: z.number().nonnegative(),
  c: z.number().nonnegative(),
  f: z.number().nonnegative(),
  timestamp: TimestampSchema,
  source: MealSourceSchema,
  // Champs optionnels (rétro-compatibles, pas de migration requise)
  meal: MealTypeSchema.optional(),
  grams: z.number().positive().optional(),
  timeHHMM: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  foodId: z.string().optional(),
  fiberG: z.number().nonnegative().optional(),
});

export type MealEntryV1 = z.infer<typeof MealEntryV1Schema>;

// ─── V2: 5 modifiable slots + free label + items ─────────────────────────────
// mealSlot replaces meal enum: 1-5 (user-assignable, no fixed meaning)
// mealLabel: free text name for the slot (e.g. "Check protéine", "Pré-séance")
// items: individual food items composing this entry (for multi-food meals)

const MealItemSchema = z.object({
  foodId: z.string().min(1),
  grams: z.number().positive(),
  name: z.string().min(1),
  kcal: z.number().nonnegative(),
  p: z.number().nonnegative(),
  c: z.number().nonnegative(),
  f: z.number().nonnegative(),
});

export const MealEntryV2Schema = MealEntryV1Schema.extend({
  v: z.literal(2),
  mealSlot: z.number().int().min(1).max(5),
  mealLabel: z.string().optional(),
  items: z.array(MealItemSchema).optional(),
  nutritionScore: z.number().int().min(0).max(100).optional(),
});

export type MealEntryV2 = z.infer<typeof MealEntryV2Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const MealEntrySchema = z.discriminatedUnion('v', [
  MealEntryV1Schema,
  MealEntryV2Schema,
]);
export type MealEntry = z.infer<typeof MealEntrySchema>;

export const MEAL_ENTRY_LATEST_VERSION = 2;
export type MealEntryLatest = MealEntryV2;

// ─── Migrations ───────────────────────────────────────────────────────────────

export const MEAL_TYPE_TO_SLOT: Record<MealType, number> = {
  suhoor:    1,
  dejeuner:  2,
  diner:     3,
  collation: 4,
};

const migrations = {
  1: (data: MealEntryV1): MealEntryV2 => ({
    ...data,
    v: 2,
    mealSlot: data.meal ? (MEAL_TYPE_TO_SLOT[data.meal] ?? 5) : 5,
    mealLabel: data.meal ?? undefined,
  }),
};

export const migrateMealEntry = createMigrator<MealEntry, MealEntryLatest>(
  MealEntrySchema,
  migrations,
  MEAL_ENTRY_LATEST_VERSION,
);
