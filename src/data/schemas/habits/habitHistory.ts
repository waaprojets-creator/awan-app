import { z } from 'zod';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const HabitHistoryV1Schema = z.object({
  v:           z.literal(1),
  date:        DateStringSchema,
  timezone:    z.string().default('UTC'),
  validations: z.record(z.string(), z.boolean()), // { [habitId]: true | false }
  savedAt:     TimestampSchema,
});

export type HabitHistoryV1 = z.infer<typeof HabitHistoryV1Schema>;
export type HabitHistoryLatest = HabitHistoryV1;

export const HabitHistorySchema = z.discriminatedUnion('v', [HabitHistoryV1Schema]);
export type HabitHistory = z.infer<typeof HabitHistorySchema>;

export const HABIT_HISTORY_LATEST_VERSION = 1;

export const migrateHabitHistory = createMigrator<HabitHistory, HabitHistoryLatest>(
  HabitHistorySchema,
  {},
  HABIT_HISTORY_LATEST_VERSION,
);

/** Score de complétion pour une journée : ratio habitudes validées / habitudes prévues. */
export function habitCompletionScore(
  history: HabitHistoryLatest,
  scheduledIds: string[],
): number {
  if (scheduledIds.length === 0) return 1;
  const done = scheduledIds.filter(id => history.validations[id] === true).length;
  return done / scheduledIds.length;
}
