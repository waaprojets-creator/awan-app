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
export type SleepEntryLatest = SleepEntryV1;

export const SleepEntrySchema = z.discriminatedUnion('v', [SleepEntryV1Schema]);
export type SleepEntry = z.infer<typeof SleepEntrySchema>;

export const SLEEP_ENTRY_LATEST_VERSION = 1;

export const migrateSleepEntry = createMigrator<SleepEntry, SleepEntryLatest>(
  SleepEntrySchema,
  {},
  SLEEP_ENTRY_LATEST_VERSION,
);
