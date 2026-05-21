import { describe, it, expect } from 'vitest';
import {
  migrateExerciseSet,
  type ExerciseSetV1,
  type ExerciseSetV2,
} from '../../src/data/schemas/sport/exerciseSet';

const BASE_V1: ExerciseSetV1 = {
  v: 1,
  exerciseId: 'bench-press',
  kind: 'working',
  reps: 8,
  weightKg: 80,
};

describe('migrateExerciseSet: V1 → V2', () => {
  it('V1 input returns V2 output with v:2', () => {
    const result = migrateExerciseSet(BASE_V1);
    expect(result.v).toBe(2);
  });

  it('plannedWeightKg is copied from weightKg', () => {
    const result = migrateExerciseSet(BASE_V1);
    expect(result.plannedWeightKg).toBe(80);
  });

  it('plannedReps is copied from reps', () => {
    const result = migrateExerciseSet(BASE_V1);
    expect(result.plannedReps).toBe(8);
  });

  it('original fields are preserved through migration', () => {
    const result = migrateExerciseSet(BASE_V1);
    expect(result.exerciseId).toBe('bench-press');
    expect(result.kind).toBe('working');
    expect(result.weightKg).toBe(80);
    expect(result.reps).toBe(8);
  });

  it('V1 without optional fields: plannedWeightKg and plannedReps are undefined', () => {
    const minimalV1: ExerciseSetV1 = {
      v: 1,
      exerciseId: 'squat',
      kind: 'warmup',
    };
    const result = migrateExerciseSet(minimalV1);
    expect(result.v).toBe(2);
    expect(result.plannedWeightKg).toBeUndefined();
    expect(result.plannedReps).toBeUndefined();
  });

  it('V1 with all optional fields migrates correctly', () => {
    const full: ExerciseSetV1 = {
      v: 1,
      exerciseId: 'deadlift',
      kind: 'working',
      reps: 5,
      weightKg: 140,
      rir: 1,
      rpe: 9,
      durationSec: 0,
      restActualSec: 120,
      note: 'felt strong',
      completedAt: 1700000000000,
    };
    const result = migrateExerciseSet(full);
    expect(result.v).toBe(2);
    expect(result.plannedWeightKg).toBe(140);
    expect(result.plannedReps).toBe(5);
    expect(result.rir).toBe(1);
    expect(result.rpe).toBe(9);
    expect(result.note).toBe('felt strong');
  });
});

describe('migrateExerciseSet: V2 passthrough', () => {
  it('V2 input passes through unchanged', () => {
    const v2: ExerciseSetV2 = {
      v: 2,
      exerciseId: 'overhead-press',
      kind: 'working',
      reps: 6,
      weightKg: 60,
      plannedWeightKg: 60,
      plannedReps: 6,
    };
    const result = migrateExerciseSet(v2);
    expect(result.v).toBe(2);
    expect(result.plannedWeightKg).toBe(60);
    expect(result.plannedReps).toBe(6);
    expect(result.weightKg).toBe(60);
    expect(result.reps).toBe(6);
  });

  it('V2 with substitutedFrom field is preserved', () => {
    const v2WithSub: ExerciseSetV2 = {
      v: 2,
      exerciseId: 'cable-row',
      kind: 'working',
      reps: 10,
      weightKg: 50,
      plannedWeightKg: 55,
      plannedReps: 10,
      substitutedFrom: 'barbell-row',
    };
    const result = migrateExerciseSet(v2WithSub);
    expect(result.substitutedFrom).toBe('barbell-row');
  });

  it('V2 actual values can differ from planned (override tracking)', () => {
    const v2Override: ExerciseSetV2 = {
      v: 2,
      exerciseId: 'bench-press',
      kind: 'working',
      reps: 7,
      weightKg: 82.5,
      plannedWeightKg: 80,
      plannedReps: 8,
    };
    const result = migrateExerciseSet(v2Override);
    expect(result.reps).toBe(7);
    expect(result.weightKg).toBe(82.5);
    expect(result.plannedReps).toBe(8);
    expect(result.plannedWeightKg).toBe(80);
  });
});
