import { z } from 'zod';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const DailyNutritionLogV1Schema = z.object({
  v: z.literal(1),
  date: DateStringSchema,
  totalKcal: z.number().nonnegative(),
  totalProteinG: z.number().nonnegative(),
  totalCarbsG: z.number().nonnegative(),
  totalFatG: z.number().nonnegative(),
  totalFiberG: z.number().nonnegative().optional(),
  mealCount: z.number().int().nonnegative(),
  waterMl: z.number().int().nonnegative().optional(),
  // Micronutrient aggregates (optional, only if data available)
  vitD_iu: z.number().nonnegative().optional(),
  vitB12_mcg: z.number().nonnegative().optional(),
  vitB9_mcg: z.number().nonnegative().optional(),
  vitC_mg: z.number().nonnegative().optional(),
  iron_mg: z.number().nonnegative().optional(),
  magnesium_mg: z.number().nonnegative().optional(),
  zinc_mg: z.number().nonnegative().optional(),
  computedAt: TimestampSchema,
});

export type DailyNutritionLogV1 = z.infer<typeof DailyNutritionLogV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const DailyNutritionLogSchema = z.discriminatedUnion('v', [DailyNutritionLogV1Schema]);
export type DailyNutritionLog = z.infer<typeof DailyNutritionLogSchema>;

export const DAILY_NUTRITION_LOG_LATEST_VERSION = 1;
export type DailyNutritionLogLatest = DailyNutritionLogV1;

export const migrateDailyNutritionLog = createMigrator<DailyNutritionLog, DailyNutritionLogLatest>(
  DailyNutritionLogSchema,
  {},
  DAILY_NUTRITION_LOG_LATEST_VERSION,
);
