import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const SleepEntryV1Schema = z.object({
  v:         z.literal(1),
  id:        IdSchema,
  date:      DateStringSchema,
  timestamp: TimestampSchema,
  durationH: z.number().min(0).max(24),          // durée totale en heures
  quality:   z.number().int().min(1).max(5),      // 1=très mauvais 5=excellent
  note:      z.string().optional(),
  bedtime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),   // "23:30"
  wakeTime:  z.string().regex(/^\d{2}:\d{2}$/).optional(),   // "07:00"
});

export type SleepEntryV1 = z.infer<typeof SleepEntryV1Schema>;

// ─── V2: sleepScore pré-calculé pour aggregate() SQL ─────────────────────────
// score = (quality/5 × 50) + (clamp(durationH,6,9)−6)/3 × 50

export const SleepEntryV2Schema = SleepEntryV1Schema.extend({
  v: z.literal(2),
  sleepScore: z.number().int().min(0).max(100).optional(),
});

export type SleepEntryV2 = z.infer<typeof SleepEntryV2Schema>;
export type SleepEntryLatest = SleepEntryV2;

export const SleepEntrySchema = z.discriminatedUnion('v', [
  SleepEntryV1Schema,
  SleepEntryV2Schema,
]);
export type SleepEntry = z.infer<typeof SleepEntrySchema>;

export const SLEEP_ENTRY_LATEST_VERSION = 2;

export function computeSleepScore(quality: number, durationH: number): number {
  const qualityScore = (quality / 5) * 50;
  const durationScore = (Math.min(9, Math.max(6, durationH)) - 6) / 3 * 50;
  return Math.round(qualityScore + durationScore);
}

const sleepMigrations = {
  1: (data: SleepEntryV1): SleepEntryV2 => ({
    ...data,
    v: 2,
    sleepScore: computeSleepScore(data.quality, data.durationH),
  }),
};

export const migrateSleepEntry = createMigrator<SleepEntry, SleepEntryLatest>(
  SleepEntrySchema,
  sleepMigrations,
  SLEEP_ENTRY_LATEST_VERSION,
);
