import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { DomainSchema, SeveritySchema } from './rule';
import { createMigrator } from '../../migrations/runner';

// ─── ForecastKind ────────────────────────────────────────────────────────────
// A forecast is a Coach-projected event or recommendation for a FUTURE date.
// Unlike reactive advices (anchored to "today" based on past signals), forecasts
// project the next deload, next measurement, next refeed window, etc.

export const ForecastKindSchema = z.enum([
  'deload',              // sport: deload week predicted from RPE trend
  'planned_session',     // sport: next scheduled training session
  'measurement_due',     // anthropo: biweekly / quarterly measurement reminder
  'refeed',              // nutrition: refeed window after sustained deficit
  'recovery_priority',   // cross: short-sleep streak + upcoming hard session
  'progression',         // sport: auto-progression suggested weight for next session
  'plateau',             // sport/anthropo: stagnation predicted
  'goal',                // anthropo: target weight ETA from trend
]);
export type ForecastKind = z.infer<typeof ForecastKindSchema>;

// ─── ForecastV1 ──────────────────────────────────────────────────────────────

export const ForecastV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  /** Functional generator id, e.g. "sport.deload_predicted" */
  generatorId: z.string().min(1),
  domain: DomainSchema,
  generatedAt: TimestampSchema,
  /** ISO date the run was anchored on (today when generated) */
  generatedOnDate: DateStringSchema,
  /** ISO date the forecast targets in the future */
  targetDate: DateStringSchema,
  /** targetDate - generatedOnDate in days (informational) */
  horizonDays: z.number().int().nonnegative(),
  kind: ForecastKindSchema,
  severity: SeveritySchema,
  /** i18n key for user-facing title */
  titleKey: z.string().min(1),
  /** i18n key for user-facing rationale */
  detailKey: z.string().min(1),
  /** params for i18n interpolation */
  params: z.record(z.union([z.string(), z.number()])),
  /** 0-1 confidence in the projection */
  confidence: z.number().min(0).max(1),
  /** Optional DOI / PMC URL backing the forecast */
  source: z.string().optional(),
  /** Optional knowledge JSON reference */
  knowledgeRef: z.string().optional(),
});
export type ForecastV1 = z.infer<typeof ForecastV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const ForecastSchema = z.discriminatedUnion('v', [ForecastV1Schema]);
export type Forecast = z.infer<typeof ForecastSchema>;

export const FORECAST_LATEST_VERSION = 1;
export type ForecastLatest = ForecastV1;

export const migrateForecast = createMigrator<Forecast, ForecastLatest>(
  ForecastSchema,
  {},
  FORECAST_LATEST_VERSION,
);
