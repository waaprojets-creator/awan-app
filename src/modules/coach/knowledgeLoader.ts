import { migrateKnowledgeEntry } from '@/data/schemas/coach/knowledge';
import type { KnowledgeEntryLatest } from '@/data/schemas/coach/knowledge';

import sportVolume from '@/coach/knowledge/sport/volume_recommendations.json';
import sportFrequency from '@/coach/knowledge/sport/frequency_recommendations.json';
import sportProximityToFailure from '@/coach/knowledge/sport/proximity_to_failure.json';
import sportTempo from '@/coach/knowledge/sport/tempo_guidelines.json';
import sportRest from '@/coach/knowledge/sport/rest_guidelines.json';
import sportOvertraining from '@/coach/knowledge/sport/overtraining_signals.json';
import sportProgressiveOverload from '@/coach/knowledge/sport/progressive_overload.json';
import sportMorpho from '@/coach/knowledge/sport/morpho_adaptations.json';

import nutritionProtein from '@/coach/knowledge/nutrition/protein_dosing.json';
import nutritionTdee from '@/coach/knowledge/nutrition/tdee_adaptive.json';
import nutritionFiber from '@/coach/knowledge/nutrition/fiber_rda.json';
import nutritionMicro from '@/coach/knowledge/nutrition/micronutrient_rda.json';

import anthropoWhtr from '@/coach/knowledge/anthropo/whtr_thresholds.json';
import anthropoFfmi from '@/coach/knowledge/anthropo/ffmi_classification.json';
import anthropoBf from '@/coach/knowledge/anthropo/bf_methods_precision.json';

const RAW_BUNDLED: unknown[] = [
  sportVolume, sportFrequency, sportProximityToFailure, sportTempo,
  sportRest, sportOvertraining, sportProgressiveOverload, sportMorpho,
  nutritionProtein, nutritionTdee, nutritionFiber, nutritionMicro,
  anthropoWhtr, anthropoFfmi, anthropoBf,
];

let cache: KnowledgeEntryLatest[] | null = null;

/**
 * Load and validate the bundled knowledge base.
 * Cached in memory after first call.
 */
export function loadKnowledge(): KnowledgeEntryLatest[] {
  if (cache) return cache;
  cache = RAW_BUNDLED.map((raw) => migrateKnowledgeEntry(raw));
  return cache;
}

export function getKnowledgeById(id: string): KnowledgeEntryLatest | undefined {
  return loadKnowledge().find((k) => k.id === id);
}

export function getKnowledgeByDomain(domain: KnowledgeEntryLatest['domain']): KnowledgeEntryLatest[] {
  return loadKnowledge().filter((k) => k.domain === domain);
}
