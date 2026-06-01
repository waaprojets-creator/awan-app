import { z } from 'zod';
import { IdSchema } from '../common/id';
import { createMigrator } from '../../migrations/runner';

export const TaskDomainSchema = z.enum([
  'sport', 'nutrition', 'anthropo', 'sleep',
  'islam', 'planning', 'mental', 'general',
]);
export type TaskDomain = z.infer<typeof TaskDomainSchema>;

// ─── V1 (legacy — energyLevel field) ─────────────────────────────────────────

const ScheduleTaskV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  title: z.string().min(1),
  durationMin: z.number().int().positive(),
  priority: z.number().int().min(1).max(5),
  energyLevel: z.enum(['low', 'medium', 'high']),
  domain: TaskDomainSchema,
  tags: z.array(z.string()),
  fixedStartMin: z.number().int().min(0).max(1439).optional(),
  notBeforeMin: z.number().int().min(0).max(1439).optional(),
  notAfterMin: z.number().int().min(0).max(1439).optional(),
  dependsOn: z.array(z.string()),
  enabled: z.boolean(),
});

// ─── V2 — energyLevel removed (scheduling relies on circadian model + domain) ─

export const ScheduleTaskV2Schema = z.object({
  v: z.literal(2),
  id: IdSchema,
  title: z.string().min(1),
  durationMin: z.number().int().positive(),
  priority: z.number().int().min(1).max(5),
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
export type ScheduleTaskV2 = z.infer<typeof ScheduleTaskV2Schema>;

// ─── V3 — timeCategory field (T_friction/T_production/T_slack framework) ──────

export const TimeCategorySchema = z.enum([
  'production', 'friction', 'slack', 'somatique',
]).nullable().optional();
export type TimeCategory = z.infer<typeof TimeCategorySchema>;

export const ScheduleTaskV3Schema = ScheduleTaskV2Schema.extend({
  v: z.literal(3),
  /** Classifies this task in the T_friction/T_production/T_slack/T_somatique
   *  framework. null = unclassified (backward-compatible default). */
  timeCategory: TimeCategorySchema,
});
export type ScheduleTaskV3 = z.infer<typeof ScheduleTaskV3Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const ScheduleTaskSchema = z.discriminatedUnion('v', [
  ScheduleTaskV1Schema,
  ScheduleTaskV2Schema,
  ScheduleTaskV3Schema,
]);
export type ScheduleTask = z.infer<typeof ScheduleTaskSchema>;

export const SCHEDULE_TASK_LATEST_VERSION = 3;
export type ScheduleTaskLatest = ScheduleTaskV3;

export const migrateScheduleTask = createMigrator<ScheduleTask, ScheduleTaskLatest>(
  ScheduleTaskSchema,
  {
    1: (old: ScheduleTaskV1): ScheduleTaskV2 => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { energyLevel: _dropped, v: _v, ...rest } = old;
      return { ...rest, v: 2 };
    },
    2: (old: ScheduleTaskV2): ScheduleTaskV3 => ({
      ...old,
      v: 3,
      timeCategory: null,
    }),
  },
  SCHEDULE_TASK_LATEST_VERSION,
);
