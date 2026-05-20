import { VOLUME_LANDMARKS } from '@/constants/volumeLandmarks';
import type { ObjectifType } from './types';

export function allocateSetsPerMuscle(
  muscleGroups: string[],
  objectif: ObjectifType,
  _frequenceJours: 2 | 3 | 4 | 5 | 6,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const muscle of muscleGroups) {
    const lm = VOLUME_LANDMARKS[muscle];
    if (!lm) continue;

    let target: number;
    switch (objectif) {
      case 'hypertrophie':   target = lm.mav[1]; break;
      case 'force':          target = Math.round(lm.mev + (lm.mav[0] - lm.mev) * 0.5); break;
      case 'endurance':      target = lm.mav[0]; break;
      case 'recomposition':  target = Math.round((lm.mev + lm.mav[1]) / 2); break;
    }

    result[muscle] = Math.min(lm.mav[1], Math.max(lm.mev, target));
  }
  return result;
}
