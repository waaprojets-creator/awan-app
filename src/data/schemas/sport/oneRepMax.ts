import { z } from 'zod';
import { TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

// ─── V1 — meilleurs 1RM par exercice (singleton) ─────────────────────────────
// records : exerciseId → 1RM estimé (kg). Source de vérité des PR.

export const OneRepMaxV1Schema = z.object({
  v: z.literal(1),
  records: z.record(z.string(), z.number().nonnegative()),
  updatedAt: TimestampSchema,
});

export type OneRepMaxV1 = z.infer<typeof OneRepMaxV1Schema>;
export type OneRepMaxLatest = OneRepMaxV1;

export const OneRepMaxSchema = z.discriminatedUnion('v', [OneRepMaxV1Schema]);
export type OneRepMax = z.infer<typeof OneRepMaxSchema>;

export const ONE_REP_MAX_LATEST_VERSION = 1;

export const migrateOneRepMax = createMigrator<OneRepMax, OneRepMaxLatest>(
  OneRepMaxSchema,
  {},
  ONE_REP_MAX_LATEST_VERSION,
);
