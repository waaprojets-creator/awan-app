import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const MealSourceSchema = z.enum(['manual', 'db', 'quick']);
export type MealSource = z.infer<typeof MealSourceSchema>;

export const MealTypeSchema = z.enum(['suhoor', 'dejeuner', 'diner', 'collation']);
export type MealType = z.infer<typeof MealTypeSchema>;

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
});

export type MealEntryV1 = z.infer<typeof MealEntryV1Schema>;
export type MealEntryLatest = MealEntryV1;

export const MealEntrySchema = z.discriminatedUnion('v', [MealEntryV1Schema]);
export type MealEntry = z.infer<typeof MealEntrySchema>;

export const MEAL_ENTRY_LATEST_VERSION = 1;

export const migrateMealEntry = createMigrator<MealEntry, MealEntryLatest>(
  MealEntrySchema,
  {},
  MEAL_ENTRY_LATEST_VERSION,
);
