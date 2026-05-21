import type { Domain } from '@/data/schemas/coach/rule';
import type { ForecastLatest } from '@/data/schemas/coach/forecast';
import type { CoachContext } from '../types';
import type { ForecastGenerator } from '../forecasts/types';

/**
 * Runs all forecast generators for a given domain on a given context.
 * Returns the flattened list of forecasts emitted (each generator may emit 0..N).
 * Errors in a single generator are swallowed and logged — one bad generator
 * never breaks the rest of the Coach pipeline.
 */
export async function runForecasts(
  domain: Domain,
  generators: ForecastGenerator[],
  ctx: CoachContext,
): Promise<ForecastLatest[]> {
  const out: ForecastLatest[] = [];
  for (const gen of generators) {
    if (gen.domain !== domain) continue;
    try {
      const emitted = await gen.generate(ctx);
      out.push(...emitted);
    } catch (e) {
      console.warn(`[Coach] forecast generator "${gen.id}" failed:`, e);
    }
  }
  return out;
}
