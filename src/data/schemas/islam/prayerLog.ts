import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
// IdSchema est conservé pour V1 (legacy) uniquement — retiré de V2.
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

// ─── V2 — Nomenclature malékite tunisienne (7 prières + scores pré-calculés) ─
// fajr_sunnah : 2 rakats sunnah avant Sobh (recommandé hautement)
// witr        : Shaf'a & Witr, prière nocturne sunnah (après Isha)
// fardScore et adherenceScore stockés top-level → SUM/AVG SQL sans charger tous les records

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

// Alias V2 for compatibility with branches using PRAYER_NAMES_V2
export const PRAYER_NAMES_V2 = PRAYER_NAMES;
export type PrayerNameV2 = PrayerName;

export const FARD_PRAYERS = ['sobh', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const TimeHHMMSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const PrayerLogV2Schema = z.object({
  v: z.literal(2),
  date: DateStringSchema,
  // Contexte géographique pour l'analyse temporelle (assiduité vs heures réelles de prière).
  // .default('UTC') assure la compatibilité ascendante avec les données V2 stockées sans timezone.
  timezone: z.string().default('UTC'),
  prayers: z.record(z.enum(PRAYER_NAMES), z.boolean()),
  /** Heure réelle (HH:MM) saisie par l'utilisateur. null/undefined = pas saisi. */
  prayerTimes: z.record(z.enum(PRAYER_NAMES), TimeHHMMSchema.nullable()).optional(),
  savedAt: TimestampSchema,
  adherenceScore: z.number().min(0).max(1).optional(),  // trueCount / 7 (prières totales)
  fardScore: z.number().min(0).max(1).optional(),       // fard trueCount / 5
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
    adherenceScore: parseFloat((trueCount / PRAYER_NAMES.length).toFixed(3)),
    fardScore: parseFloat((fardCount / FARD_PRAYERS.length).toFixed(3)),
  };
}

// ─── Migrations ───────────────────────────────────────────────────────────────

const prayerMigrations = {
  // V1 → V2 : old 'fajr' boolean devient 'sobh' (la Fard du matin).
  // Les 2 nouvelles prières (fajr_sunnah, witr) sont initialisées à false.
  1: (data: PrayerLogV1): PrayerLogV2 => {
    const prayersV1 = data.prayers as Partial<Record<PrayerNameV1, boolean>>;
    const prayers: Record<PrayerName, boolean> = {
      fajr_sunnah: false,
      sobh:    prayersV1.fajr    ?? false,
      dhuhr:   prayersV1.dhuhr   ?? false,
      asr:     prayersV1.asr     ?? false,
      maghrib: prayersV1.maghrib ?? false,
      isha:    prayersV1.isha    ?? false,
      witr:    false,
    };
    return {
      v: 2 as const,
      date: data.date,
      timezone: 'UTC',
      savedAt: data.savedAt,
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
