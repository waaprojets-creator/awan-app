import type { Condition } from '@/data/schemas/coach/signal';
import type { Rule } from '@/data/schemas/coach/rule';
import type { RuleResult } from '@/data/schemas/coach/assessment';
import type { CoachContext } from '../types';
import { analyzeSignal } from './analyzer';

/**
 * Evaluates a rule's condition against its analyzed signal value.
 * Returns a RuleResult — `triggered: true` means the rule's condition matched
 * (e.g. "calories > 3000" evaluated to true).
 */
export async function scoreRule(rule: Rule, ctx: CoachContext): Promise<RuleResult> {
  if (!rule.enabled) {
    return { ruleId: rule.id, triggered: false, signalValue: 0, severity: rule.severity };
  }
  const idx = rule.signalIndex;
  const signal = rule.signals[idx];
  if (!signal) {
    throw new Error(`Rule ${rule.id}: signalIndex ${idx} out of range`);
  }
  const value = await analyzeSignal(signal, ctx);
  return {
    ruleId: rule.id,
    triggered: matchesCondition(value, rule.condition),
    signalValue: value,
    severity: rule.severity,
  };
}

export function matchesCondition(value: number, c: Condition): boolean {
  switch (c.op) {
    case 'lt':  return value <  c.value;
    case 'lte': return value <= c.value;
    case 'gt':  return value >  c.value;
    case 'gte': return value >= c.value;
    case 'eq':  return value === c.value;
    case 'neq': return value !== c.value;
    case 'between': return value >= c.min && value <= c.max;
  }
}

export async function scoreRules(rules: Rule[], ctx: CoachContext): Promise<RuleResult[]> {
  return Promise.all(rules.map((r) => scoreRule(r, ctx)));
}
