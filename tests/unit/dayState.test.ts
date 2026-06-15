import { describe, it, expect } from 'vitest';
import {
  defaultSegments, stateAtMinute, normalizeSegments, applySegment, summarizeStates,
  DAY_END_MIN,
} from '@/modules/planning/dayState';
import { DayStateV1Schema, type StateSegment } from '@/data/schemas/planning/dayState';

/** Vérifie qu'une partition est contiguë et couvre 0..1440. */
function isContiguousFullDay(segs: StateSegment[]): boolean {
  if (segs.length === 0) return false;
  if (segs[0]!.startMin !== 0) return false;
  if (segs[segs.length - 1]!.endMin !== DAY_END_MIN) return false;
  for (let i = 1; i < segs.length; i++) {
    if (segs[i]!.startMin !== segs[i - 1]!.endMin) return false;
  }
  return true;
}

describe('dayState — défaut & lecture', () => {
  it('defaultSegments = journée entière libre', () => {
    expect(defaultSegments()).toEqual([{ state: 'libre', startMin: 0, endMin: 1440 }]);
  });

  it('stateAtMinute retourne libre par défaut', () => {
    expect(stateAtMinute([], 600)).toBe('libre');
    expect(stateAtMinute(defaultSegments(), 0)).toBe('libre');
  });

  it('stateAtMinute respecte les bornes (endMin exclusif)', () => {
    const segs: StateSegment[] = [{ state: 'endormi', startMin: 0, endMin: 420 }];
    expect(stateAtMinute(segs, 0)).toBe('endormi');
    expect(stateAtMinute(segs, 419)).toBe('endormi');
    expect(stateAtMinute(segs, 420)).toBe('libre'); // borne haute exclusive
  });
});

describe('dayState — normalizeSegments', () => {
  it('comble les trous avec libre et garde la contiguïté', () => {
    const out = normalizeSegments([{ state: 'travail', startMin: 540, endMin: 1020 }]);
    expect(out).toEqual([
      { state: 'libre', startMin: 0, endMin: 540 },
      { state: 'travail', startMin: 540, endMin: 1020 },
      { state: 'libre', startMin: 1020, endMin: 1440 },
    ]);
    expect(isContiguousFullDay(out)).toBe(true);
  });

  it('fusionne les segments adjacents de même état', () => {
    const out = normalizeSegments([
      { state: 'libre', startMin: 0, endMin: 300 },
      { state: 'libre', startMin: 300, endMin: 600 },
    ]);
    expect(out).toEqual([{ state: 'libre', startMin: 0, endMin: 1440 }]);
  });

  it('trie une entrée désordonnée', () => {
    const out = normalizeSegments([
      { state: 'travail', startMin: 540, endMin: 1020 },
      { state: 'endormi', startMin: 0, endMin: 420 },
    ]);
    expect(out.map(s => s.state)).toEqual(['endormi', 'libre', 'travail', 'libre']);
    expect(isContiguousFullDay(out)).toBe(true);
  });
});

describe('dayState — applySegment (édition)', () => {
  it('peint endormi 0..420 sur une journée libre', () => {
    const out = applySegment(defaultSegments(), 'endormi', 0, 420);
    expect(out).toEqual([
      { state: 'endormi', startMin: 0, endMin: 420 },
      { state: 'libre', startMin: 420, endMin: 1440 },
    ]);
  });

  it('peint un bloc au milieu → 3 segments', () => {
    const out = applySegment(defaultSegments(), 'travail', 540, 1020);
    expect(out.map(s => s.state)).toEqual(['libre', 'travail', 'libre']);
    expect(isContiguousFullDay(out)).toBe(true);
  });

  it('un nouveau segment écrase la plage chevauchée', () => {
    let segs = applySegment(defaultSegments(), 'travail', 540, 1020);
    // malade 600..720 doit découper le bloc travail
    segs = applySegment(segs, 'malade', 600, 720);
    expect(stateAtMinute(segs, 580)).toBe('travail');
    expect(stateAtMinute(segs, 650)).toBe('malade');
    expect(stateAtMinute(segs, 800)).toBe('travail');
    expect(isContiguousFullDay(segs)).toBe(true);
  });

  it('peindre la journée entière → un seul segment', () => {
    const out = applySegment(defaultSegments(), 'vacances', 0, 1440);
    expect(out).toEqual([{ state: 'vacances', startMin: 0, endMin: 1440 }]);
  });

  it('plage vide (end <= start) = no-op normalisé', () => {
    const out = applySegment(defaultSegments(), 'malade', 600, 600);
    expect(out).toEqual(defaultSegments());
  });
});

describe('dayState — summarize & schéma', () => {
  it('summarizeStates couvre 1440 min', () => {
    const segs = applySegment(applySegment(defaultSegments(), 'endormi', 0, 420), 'travail', 540, 1020);
    const sum = summarizeStates(segs);
    const total = Object.values(sum).reduce((a, b) => a + b, 0);
    expect(total).toBe(1440);
    expect(sum.endormi).toBe(420);
    expect(sum.travail).toBe(480);
  });

  it('le schéma Zod valide une partition produite', () => {
    const segments = applySegment(defaultSegments(), 'endormi', 0, 420);
    const parsed = DayStateV1Schema.safeParse({
      v: 1, date: '2026-05-10', timezone: 'UTC', segments, savedAt: Date.now(),
    });
    expect(parsed.success).toBe(true);
  });
});
