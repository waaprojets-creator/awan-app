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

// ─── V1 — Sessions Coran ─────────────────────────────────────────────────────
// Chaque session de lecture — date top-level pour listFiltered() et aggregate() SQL
// ayahsRead top-level pour SUM hebdomadaire sans charger les JSON
// Clé : islam.quran.session.{YYYY-MM-DD}.{ms}  (id = "{date}.{ms}")
// sessions[] conservé pour compatibilité avec useQuranSessionStore (Wird slots)

export const QuranSessionV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  ayahsRead: z.number().int().nonnegative(),
  surahStart: z.number().int().min(1).max(114),
  ayahStart: z.number().int().min(1),
  surahEnd: z.number().int().min(1).max(114).optional(),
  ayahEnd: z.number().int().min(1).optional(),
  durationMin: z.number().nonnegative().optional(),
  timestamp: TimestampSchema,
  // Legacy Wird slot support
  sessions: z.array(QuranWirdSlotSchema).optional(),
  updatedAt: TimestampSchema.optional(),
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
