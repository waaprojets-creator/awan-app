import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const ScheduledSlotSchema = z.object({
  taskId: z.string(),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(0).max(1440),
});

export type ScheduledSlot = z.infer<typeof ScheduledSlotSchema>;

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const DayScheduleV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  generatedAt: TimestampSchema,
  /** Ordered slots (sorted by startMin) */
  slots: z.array(ScheduledSlotSchema),
  /** IDs of tasks the scheduler could not fit */
  unscheduled: z.array(z.string()),
});

export type DayScheduleV1 = z.infer<typeof DayScheduleV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const DayScheduleSchema = z.discriminatedUnion('v', [DayScheduleV1Schema]);
export type DaySchedule = z.infer<typeof DayScheduleSchema>;

export const DAY_SCHEDULE_LATEST_VERSION = 1;
export type DayScheduleLatest = DayScheduleV1;

export const migrateDaySchedule = createMigrator<DaySchedule, DayScheduleLatest>(
  DayScheduleSchema,
  {},
  DAY_SCHEDULE_LATEST_VERSION,
);
