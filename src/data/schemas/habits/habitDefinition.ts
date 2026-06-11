import { z } from 'zod';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const HABIT_DOMAINS = ['sport', 'islam', 'cognitif', 'nutrition', 'sante', 'autre'] as const;
export type HabitDomain = typeof HABIT_DOMAINS[number];

export const HabitDefinitionV1Schema = z.object({
  v:           z.literal(1),
  id:          z.string().min(1),           // slug: 'meditation_matin' — généré une fois
  name:        z.string().min(1),
  description: z.string().optional(),
  daysOfWeek:  z.array(z.number().int().min(0).max(6)), // [] = tous les jours, [1,3,5] = L/M/V
  domain:      z.enum(HABIT_DOMAINS).optional(),
  order:       z.number().int().nonnegative(),
  isActive:    z.boolean().default(true),
  startDate:   DateStringSchema.optional(),  // routine temporaire (Ramadan, mésocycle…)
  endDate:     DateStringSchema.optional(),
  savedAt:     TimestampSchema,
});

export type HabitDefinitionV1 = z.infer<typeof HabitDefinitionV1Schema>;
export type HabitDefinitionLatest = HabitDefinitionV1;

export const HabitDefinitionSchema = z.discriminatedUnion('v', [HabitDefinitionV1Schema]);
export type HabitDefinition = z.infer<typeof HabitDefinitionSchema>;

export const HABIT_DEFINITION_LATEST_VERSION = 1;

export const migrateHabitDefinition = createMigrator<HabitDefinition, HabitDefinitionLatest>(
  HabitDefinitionSchema,
  {},
  HABIT_DEFINITION_LATEST_VERSION,
);

/** Retourne true si une habitude est active et planifiée pour la date donnée. */
export function isHabitScheduled(habit: HabitDefinitionLatest, date: string): boolean {
  if (!habit.isActive) return false;
  if (habit.startDate && date < habit.startDate) return false;
  if (habit.endDate && date > habit.endDate) return false;
  if (habit.daysOfWeek.length === 0) return true; // tous les jours
  const dow = new Date(`${date}T00:00:00`).getDay(); // 0=dim … 6=sam
  return habit.daysOfWeek.includes(dow);
}

/** Génère un slug unique depuis un nom (ex: "Méditation Matin" → "meditation_matin_1749600000"). */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base}_${Math.floor(Date.now() / 1000)}`;
}
