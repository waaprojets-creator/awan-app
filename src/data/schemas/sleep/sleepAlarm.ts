import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const SleepAlarmV1Schema = z.object({
  v:        z.literal(1),
  id:       IdSchema,
  /** Date de réveil programmé (YYYY-MM-DD). Composante de la clé storage. */
  date:     DateStringSchema,
  /** Heure de réveil souhaitée. Format HH:MM. */
  timeHHMM: z.string().regex(/^\d{2}:\d{2}$/),
  /** Étiquette libre : "Fajr", "Travail", "Sport", … */
  label:    z.string().optional(),
  /** false = alarme désactivée (gardée pour historique delta). */
  enabled:  z.boolean(),
  timestamp: TimestampSchema,
});

export type SleepAlarmV1 = z.infer<typeof SleepAlarmV1Schema>;
export type SleepAlarmLatest = SleepAlarmV1;

export const SleepAlarmSchema = z.discriminatedUnion('v', [SleepAlarmV1Schema]);
export type SleepAlarm = z.infer<typeof SleepAlarmSchema>;

export const SLEEP_ALARM_LATEST_VERSION = 1;

export const migrateSleepAlarm = createMigrator<SleepAlarm, SleepAlarmLatest>(
  SleepAlarmSchema,
  {},
  SLEEP_ALARM_LATEST_VERSION,
);
