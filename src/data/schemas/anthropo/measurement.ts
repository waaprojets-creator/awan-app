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

export type MeasurementV1 = z.infer<typeof MeasurementV1Schema>;

// ─── V2: BF% pré-calculés à l'écriture pour aggregate() SQL sans itérer skinfolds ──

export const MeasurementV2Schema = MeasurementV1Schema.extend({
  v: z.literal(2),
  s13_sum: z.number().nonnegative().nullable().optional(),     // somme 13 plis (mm)
  bf_pct_jp7: z.number().nonnegative().nullable().optional(),  // Jackson-Pollock 7 sites
  bf_pct_dw4: z.number().nonnegative().nullable().optional(),  // Durnin-Womersley 4 sites
  ffmi: z.number().nonnegative().nullable().optional(),        // FFMI normalisé (Kouri 1995)
  // measurements{} conserve la convention _left/_right pour symmetryService.analyzeSymmetry()
});

export type MeasurementV2 = z.infer<typeof MeasurementV2Schema>;
export type MeasurementLatest = MeasurementV2;

export const MeasurementSchema = z.discriminatedUnion('v', [
  MeasurementV1Schema,
  MeasurementV2Schema,
]);
export type Measurement = z.infer<typeof MeasurementSchema>;

export const MEASUREMENT_LATEST_VERSION = 2;

const measurementMigrations = {
  1: (data: MeasurementV1): MeasurementV2 => ({
    ...data,
    v: 2,
    s13_sum: null,
    bf_pct_jp7: null,
    bf_pct_dw4: null,
    ffmi: null,
  }),
};

export const migrateMeasurement = createMigrator<Measurement, MeasurementLatest>(
  MeasurementSchema,
  measurementMigrations,
  MEASUREMENT_LATEST_VERSION,
);
