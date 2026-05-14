import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { ActivityRecordV1Schema } from './activityRecord';
import { createMigrator } from '../../migrations/runner';

export const DailySummaryV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  generatedAt: TimestampSchema,
  totalSteps: z.number().int().nonnegative(),
  totalDistanceM: z.number().nonnegative(),
  totalCaloriesKcal: z.number().nonnegative(),
  totalActiveMinutes: z.number().int().nonnegative(),
  records: z.array(ActivityRecordV1Schema),
});

export type DailySummaryV1 = z.infer<typeof DailySummaryV1Schema>;

export const DailySummarySchema = z.discriminatedUnion('v', [DailySummaryV1Schema]);
export type DailySummary = z.infer<typeof DailySummarySchema>;

export const DAILY_SUMMARY_LATEST_VERSION = 1;
export type DailySummaryLatest = DailySummaryV1;

export const migrateDailySummary = createMigrator<DailySummary, DailySummaryLatest>(
  DailySummarySchema,
  {},
  DAILY_SUMMARY_LATEST_VERSION,
);
