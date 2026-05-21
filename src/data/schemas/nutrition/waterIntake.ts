import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

const WaterEntrySchema = z.object({
  timeHHMM: z.string().regex(/^\d{2}:\d{2}$/),
  ml: z.number().int().positive(),
});

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const WaterIntakeV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  totalMl: z.number().int().nonnegative(),
  entries: z.array(WaterEntrySchema),
  updatedAt: TimestampSchema,
});

export type WaterIntakeV1 = z.infer<typeof WaterIntakeV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const WaterIntakeSchema = z.discriminatedUnion('v', [WaterIntakeV1Schema]);
export type WaterIntake = z.infer<typeof WaterIntakeSchema>;

export const WATER_INTAKE_LATEST_VERSION = 1;
export type WaterIntakeLatest = WaterIntakeV1;

export const migrateWaterIntake = createMigrator<WaterIntake, WaterIntakeLatest>(
  WaterIntakeSchema,
  {},
  WATER_INTAKE_LATEST_VERSION,
);
