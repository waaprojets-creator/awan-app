import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { DomainSchema, SeveritySchema } from './rule';
import { ForecastV1Schema, type ForecastV1 } from './forecast';
import { createMigrator } from '../../migrations/runner';

// ─── RuleResult ───────────────────────────────────────────────────────────────

export const RuleResultSchema = z.object({
  ruleId: z.string(),
  triggered: z.boolean(),
  signalValue: z.number(),
  severity: SeveritySchema,
});
export type RuleResult = z.infer<typeof RuleResultSchema>;

// ─── Advice ───────────────────────────────────────────────────────────────────

export const AdviceSchema = z.object({
  ruleId: z.string(),
  key: z.string(),
  params: z.record(z.union([z.string(), z.number()])),
  severity: SeveritySchema,
});
export type Advice = z.infer<typeof AdviceSchema>;

// ─── Correlation ──────────────────────────────────────────────────────────────

export const CorrelationSchema = z.object({
  ruleId: z.string(),
  domains: z.array(DomainSchema),
  strength: z.number().min(-1).max(1),
  description: z.string(),
});
export type Correlation = z.infer<typeof CorrelationSchema>;

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const AssessmentV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  domain: DomainSchema,
  generatedAt: TimestampSchema,
  ruleResults: z.array(RuleResultSchema),
  advices: z.array(AdviceSchema),
  correlations: z.array(CorrelationSchema),
});
export type AssessmentV1 = z.infer<typeof AssessmentV1Schema>;

// ─── V2: add forecasts (forward-looking Coach output) ────────────────────────

export const AssessmentV2Schema = AssessmentV1Schema.extend({
  v: z.literal(2),
  forecasts: z.array(ForecastV1Schema),
});
export type AssessmentV2 = z.infer<typeof AssessmentV2Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const AssessmentSchema = z.discriminatedUnion('v', [
  AssessmentV1Schema,
  AssessmentV2Schema,
]);
export type Assessment = z.infer<typeof AssessmentSchema>;

export const ASSESSMENT_LATEST_VERSION = 2;
export type AssessmentLatest = AssessmentV2;

export const migrateAssessment = createMigrator<Assessment, AssessmentLatest>(
  AssessmentSchema,
  {
    1: (data: AssessmentV1): AssessmentV2 => ({
      ...data,
      v: 2,
      forecasts: [] as ForecastV1[],
    }),
  },
  ASSESSMENT_LATEST_VERSION,
);
