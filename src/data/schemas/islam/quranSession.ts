import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

const TimeHHMMSchema = z.string().regex(/^\d{2}:\d{2}$/);

const QuranWirdSlotSchema = z.object({
  timeHHMM: TimeHHMMSchema,
  ayahsRead: z.number().int().positive(),
});
export type QuranWirdSlot = z.infer<typeof QuranWirdSlotSchema>;

// ─── V1 — Sessions fragmentées par date ───────────────────────────────────────
// Liste des sessions de Wird (lecture Coran) pour une date donnée.
// Clé storage : islam.quran.sessions.{date}

export const QuranSessionV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  sessions: z.array(QuranWirdSlotSchema),
  updatedAt: TimestampSchema,
});

export type QuranSessionV1 = z.infer<typeof QuranSessionV1Schema>;
export type QuranSessionLatest = QuranSessionV1;

export const QuranSessionSchema = z.discriminatedUnion('v', [QuranSessionV1Schema]);
export type QuranSession = z.infer<typeof QuranSessionSchema>;

export const QURAN_SESSION_LATEST_VERSION = 1;

export const migrateQuranSession = createMigrator<QuranSession, QuranSessionLatest>(
  QuranSessionSchema,
  {},
  QURAN_SESSION_LATEST_VERSION,
);
