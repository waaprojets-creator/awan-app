import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const MeasurementV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  weight: z.number().nonnegative(),
  bpm_rest: z.number().nonnegative(),
  body_fat_pct: z.number().nonnegative(),
  measurements: z.record(z.string(), z.number()),
  skinfolds: z.record(z.string(), z.number()),
  savedAt: TimestampSchema,
});

export type MeasurementV1 = z.infer<typeof MeasurementV1Schema>;
export type MeasurementLatest = MeasurementV1;

export const MeasurementSchema = z.discriminatedUnion('v', [MeasurementV1Schema]);
export type Measurement = z.infer<typeof MeasurementSchema>;

export const MEASUREMENT_LATEST_VERSION = 1;

export const migrateMeasurement = createMigrator<Measurement, MeasurementLatest>(
  MeasurementSchema,
  {},
  MEASUREMENT_LATEST_VERSION,
);
