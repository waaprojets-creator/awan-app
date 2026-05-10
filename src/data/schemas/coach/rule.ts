import { z } from 'zod';
import { SignalSchema, ConditionSchema } from './signal';
import { createMigrator } from '../../migrations/runner';

export const SeveritySchema = z.enum(['info', 'good', 'warn', 'alert']);
export type Severity = z.infer<typeof SeveritySchema>;

export const DomainSchema = z.enum(['sport', 'nutrition', 'anthropo', 'sleep', 'cross']);
export type Domain = z.infer<typeof DomainSchema>;

// ─── V1 ───────────────────────────────────────────────────────────────────────

/**
 * A Rule combines signals + a logical condition. When the condition is met,
 * the rule "triggers" and produces a RuleResult with severity + advice key.
 *
 *  - Single-signal rules: one entry in `signals`, condition references signal[0]
 *  - Multi-signal (cross) rules: condition combines signals via logic ops
 */
export const RuleV1Schema = z.object({
  v: z.literal(1),
  id: z.string().min(1),
  domain: DomainSchema,
  name: z.string().min(1),
  signals: z.array(SignalSchema).min(1),
  condition: ConditionSchema,
  // Which signal index the condition applies to (0 = first)
  signalIndex: z.number().int().nonnegative(),
  severity: SeveritySchema,
  adviceKey: z.string().min(1),
  enabled: z.boolean(),
});

export type RuleV1 = z.infer<typeof RuleV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const RuleSchema = z.discriminatedUnion('v', [RuleV1Schema]);
export type Rule = z.infer<typeof RuleSchema>;

export const RULE_LATEST_VERSION = 1;
export type RuleLatest = RuleV1;

export const migrateRule = createMigrator<Rule, RuleLatest>(
  RuleSchema,
  {},
  RULE_LATEST_VERSION,
);
