import type { Rule } from '@/data/schemas/coach/rule';
import type { RuleResult, Advice } from '@/data/schemas/coach/assessment';

/**
 * Translates RuleResults into user-facing Advices.
 * Only triggered rules emit an Advice. Params surface the signal value so the
 * i18n layer can interpolate (e.g. "tu n'as fait que {value} séances").
 */
export function buildAdvices(rules: Rule[], results: RuleResult[]): Advice[] {
  const ruleById = new Map(rules.map((r) => [r.id, r] as const));
  const out: Advice[] = [];
  for (const r of results) {
    if (!r.triggered) continue;
    const rule = ruleById.get(r.ruleId);
    if (!rule) continue;
    out.push({
      ruleId: r.ruleId,
      key: rule.adviceKey,
      params: { value: round(r.signalValue, 2) },
      severity: r.severity,
    });
  }
  return out;
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
