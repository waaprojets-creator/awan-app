import { getExerciseById } from '@/utils/sportData';

export type ChainKey = 'push' | 'pull' | 'legs' | 'core';

const LEG_MUSCLES = new Set([
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors',
]);
const CORE_MUSCLES = new Set(['abdominals', 'lower_back']);

/**
 * Maps a workout exerciseId to its kinetic chain.
 * Primary muscles determine legs/core; force field determines push/pull.
 * Falls back to id-slug heuristics for exercises not loaded in catalog.
 */
export function getChain(exerciseId: string): ChainKey | null {
  const ex = getExerciseById(exerciseId);
  if (ex) {
    if (ex.pm.some(m => LEG_MUSCLES.has(m))) return 'legs';
    if (ex.pm.some(m => CORE_MUSCLES.has(m))) return 'core';
    if (ex.force === 'push') return 'push';
    if (ex.force === 'pull') return 'pull';
    return null;
  }
  // Slug heuristic when catalog not yet loaded
  const id = exerciseId.toLowerCase();
  if (/squat|lunge|leg.press|deadlift|hip.thrust|rdl|glute|calf|hamstring/.test(id)) return 'legs';
  if (/bench|chest.press|push.up|pushup|overhead.press|ohp|dip|tricep|fly/.test(id)) return 'push';
  if (/row|pullup|pull.up|chin.up|chinup|curl|lat.pull|face.pull|shrug/.test(id)) return 'pull';
  if (/plank|crunch|sit.up|ab |core|oblique/.test(id)) return 'core';
  return null;
}
