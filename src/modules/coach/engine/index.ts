import type { Rule, Domain } from '@/data/schemas/coach/rule';
import type { Assessment, AssessmentLatest } from '@/data/schemas/coach/assessment';
import { uuid } from '@/utils/id';
import type { CoachContext } from '../types';
import type { ForecastGenerator } from '../forecasts/types';
import { scoreRules } from './scorer';
import { buildAdvices } from './advisor';
import { findCorrelations } from './correlator';
import { runForecasts } from './forecaster';

/**
 * Runs the full pipeline for one (domain, date):
 *   analyzer (read storage) → scorer (apply rules) → advisor (textualize)
 *   plus correlator if domain === 'cross'
 *   plus forecaster (forward-looking projections)
 *
 * Returns a fully-typed AssessmentLatest (V2). Callers persist it via the api layer.
 */
export async function runEngine(
  domain: Domain,
  rules: Rule[],
  ctx: CoachContext,
  generators: ForecastGenerator[] = [],
): Promise<AssessmentLatest> {
  const domainRules = rules.filter((r) => r.domain === domain);
  const ruleResults = await scoreRules(domainRules, ctx);
  const advices = buildAdvices(domainRules, ruleResults);
  const correlations =
    domain === 'cross' ? await findCorrelations(rules, ctx) : [];
  const forecasts = await runForecasts(domain, generators, ctx);

  return {
    v: 2,
    id: uuid(),
    date: ctx.date,
    domain,
    generatedAt: Date.now(),
    ruleResults,
    advices,
    correlations,
    forecasts,
  };
}

export type { Assessment };
