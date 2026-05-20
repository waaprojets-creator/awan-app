import { describe, it, expect } from 'vitest';
import { OBJECTIF_SPECS, formatRepsRange } from '@/modules/coach/routine-generator/objectifSpecs';
import { generateRoutines } from '@/modules/coach/routine-generator/generator';
import type { GeneratorConfig, ObjectifType } from '@/modules/coach/routine-generator/types';

// Empêche un futur drift où le générateur produirait `plannedReps` hors du
// range affiché à l'utilisateur (ex : desc "8-12 reps" mais générateur 5).

const ALL: ObjectifType[] = ['hypertrophie', 'force', 'endurance', 'recomposition'];

describe('OBJECTIF_SPECS — cohérence interne', () => {
  it('repsTarget reste dans repsRange pour chaque objectif', () => {
    for (const o of ALL) {
      const spec = OBJECTIF_SPECS[o];
      expect(spec.repsTarget, `${o}: target ${spec.repsTarget} hors range [${spec.repsRange.min}, ${spec.repsRange.max}]`).toBeGreaterThanOrEqual(spec.repsRange.min);
      expect(spec.repsTarget).toBeLessThanOrEqual(spec.repsRange.max);
    }
  });

  it('formatRepsRange produit une string non vide pour chaque objectif', () => {
    for (const o of ALL) {
      expect(formatRepsRange(o)).toMatch(/\d+/);
    }
  });
});

describe('Generator — utilise les specs comme source unique', () => {
  const baseConfig: Omit<GeneratorConfig, 'objectif'> = {
    niveau: 'intermediate',
    frequenceJours: 3,
    equipement: ['barbell', 'dumbbell', 'cable', 'machine', 'body only'],
  };

  for (const objectif of ALL) {
    it(`${objectif}: plannedReps des exercices générés == OBJECTIF_SPECS.repsTarget`, async () => {
      const routines = await generateRoutines({ ...baseConfig, objectif });
      const expected = OBJECTIF_SPECS[objectif].repsTarget;
      for (const r of routines) {
        for (const ex of r.exercises) {
          expect(ex.plannedReps, `${objectif} / ${r.name} / ${ex.name}: ${ex.plannedReps} ≠ ${expected}`).toBe(expected);
        }
      }
    });

    it(`${objectif}: defaultRestSec == OBJECTIF_SPECS.restSec`, async () => {
      const routines = await generateRoutines({ ...baseConfig, objectif });
      const expected = OBJECTIF_SPECS[objectif].restSec;
      for (const r of routines) {
        expect(r.defaultRestSec).toBe(expected);
      }
    });
  }
});
