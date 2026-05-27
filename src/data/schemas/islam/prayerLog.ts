import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = typeof PRAYER_NAMES[number];

export const PrayerLogV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  prayers: z.record(z.enum(PRAYER_NAMES), z.boolean()),
  savedAt: TimestampSchema,
});

export type PrayerLogV1 = z.infer<typeof PrayerLogV1Schema>;

// ─── V2: 7 prières + scores pré-calculés pour aggregate() ────────────────────
// fardScore et adherenceScore stockés top-level → SUM/AVG SQL sans charger tous les records

export const PRAYER_NAMES_V2 = ['fajr', 'fajr_sunnah', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'] as const;
export type PrayerNameV2 = typeof PRAYER_NAMES_V2[number];

export const FARD_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export const PrayerLogV2Schema = z.object({
  v: z.literal(2),
  id: IdSchema,
  date: DateStringSchema,
  prayers: z.record(z.enum(PRAYER_NAMES_V2), z.boolean()),
  savedAt: TimestampSchema,
  adherenceScore: z.number().min(0).max(1),  // trueCount / 7 (prières totales)
  fardScore: z.number().min(0).max(1),       // fard trueCount / 5
  prayerTimes: z.record(z.enum(PRAYER_NAMES_V2), z.string().regex(/^\d{2}:\d{2}$/)).optional(),
});

export type PrayerLogV2 = z.infer<typeof PrayerLogV2Schema>;
export type PrayerLogLatest = PrayerLogV2;

// ─── Union ────────────────────────────────────────────────────────────────────

export const PrayerLogSchema = z.discriminatedUnion('v', [
  PrayerLogV1Schema,
  PrayerLogV2Schema,
]);
export type PrayerLog = z.infer<typeof PrayerLogSchema>;

export const PRAYER_LOG_LATEST_VERSION = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function computePrayerScores(prayers: Record<string, boolean>): { adherenceScore: number; fardScore: number } {
  const trueCount = Object.values(prayers).filter(Boolean).length;
  const fardCount = FARD_PRAYERS.filter(p => prayers[p]).length;
  return {
    adherenceScore: parseFloat((trueCount / PRAYER_NAMES_V2.length).toFixed(3)),
    fardScore: parseFloat((fardCount / FARD_PRAYERS.length).toFixed(3)),
  };
}

// ─── Migrations ───────────────────────────────────────────────────────────────

const prayerMigrations = {
  1: (data: PrayerLogV1): PrayerLogV2 => {
    const prayers: Record<PrayerNameV2, boolean> = {
      fajr: data.prayers.fajr ?? false,
      fajr_sunnah: false,
      dhuhr: data.prayers.dhuhr ?? false,
      asr: data.prayers.asr ?? false,
      maghrib: data.prayers.maghrib ?? false,
      isha: data.prayers.isha ?? false,
      witr: false,
    };
    return {
      ...data,
      v: 2,
      prayers,
      ...computePrayerScores(prayers),
    };
  },
};

export const migratePrayerLog = createMigrator<PrayerLog, PrayerLogLatest>(
  PrayerLogSchema,
  prayerMigrations,
  PRAYER_LOG_LATEST_VERSION,
);
