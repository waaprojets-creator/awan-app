import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const WeightEntryV1Schema = z.object({
  v:        z.literal(1),
  id:       IdSchema,
  date:     DateStringSchema,
  timestamp: TimestampSchema,
  weightKg: z.number().min(0).max(500),
  note:     z.string().optional(),
});

export type WeightEntryV1 = z.infer<typeof WeightEntryV1Schema>;
export type WeightEntryLatest = WeightEntryV1;

export const WeightEntrySchema = z.discriminatedUnion('v', [WeightEntryV1Schema]);
export type WeightEntry = z.infer<typeof WeightEntrySchema>;

export const WEIGHT_ENTRY_LATEST_VERSION = 1;

export const migrateWeightEntry = createMigrator<WeightEntry, WeightEntryLatest>(
  WeightEntrySchema,
  {},
  WEIGHT_ENTRY_LATEST_VERSION,
);
