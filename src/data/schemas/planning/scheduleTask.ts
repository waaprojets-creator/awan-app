import { z } from 'zod';
import { IdSchema } from '../common/id';
import { createMigrator } from '../../migrations/runner';

export const EnergyLevelSchema = z.enum(['low', 'medium', 'high']);
export type EnergyLevel = z.infer<typeof EnergyLevelSchema>;

export const TaskDomainSchema = z.enum([
  'sport', 'nutrition', 'anthropo', 'sleep',
  'islam', 'planning', 'mental', 'general',
]);
export type TaskDomain = z.infer<typeof TaskDomainSchema>;

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const ScheduleTaskV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  title: z.string().min(1),
  durationMin: z.number().int().positive(),
  priority: z.number().int().min(1).max(5),
  energyLevel: EnergyLevelSchema,
  domain: TaskDomainSchema,
  tags: z.array(z.string()),
  /** Pin to exact minute-of-day (0–1439). Overrides all other constraints. */
  fixedStartMin: z.number().int().min(0).max(1439).optional(),
  /** Cannot start before this minute */
  notBeforeMin: z.number().int().min(0).max(1439).optional(),
  /** Must end before this minute */
  notAfterMin: z.number().int().min(0).max(1439).optional(),
  /** IDs of tasks that must be scheduled earlier in the day */
  dependsOn: z.array(z.string()),
  enabled: z.boolean(),
});

export type ScheduleTaskV1 = z.infer<typeof ScheduleTaskV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const ScheduleTaskSchema = z.discriminatedUnion('v', [ScheduleTaskV1Schema]);
export type ScheduleTask = z.infer<typeof ScheduleTaskSchema>;

export const SCHEDULE_TASK_LATEST_VERSION = 1;
export type ScheduleTaskLatest = ScheduleTaskV1;

export const migrateScheduleTask = createMigrator<ScheduleTask, ScheduleTaskLatest>(
  ScheduleTaskSchema,
  {},
  SCHEDULE_TASK_LATEST_VERSION,
);
