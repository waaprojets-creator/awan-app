import { describe, it, expect } from 'vitest';
import { scoreSession } from '@/services/sessionScoreService';
import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';

function makeSession(overrides?: Partial<WorkoutSessionLatest>): WorkoutSessionLatest {
  return {
    v: 2,
    id: 's1',
    name: 'Test',
    date: '2026-05-01',
    startTime: 1000,
    endTime: 4600,
    duration: 3600,
    solo: true,
    isException: false,
    exercises: [{
      rid: 'r1',
      exerciseId: 'ex1',
      name: 'Squat',
      order: 0,
      sets: [{
        v: 2,
        exerciseId: 'ex1',
        kind: 'working',
        reps: 8,
        weightKg: 100,
        completedAt: 2000,
      }],
    }],
    ...overrides,
  } as WorkoutSessionLatest;
}

describe('scoreSession', () => {
  it('returns a number between 0 and 100', () => {
    const score = scoreSession(makeSession());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('returns higher score with optimal RPE (6-8)', () => {
    const optimal = scoreSession(makeSession({ sessionRPE: 7 }));
    const extreme = scoreSession(makeSession({ sessionRPE: 10 }));
    expect(optimal).toBeGreaterThan(extreme);
  });

  it('awards PR bonus when weight exceeds plannedWeightKg by >2.5%', () => {
    const withPR = scoreSession(makeSession({
      exercises: [{
        rid: 'r1',
        exerciseId: 'ex1',
        name: 'Squat',
        order: 0,
        sets: [{
          v: 2,
          exerciseId: 'ex1',
          kind: 'working',
          reps: 8,
          weightKg: 105,
          plannedWeightKg: 100,
          completedAt: 2000,
        }],
      }],
    } as any));
    const noPR = scoreSession(makeSession({
      exercises: [{
        rid: 'r1',
        exerciseId: 'ex1',
        name: 'Squat',
        order: 0,
        sets: [{
          v: 2,
          exerciseId: 'ex1',
          kind: 'working',
          reps: 8,
          weightKg: 100,
          plannedWeightKg: 100,
          completedAt: 2000,
        }],
      }],
    } as any));
    expect(withPR).toBeGreaterThan(noPR);
  });

  it('returns higher score with better feeling', () => {
    const great = scoreSession(makeSession({ feeling: 5 }));
    const bad = scoreSession(makeSession({ feeling: 1 }));
    expect(great).toBeGreaterThan(bad);
  });

  it('handles session with no exercises gracefully', () => {
    const score = scoreSession(makeSession({ exercises: [] }));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('neutral RPE score when sessionRPE is absent', () => {
    const noRpe = scoreSession(makeSession({ sessionRPE: undefined }));
    // Neutral RPE = 15 pts out of 25 max; should be a reasonable mid-range score
    expect(noRpe).toBeGreaterThan(0);
  });
});
