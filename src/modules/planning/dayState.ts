import type { LifeState, StateSegment } from '@/data/schemas/planning/dayState';

export const DAY_START_MIN = 0;
export const DAY_END_MIN = 1440;

/** Partition par défaut : journée entière « libre ». */
export function defaultSegments(): StateSegment[] {
  return [{ state: 'libre', startMin: DAY_START_MIN, endMin: DAY_END_MIN }];
}

/** État à une minute donnée (libre par défaut si non couvert). endMin exclusif. */
export function stateAtMinute(segments: StateSegment[], min: number): LifeState {
  for (const s of segments) {
    if (min >= s.startMin && min < s.endMin) return s.state;
  }
  return 'libre';
}

/**
 * Trie, comble les trous avec « libre », fusionne les segments adjacents de même
 * état → partition contiguë couvrant 0..1440. Suppose une entrée non chevauchante
 * (garantie par applySegment).
 */
export function normalizeSegments(segments: StateSegment[]): StateSegment[] {
  const sorted = [...segments]
    .filter(s => s.endMin > s.startMin)
    .sort((a, b) => a.startMin - b.startMin);

  const filled: StateSegment[] = [];
  let cursor = DAY_START_MIN;
  for (const seg of sorted) {
    const start = Math.max(seg.startMin, cursor);
    if (start >= seg.endMin) continue; // entièrement recouvert → ignore
    if (start > cursor) filled.push({ state: 'libre', startMin: cursor, endMin: start });
    filled.push({ state: seg.state, startMin: start, endMin: seg.endMin });
    cursor = seg.endMin;
  }
  if (cursor < DAY_END_MIN) filled.push({ state: 'libre', startMin: cursor, endMin: DAY_END_MIN });
  if (filled.length === 0) return defaultSegments();

  // Fusionne les segments adjacents de même état
  const merged: StateSegment[] = [];
  for (const seg of filled) {
    const last = merged[merged.length - 1];
    if (last && last.state === seg.state && last.endMin === seg.startMin) {
      last.endMin = seg.endMin;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

/**
 * Peint [startMin,endMin) avec `state` par-dessus la partition existante (override
 * total de la plage), puis renormalise. Opération d'édition d'un état.
 */
export function applySegment(
  segments: StateSegment[],
  state: LifeState,
  startMin: number,
  endMin: number,
): StateSegment[] {
  const a = Math.max(DAY_START_MIN, Math.min(startMin, DAY_END_MIN));
  const b = Math.max(DAY_START_MIN, Math.min(endMin, DAY_END_MIN));
  if (b <= a) return normalizeSegments(segments); // plage vide → renormalise sans peindre

  const clipped: StateSegment[] = [];
  for (const seg of segments) {
    if (seg.endMin <= a || seg.startMin >= b) {
      clipped.push(seg); // hors plage peinte
      continue;
    }
    // recoupe : conserve les bouts gauche/droite, écrase le milieu
    if (seg.startMin < a) clipped.push({ state: seg.state, startMin: seg.startMin, endMin: a });
    if (seg.endMin > b) clipped.push({ state: seg.state, startMin: b, endMin: seg.endMin });
  }
  clipped.push({ state, startMin: a, endMin: b });
  return normalizeSegments(clipped);
}

/** Minutes totales par état sur la partition. */
export function summarizeStates(segments: StateSegment[]): Record<LifeState, number> {
  const acc: Record<LifeState, number> = {
    endormi: 0, travail: 0, malade: 0, vacances: 0, libre: 0,
  };
  for (const s of segments) acc[s.state] += Math.max(0, s.endMin - s.startMin);
  return acc;
}
