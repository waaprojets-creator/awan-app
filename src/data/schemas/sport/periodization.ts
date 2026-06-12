import { z } from 'zod';
import { DateStringSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

// ─── V1 — état du mésocycle (singleton) ──────────────────────────────────────
// phase 0=reprise neuro · 1=recomposition active · 2=périodisation avancée

export const PeriodizationV1Schema = z.object({
  v: z.literal(1),
  phase: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  mesoWeek: z.number().int().positive(),
  startDate: DateStringSchema,
  deloadTriggered: z.boolean(),
});

export type PeriodizationV1 = z.infer<typeof PeriodizationV1Schema>;
export type PeriodizationLatest = PeriodizationV1;

export const PeriodizationSchema = z.discriminatedUnion('v', [PeriodizationV1Schema]);
export type Periodization = z.infer<typeof PeriodizationSchema>;

export const PERIODIZATION_LATEST_VERSION = 1;

export const migratePeriodization = createMigrator<Periodization, PeriodizationLatest>(
  PeriodizationSchema,
  {},
  PERIODIZATION_LATEST_VERSION,
);
