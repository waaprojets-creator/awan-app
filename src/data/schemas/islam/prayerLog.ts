import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

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
export type PrayerLogLatest = PrayerLogV1;

export const PrayerLogSchema = z.discriminatedUnion('v', [PrayerLogV1Schema]);
export type PrayerLog = z.infer<typeof PrayerLogSchema>;

export const PRAYER_LOG_LATEST_VERSION = 1;

export const migratePrayerLog = createMigrator<PrayerLog, PrayerLogLatest>(
  PrayerLogSchema,
  {},
  PRAYER_LOG_LATEST_VERSION,
);
