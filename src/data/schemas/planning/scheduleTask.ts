import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

// ─── V1 (legacy) ─────────────────────────────────────────────────────────────

const ScheduleTaskV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  title: z.string().min(1),
  durationMin: z.number().int().positive(),
  priority: z.number().int().min(1).max(5),
  energyLevel: z.enum(['low', 'medium', 'high']),
  domain: z.string(),
  tags: z.array(z.string()),
  fixedStartMin: z.number().int().min(0).max(1439).optional(),
  notBeforeMin: z.number().int().min(0).max(1439).optional(),
  notAfterMin: z.number().int().min(0).max(1439).optional(),
  dependsOn: z.array(z.string()),
  enabled: z.boolean(),
});

// ─── V2 ───────────────────────────────────────────────────────────────────────

const ScheduleTaskV2Schema = z.object({
  v: z.literal(2),
  id: IdSchema,
  title: z.string().min(1),
  durationMin: z.number().int().positive(),
  priority: z.number().int().min(1).max(5),
  domain: z.string(),
  tags: z.array(z.string()),
  fixedStartMin: z.number().int().min(0).max(1439).optional(),
  notBeforeMin: z.number().int().min(0).max(1439).optional(),
  notAfterMin: z.number().int().min(0).max(1439).optional(),
  dependsOn: z.array(z.string()),
  enabled: z.boolean(),
});

// ─── V3 ───────────────────────────────────────────────────────────────────────

export const TimeCategorySchema = z.enum([
  'production', 'friction', 'slack', 'somatique',
]).nullable().optional();
export type TimeCategory = z.infer<typeof TimeCategorySchema>;

const ScheduleTaskV3Schema = ScheduleTaskV2Schema.extend({
  v: z.literal(3),
  timeCategory: TimeCategorySchema,
});

// ─── V4 — priority 1-3, status, date, timeHHMM, domain libre ─────────────────

export const ScheduleTaskV4Schema = z.object({
  v: z.literal(4),
  id: IdSchema,
  /** Date de création — composante de la clé storage (immuable). */
  date: DateStringSchema,
  /** Date à laquelle la tâche est placée dans le temps. */
  scheduledDate: DateStringSchema.optional(),
  title: z.string().min(1),
  durationMin: z.number().int().positive(),
  /** 1 = structurel (ancre, heure fixe) | 2 = important | 3 = flexible */
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** Domaine libre défini par l'utilisateur (ex: "travail", "famille"). */
  domain: z.string().min(1),
  tags: z.array(z.string()),
  /** Heure de début pour priority 1. Format HH:MM. */
  timeHHMM: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  /** IDs des tâches devant être complétées avant celle-ci. */
  dependsOn: z.array(z.string()),
  /** null = backlog (pas encore placé, a une échéance) */
  status: z.enum(['active', 'done', 'cancelled']).nullable(),
  timeCategory: TimeCategorySchema,
});

export type ScheduleTaskV1 = z.infer<typeof ScheduleTaskV1Schema>;
export type ScheduleTaskV2 = z.infer<typeof ScheduleTaskV2Schema>;
export type ScheduleTaskV3 = z.infer<typeof ScheduleTaskV3Schema>;
export type ScheduleTaskV4 = z.infer<typeof ScheduleTaskV4Schema>;

export const ScheduleTaskSchema = z.discriminatedUnion('v', [
  ScheduleTaskV1Schema,
  ScheduleTaskV2Schema,
  ScheduleTaskV3Schema,
  ScheduleTaskV4Schema,
]);
export type ScheduleTask = z.infer<typeof ScheduleTaskSchema>;

export const SCHEDULE_TASK_LATEST_VERSION = 4;
export type ScheduleTaskLatest = ScheduleTaskV4;

function fixedMinToHHMM(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export const migrateScheduleTask = createMigrator<ScheduleTask, ScheduleTaskLatest>(
  ScheduleTaskSchema,
  {
    1: (old: ScheduleTaskV1): ScheduleTaskV2 => {
      const { energyLevel: _e, v: _v, ...rest } = old;
      return { ...rest, v: 2 };
    },
    2: (old: ScheduleTaskV2): ScheduleTaskV3 => ({
      ...old, v: 3, timeCategory: null,
    }),
    3: (old: ScheduleTaskV3): ScheduleTaskV4 => {
      const { fixedStartMin, notBeforeMin: _nb, notAfterMin: _na, enabled, v: _v, domain, ...rest } = old;
      return {
        ...rest,
        v: 4,
        date: new Date().toISOString().slice(0, 10),
        priority: (Math.min(old.priority, 3) as 1 | 2 | 3),
        domain: domain ?? 'general',
        timeHHMM: fixedStartMin !== undefined ? fixedMinToHHMM(fixedStartMin) : undefined,
        status: enabled ? 'active' : 'cancelled',
        dependsOn: old.dependsOn,
        tags: old.tags,
        timeCategory: old.timeCategory,
      };
    },
  },
  SCHEDULE_TASK_LATEST_VERSION,
);
