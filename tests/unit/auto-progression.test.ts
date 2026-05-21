import { describe, it, expect } from 'vitest';
import { suggestProgression } from '@/services/autoProgressionService';
import type { RoutineExercise } from '@/data/schemas/sport/routine';
import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';

function makeExercise(overrides?: Partial<RoutineExercise>): RoutineExercise {
  return {
    rid: 'r1',
    exerciseId: 'ex1',
    name: 'Bench Press',
    equipment: 'barbell',
    plannedSets: 3,
    plannedReps: 8,
    plannedWeightKg: 80,
    restSec: 120,
    order: 0,
    ...overrides,
  };
}

function makeSession(exerciseId: string, rir: number, weightKg: number, isWorking = true): WorkoutSessionLatest {
  return {
    v: 2,
    id: 's1',
    name: 'Test',
    date: '2026-05-01',
    startTime: Date.now(),
    endTime: Date.now() + 3600_000,
    duration: 3600,
    solo: true,
    isException: false,
    exercises: [{
      rid: 'r1',
      exerciseId,
      name: 'Test Exercise',
      order: 0,
      sets: [{
        v: 2,
        exerciseId,
        kind: isWorking ? 'working' : 'warmup',
        reps: 8,
        weightKg,
        rir,
        completedAt: Date.now(),
      }],
    }],
  } as WorkoutSessionLatest;
}

describe('suggestProgression', () => {
  it('returns empty array when no sessions', () => {
    const exercises = [makeExercise()];
    expect(suggestProgression(exercises, [])).toEqual([]);
  });

  it('suggests +2.5% for compound with RIR >= 2', () => {
    const exercises = [makeExercise({ equipment: 'barbell', plannedWeightKg: 80 })];
    const sessions = [makeSession('ex1', 3, 80)];
    const [result] = suggestProgression(exercises, sessions);
    expect(result!.reason).toBe('increase');
    expect(result!.suggestedWeightKg).toBeCloseTo(82, 0);
  });

  it('suggests +1% for isolation with RIR >= 2', () => {
    const exercises = [makeExercise({ equipment: 'cable', plannedWeightKg: 20 })];
    const sessions = [makeSession('ex1', 2, 20)];
    const [result] = suggestProgression(exercises, sessions);
    expect(result!.reason).toBe('increase');
    expect(result!.suggestedWeightKg).toBeCloseTo(20.2, 1);
  });

  it('suggests -2.5% for RIR <= 1', () => {
    const exercises = [makeExercise({ plannedWeightKg: 80 })];
    const sessions = [makeSession('ex1', 0, 80)];
    const [result] = suggestProgression(exercises, sessions);
    expect(result!.reason).toBe('decrease');
    expect(result!.suggestedWeightKg).toBeCloseTo(78, 0);
  });

  it('suggests deload when plateau detected (same weight 3+ sessions)', () => {
    const exercises = [makeExercise({ plannedWeightKg: 80 })];
    const sessions = [
      makeSession('ex1', 2, 80),
      makeSession('ex1', 2, 80),
      makeSession('ex1', 2, 80),
    ].map((s, i) => ({ ...s, id: `s${i}`, startTime: i * 1000 }));
    const [result] = suggestProgression(exercises, sessions);
    expect(result!.reason).toBe('deload');
    expect(result!.suggestedWeightKg).toBeCloseTo(56, 0);
  });

  it('does not suggest for exercises without plannedWeightKg', () => {
    const exercises = [makeExercise({ plannedWeightKg: undefined })];
    const sessions = [makeSession('ex1', 2, 80)];
    expect(suggestProgression(exercises, sessions)).toHaveLength(0);
  });

  it('treats null RIR (no working sets) as RIR >= 2 → increase', () => {
    const exercises = [makeExercise({ equipment: 'barbell', plannedWeightKg: 100 })];
    const sessions = [makeSession('ex1', 2, 100, false)]; // warmup set, not working
    const [result] = suggestProgression(exercises, sessions);
    expect(result!.reason).toBe('increase');
  });

  it('ignores plateau check when fewer than 3 sessions', () => {
    const exercises = [makeExercise({ plannedWeightKg: 80 })];
    const sessions = [
      makeSession('ex1', 2, 80),
      makeSession('ex1', 2, 80),
    ].map((s, i) => ({ ...s, id: `s${i}` }));
    const [result] = suggestProgression(exercises, sessions);
    expect(result!.reason).not.toBe('deload');
  });
});
