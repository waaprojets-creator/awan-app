import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { DomainSchema, SeveritySchema } from './rule';
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

// ─── Union ────────────────────────────────────────────────────────────────────

export const AssessmentSchema = z.discriminatedUnion('v', [AssessmentV1Schema]);
export type Assessment = z.infer<typeof AssessmentSchema>;

export const ASSESSMENT_LATEST_VERSION = 1;
export type AssessmentLatest = AssessmentV1;

export const migrateAssessment = createMigrator<Assessment, AssessmentLatest>(
  AssessmentSchema,
  {},
  ASSESSMENT_LATEST_VERSION,
);
