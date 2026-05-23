import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

// ─── V1 (legacy, 5 prières obligatoires) ─────────────────────────────────────

const PRAYER_NAMES_V1 = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
type PrayerNameV1 = typeof PRAYER_NAMES_V1[number];

export const PrayerLogV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  prayers: z.record(z.enum(PRAYER_NAMES_V1), z.boolean()),
  savedAt: TimestampSchema,
});

export type PrayerLogV1 = z.infer<typeof PrayerLogV1Schema>;

// ─── V2 — Nomenclature malékite tunisienne (7 prières + heure réelle) ────────
// fajr_sunnah : 2 rakats sunnah avant Sobh (recommandé hautement)
// sobh        : Fard obligatoire (= horaire calculé 'fajr' de adhan)
// witr        : Shaf'a & Witr, prière nocturne sunnah (après Isha)

export const PRAYER_NAMES = [
  'fajr_sunnah',
  'sobh',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
  'witr',
] as const;
export type PrayerName = typeof PRAYER_NAMES[number];

const TimeHHMMSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const PrayerLogV2Schema = z.object({
  v: z.literal(2),
  id: IdSchema,
  date: DateStringSchema,
  prayers: z.record(z.enum(PRAYER_NAMES), z.boolean()),
  /** Heure réelle (HH:MM) saisie par l'utilisateur. null/undefined = pas saisi. */
  prayerTimes: z.record(z.enum(PRAYER_NAMES), TimeHHMMSchema.nullable()).optional(),
  savedAt: TimestampSchema,
});

export type PrayerLogV2 = z.infer<typeof PrayerLogV2Schema>;
export type PrayerLogLatest = PrayerLogV2;

export const PrayerLogSchema = z.discriminatedUnion('v', [PrayerLogV1Schema, PrayerLogV2Schema]);
export type PrayerLog = z.infer<typeof PrayerLogSchema>;

export const PRAYER_LOG_LATEST_VERSION = 2;

// V1 → V2 : old 'fajr' boolean devient 'sobh' (la Fard du matin).
// Les 2 nouvelles prières (fajr_sunnah, witr) sont initialisées à false.
const migrations = {
  1: (data: PrayerLogV1): PrayerLogV2 => {
    const prayersV1 = data.prayers as Partial<Record<PrayerNameV1, boolean>>;
    return {
      v: 2 as const,
      id: data.id,
      date: data.date,
      savedAt: data.savedAt,
      prayers: {
        fajr_sunnah: false,
        sobh:    prayersV1.fajr    ?? false,
        dhuhr:   prayersV1.dhuhr   ?? false,
        asr:     prayersV1.asr     ?? false,
        maghrib: prayersV1.maghrib ?? false,
        isha:    prayersV1.isha    ?? false,
        witr:    false,
      },
    };
  },
};

export const migratePrayerLog = createMigrator<PrayerLog, PrayerLogLatest>(
  PrayerLogSchema,
  migrations,
  PRAYER_LOG_LATEST_VERSION,
);
