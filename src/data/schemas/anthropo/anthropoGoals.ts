import { z } from 'zod';
import { createMigrator } from '../../migrations/runner';

// ─── V1 — objectifs anthropométriques (singleton) ────────────────────────────

export const AnthropoGoalsV1Schema = z.object({
  v: z.literal(1),
  targetWeightKg: z.number().positive().optional(),
  targetBodyFatPct: z.number().positive().optional(),
});

export type AnthropoGoalsV1 = z.infer<typeof AnthropoGoalsV1Schema>;
export type AnthropoGoalsLatest = AnthropoGoalsV1;

export const AnthropoGoalsSchema = z.discriminatedUnion('v', [AnthropoGoalsV1Schema]);
export type AnthropoGoals = z.infer<typeof AnthropoGoalsSchema>;

export const ANTHROPO_GOALS_LATEST_VERSION = 1;

export const migrateAnthropoGoals = createMigrator<AnthropoGoals, AnthropoGoalsLatest>(
  AnthropoGoalsSchema,
  {},
  ANTHROPO_GOALS_LATEST_VERSION,
);
