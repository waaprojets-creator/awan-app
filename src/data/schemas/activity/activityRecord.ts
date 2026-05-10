import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const ActivityTypeSchema = z.enum(['steps', 'workout', 'gps_track', 'manual']);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const ActivityRecordV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  type: ActivityTypeSchema,
  source: z.string().min(1),
  steps: z.number().int().nonnegative().optional(),
  distanceM: z.number().nonnegative().optional(),
  caloriesKcal: z.number().nonnegative().optional(),
  activeMinutes: z.number().int().nonnegative().optional(),
  startedAt: TimestampSchema.optional(),
  endedAt: TimestampSchema.optional(),
});

export type ActivityRecordV1 = z.infer<typeof ActivityRecordV1Schema>;

export const ActivityRecordSchema = z.discriminatedUnion('v', [ActivityRecordV1Schema]);
export type ActivityRecord = z.infer<typeof ActivityRecordSchema>;

export const ACTIVITY_RECORD_LATEST_VERSION = 1;
export type ActivityRecordLatest = ActivityRecordV1;

export const migrateActivityRecord = createMigrator<ActivityRecord, ActivityRecordLatest>(
  ActivityRecordSchema,
  {},
  ACTIVITY_RECORD_LATEST_VERSION,
);
