import type { Rule, Domain } from '@/data/schemas/coach/rule';
import type { Assessment, AssessmentLatest } from '@/data/schemas/coach/assessment';
import { uuid } from '@/utils/id';
import type { CoachContext } from '../types';
import { scoreRules } from './scorer';
import { buildAdvices } from './advisor';
import { findCorrelations } from './correlator';

/**
 * Runs the full pipeline for one (domain, date):
 *   analyzer (read storage) → scorer (apply rules) → advisor (textualize)
 *   plus correlator if domain === 'cross'
 *
 * Returns a fully-typed AssessmentLatest. Callers persist it via the api layer.
 */
export async function runEngine(
  domain: Domain,
  rules: Rule[],
  ctx: CoachContext,
): Promise<AssessmentLatest> {
  const domainRules = rules.filter((r) => r.domain === domain);
  const ruleResults = await scoreRules(domainRules, ctx);
  const advices = buildAdvices(domainRules, ruleResults);
  const correlations =
    domain === 'cross' ? await findCorrelations(rules, ctx) : [];

  return {
    v: 1,
    id: uuid(),
    date: ctx.date,
    domain,
    generatedAt: Date.now(),
    ruleResults,
    advices,
    correlations,
  };
}

export type { Assessment };
