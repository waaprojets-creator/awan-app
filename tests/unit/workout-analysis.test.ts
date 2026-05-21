import { describe, it, expect } from 'vitest';
import {
  oneRmEstimate,
  sessionAdherence,
} from '../../src/services/workoutAnalysisService';
import type { WorkoutSessionLatest } from '../../src/data/schemas/sport/routine';
import type { ExerciseSetV2 } from '../../src/data/schemas/sport/exerciseSet';

// ─── oneRmEstimate ───────────────────────────────────────────────────────────

describe('oneRmEstimate', () => {
  it('1 rep = weight itself', () => {
    expect(oneRmEstimate(100, 1)).toBe(100);
    expect(oneRmEstimate(142.5, 1)).toBe(142.5);
  });

  it('5 reps @ 100kg → estimated 1RM between 112 and 118kg', () => {
    // Weighted average of Brzycki(112.5), Epley(116.7), O'Conner(112.5) → ~114
    const result = oneRmEstimate(100, 5);
    expect(result).toBeGreaterThanOrEqual(112);
    expect(result).toBeLessThanOrEqual(118);
  });

  it('10 reps @ 80kg → reasonable 1RM estimate (between 100 and 115kg)', () => {
    const result = oneRmEstimate(80, 10);
    expect(result).toBeGreaterThan(100);
    expect(result).toBeLessThan(115);
  });

  it('zero weight → 0', () => {
    expect(oneRmEstimate(0, 10)).toBe(0);
  });

  it('zero reps → 0', () => {
    expect(oneRmEstimate(100, 0)).toBe(0);
  });

  it('negative reps → 0', () => {
    expect(oneRmEstimate(100, -1)).toBe(0);
  });

  it('higher reps produce a higher estimated 1RM than lower reps at same weight', () => {
    // More reps at same weight implies the same 1RM, but formula increases with reps
    const low = oneRmEstimate(100, 3);
    const high = oneRmEstimate(100, 10);
    expect(high).toBeGreaterThan(low);
  });

  it('heavier weight at same reps produces proportionally higher 1RM', () => {
    const light = oneRmEstimate(60, 5);
    const heavy = oneRmEstimate(120, 5);
    expect(heavy).toBeCloseTo(light * 2, 0);
  });
});

// ─── sessionAdherence ────────────────────────────────────────────────────────

function makeSession(
  exercises: WorkoutSessionLatest['exercises'],
): WorkoutSessionLatest {
  return {
    v: 1,
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test session',
    date: '2026-01-01',
    startTime: 1700000000000,
    endTime: 1700003600000,
    duration: 3600,
    solo: true,
    isException: false,
    exercises,
  };
}

function makeSet(overrides: Partial<ExerciseSetV2>): ExerciseSetV2 {
  return {
    v: 2,
    exerciseId: 'bench-press',
    kind: 'working',
    ...overrides,
  };
}

describe('sessionAdherence', () => {
  it('plannedVol=0 (no planned sets) → 1.0 (perfect adherence)', () => {
    const session = makeSession([
      {
        rid: 'ex1',
        exerciseId: 'bench-press',
        name: 'Bench Press',
        order: 0,
        sets: [
          makeSet({ weightKg: 80, reps: 8 }),
        ],
      },
    ]);
    expect(sessionAdherence(session)).toBe(1);
  });

  it('actual volume equals planned volume → 1.0', () => {
    const session = makeSession([
      {
        rid: 'ex1',
        exerciseId: 'bench-press',
        name: 'Bench Press',
        order: 0,
        sets: [
          makeSet({
            weightKg: 80, reps: 8,
            plannedWeightKg: 80, plannedReps: 8,
          }),
        ],
      },
    ]);
    expect(sessionAdherence(session)).toBe(1);
  });

  it('actual volume exceeds planned volume → capped at 1.0', () => {
    const session = makeSession([
      {
        rid: 'ex1',
        exerciseId: 'squat',
        name: 'Squat',
        order: 0,
        sets: [
          makeSet({
            weightKg: 100, reps: 10,  // actual: 1000
            plannedWeightKg: 80, plannedReps: 8,  // planned: 640
          }),
        ],
      },
    ]);
    expect(sessionAdherence(session)).toBe(1);
  });

  it('actual volume less than planned → ratio < 1.0', () => {
    const session = makeSession([
      {
        rid: 'ex1',
        exerciseId: 'deadlift',
        name: 'Deadlift',
        order: 0,
        sets: [
          makeSet({
            weightKg: 60, reps: 5,         // actual: 300
            plannedWeightKg: 100, plannedReps: 5, // planned: 500
          }),
        ],
      },
    ]);
    const adherence = sessionAdherence(session);
    expect(adherence).toBeLessThan(1);
    expect(adherence).toBeCloseTo(0.6, 5);
  });

  it('empty session (no exercises) → 1.0', () => {
    const session = makeSession([]);
    expect(sessionAdherence(session)).toBe(1);
  });

  it('warmup sets are excluded from adherence calculation', () => {
    // Only working sets count; warmup sets with planned volume should not affect result
    const session = makeSession([
      {
        rid: 'ex1',
        exerciseId: 'bench-press',
        name: 'Bench Press',
        order: 0,
        sets: [
          makeSet({
            kind: 'warmup',
            weightKg: 40, reps: 10,
            plannedWeightKg: 40, plannedReps: 10,
          }),
          makeSet({
            kind: 'working',
            weightKg: 80, reps: 8,
            plannedWeightKg: 80, plannedReps: 8,
          }),
        ],
      },
    ]);
    // Warmup excluded: only the working set matters → 640/640 = 1.0
    expect(sessionAdherence(session)).toBe(1);
  });

  it('multiple exercises are summed together', () => {
    const session = makeSession([
      {
        rid: 'ex1',
        exerciseId: 'bench-press',
        name: 'Bench Press',
        order: 0,
        sets: [
          makeSet({
            weightKg: 80, reps: 8,        // actual: 640
            plannedWeightKg: 80, plannedReps: 8,  // planned: 640
          }),
        ],
      },
      {
        rid: 'ex2',
        exerciseId: 'squat',
        name: 'Squat',
        order: 1,
        sets: [
          makeSet({
            exerciseId: 'squat',
            weightKg: 50, reps: 5,         // actual: 250
            plannedWeightKg: 100, plannedReps: 5, // planned: 500
          }),
        ],
      },
    ]);
    // totalPlanned=1140, totalActual=890 → 890/1140 ≈ 0.781
    const adherence = sessionAdherence(session);
    expect(adherence).toBeGreaterThan(0.7);
    expect(adherence).toBeLessThan(0.9);
  });
});
