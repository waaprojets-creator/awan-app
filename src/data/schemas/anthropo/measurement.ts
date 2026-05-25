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
  whtr: z.number().nonnegative().optional(),
  whr:  z.number().nonnegative().optional(),
});

export const MeasurementV2Schema = z.object({
  v: z.literal(2),
  id: IdSchema,
  date: DateStringSchema,
  bpm_rest: z.number().nonnegative(),
  body_fat_pct: z.number().nonnegative(),
  measurements: z.record(z.string(), z.number()),
  skinfolds: z.record(z.string(), z.number()),
  savedAt: TimestampSchema,
  whtr: z.number().nonnegative().optional(),
  whr:  z.number().nonnegative().optional(),
});

export type MeasurementV1 = z.infer<typeof MeasurementV1Schema>;
export type MeasurementV2 = z.infer<typeof MeasurementV2Schema>;
export type MeasurementLatest = MeasurementV2;

export const MeasurementSchema = z.discriminatedUnion('v', [MeasurementV1Schema, MeasurementV2Schema]);
export type Measurement = z.infer<typeof MeasurementSchema>;

export const MEASUREMENT_LATEST_VERSION = 2;

export const migrateMeasurement = createMigrator<Measurement, MeasurementLatest>(
  MeasurementSchema,
  {
    1: (v1: MeasurementV1): MeasurementV2 => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { weight: _w, ...rest } = v1;
      return { ...rest, v: 2 };
    },
  },
  MEASUREMENT_LATEST_VERSION,
);
