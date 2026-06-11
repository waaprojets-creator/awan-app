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

export const WeightEntryV2Schema = z.object({
  v:       z.literal(2),
  date:    DateStringSchema,
  timezone: z.string().default('UTC'),
  weight:  z.number().positive(),
  savedAt: TimestampSchema,
});

export const WeightEntryV3Schema = z.object({
  v:        z.literal(3),
  date:     DateStringSchema,
  timezone: z.string().default('UTC'),
  weight:   z.number().positive().optional(),   // optionnel : peut avoir bpm sans pesée
  bpm_rest: z.number().nonnegative().optional(), // FC au repos, déplacé depuis Measurement
  savedAt:  TimestampSchema,
});

export type WeightEntryV1 = z.infer<typeof WeightEntryV1Schema>;
export type WeightEntryV2 = z.infer<typeof WeightEntryV2Schema>;
export type WeightEntryV3 = z.infer<typeof WeightEntryV3Schema>;
export type WeightEntryLatest = WeightEntryV3;

export const WeightEntrySchema = z.discriminatedUnion('v', [WeightEntryV1Schema, WeightEntryV2Schema, WeightEntryV3Schema]);
export type WeightEntry = z.infer<typeof WeightEntrySchema>;

export const WEIGHT_ENTRY_LATEST_VERSION = 3;

export const migrateWeightEntry = createMigrator<WeightEntry, WeightEntryLatest>(
  WeightEntrySchema,
  {
    1: (data: WeightEntryV1): WeightEntryV2 => ({
      v: 2,
      date: data.date,
      timezone: 'UTC',
      weight: data.weightKg,
      savedAt: data.timestamp,
    }),
    2: (data: WeightEntryV2): WeightEntryV3 => ({
      v: 3,
      date: data.date,
      timezone: data.timezone,
      weight: data.weight,
      savedAt: data.savedAt,
      // bpm_rest absent en V2 — undefined par défaut
    }),
  },
  WEIGHT_ENTRY_LATEST_VERSION,
);
