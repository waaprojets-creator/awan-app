import { z } from 'zod';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

// ─── V1 ───────────────────────────────────────────────────────────────────────
// Clé : habit.occurrence.{YYYY-MM-DD}.{ms}
// Une occurrence = un habit validé à un moment précis.
// habit.history reste le silo léger pour le score de complétion du dashboard.

export const HabitOccurrenceV1Schema = z.object({
  v:           z.literal(1),
  id:          z.string().min(1),           // dateId : "{date}.{ms}"
  date:        DateStringSchema,
  habitId:     z.string().min(1),           // ref → habit.definition
  habitName:   z.string().min(1),           // snapshot du nom au moment de la validation
  timeHHMM:    z.string().regex(/^\d{2}:\d{2}$/).optional(), // heure réelle de complétion
  durationMin: z.number().nonnegative().optional(),          // durée effective
  note:        z.string().optional(),
  timezone:    z.string().default('UTC'),
  timestamp:   TimestampSchema,
});

export type HabitOccurrenceV1 = z.infer<typeof HabitOccurrenceV1Schema>;
export type HabitOccurrenceLatest = HabitOccurrenceV1;

export const HabitOccurrenceSchema = z.discriminatedUnion('v', [HabitOccurrenceV1Schema]);
export type HabitOccurrence = z.infer<typeof HabitOccurrenceSchema>;

export const HABIT_OCCURRENCE_LATEST_VERSION = 1;

export const migrateHabitOccurrence = createMigrator<HabitOccurrence, HabitOccurrenceLatest>(
  HabitOccurrenceSchema,
  {},
  HABIT_OCCURRENCE_LATEST_VERSION,
);
