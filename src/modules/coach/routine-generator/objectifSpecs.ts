import type { ObjectifType } from './types';

// Source unique pour les paramètres de chaque objectif d'entraînement.
// `repsTarget` est utilisé par le générateur, `repsRange` par les descriptions
// UI ("8-12 reps"). Le test src/modules/coach/routine-generator/__tests__/
// objectifSpecs garantit que repsTarget ∈ [repsRange.min, repsRange.max].
//
// Sources scientifiques :
//   - hypertrophie 8-12 reps : Schoenfeld 2010 (Journal of Strength & Conditioning Research)
//   - force 3-6 reps : NSCA Essentials of Strength Training 2008
//   - endurance 15+ reps : ACSM Position Stand 2009
//   - recomposition 10-15 reps : zone d'overlap hypertrophie/endurance

export interface ObjectifSpec {
  repsTarget: number;
  repsRange: { min: number; max: number };
  restSec: number;
}

export const OBJECTIF_SPECS: Record<ObjectifType, ObjectifSpec> = {
  hypertrophie:  { repsTarget: 10, repsRange: { min: 8,  max: 12 }, restSec: 90 },
  force:         { repsTarget: 5,  repsRange: { min: 3,  max: 6  }, restSec: 180 },
  endurance:     { repsTarget: 15, repsRange: { min: 15, max: 25 }, restSec: 60 },
  recomposition: { repsTarget: 12, repsRange: { min: 10, max: 15 }, restSec: 90 },
};

export function formatRepsRange(o: ObjectifType): string {
  const r = OBJECTIF_SPECS[o].repsRange;
  return r.min === r.max ? `${r.min} reps` : `${r.min}-${r.max} reps`;
}

// Defaults injectés dans l'UI du générateur. Centralisés ici pour qu'un
// changement de produit (ex: "défaut = force") soit une modif d'une ligne.
import type { GeneratorConfig } from './types';
export const GENERATOR_DEFAULTS: GeneratorConfig = {
  objectif: 'hypertrophie',
  niveau: 'intermediate',
  frequenceJours: 3,
  equipement: ['barbell', 'dumbbell', 'cable', 'machine', 'body only'],
};
