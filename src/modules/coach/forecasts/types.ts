import type { Domain } from '@/data/schemas/coach/rule';
import type { ForecastKind, ForecastLatest } from '@/data/schemas/coach/forecast';
import type { CoachContext } from '../types';

/**
 * Forecast generators are functional (not JSON-declarative) because they:
 *  - compute temporal projections (next N days from anchor)
 *  - run statistical regressions (RPE slope, weight ETA)
 *  - merge multi-domain signals (sleep + sport calendar)
 *
 * Each generator stays deterministic for a given (date, storage) input —
 * forecasts MUST be idempotent across runs to avoid surprising the user.
 */
export interface ForecastGenerator {
  readonly id: string;
  readonly domain: Domain;
  readonly kind: ForecastKind;
  /** Optional path to knowledge JSON backing the projection */
  readonly knowledgeRef?: string;
  /** Optional DOI / PMC URL for evidence */
  readonly source?: string;
  generate(ctx: CoachContext): Promise<ForecastLatest[]>;
}
