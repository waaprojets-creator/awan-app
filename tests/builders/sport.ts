import {
  RoutineV1Schema,
  WorkoutSessionV1Schema,
  type RoutineLatest,
  type RoutineExercise,
  type WorkoutSessionLatest,
  type WorkoutExerciseLog,
} from '@/data/schemas/sport/routine';
import {
  ExerciseSetV1Schema,
  type ExerciseSetV1,
} from '@/data/schemas/sport/exerciseSet';
import {
  WorkoutLogV2Schema,
  type WorkoutLogV2,
} from '@/data/schemas/sport/workoutLog';

// All builders parse through their schema → guaranteed valid at construction.
// Pass `overrides` to tweak only the fields a test cares about.

export function makeSet(overrides: Partial<ExerciseSetV1> = {}): ExerciseSetV1 {
  return ExerciseSetV1Schema.parse({
    v: 1,
    exerciseId: 'squat',
    kind: 'working',
    reps: 8,
    weightKg: 100,
    ...overrides,
  });
}

export function makeRoutineExercise(overrides: Partial<RoutineExercise> = {}): RoutineExercise {
  return {
    rid: 'rid-1',
    exerciseId: 'squat',
    name: 'Squat',
    plannedSets: 3,
    plannedReps: 10,
    restSec: 90,
    order: 0,
    ...overrides,
  };
}

export function makeRoutine(overrides: Partial<RoutineLatest> = {}): RoutineLatest {
  return RoutineV1Schema.parse({
    v: 1,
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Routine test',
    exercises: [makeRoutineExercise()],
    defaultRestSec: 90,
    createdAt: Date.now(),
    ...overrides,
  });
}

export function makeWorkoutExerciseLog(overrides: Partial<WorkoutExerciseLog> = {}): WorkoutExerciseLog {
  return {
    rid: 'rid-1',
    exerciseId: 'squat',
    name: 'Squat',
    order: 0,
    sets: [makeSet()],
    ...overrides,
  };
}

export function makeSession(overrides: Partial<WorkoutSessionLatest> = {}): WorkoutSessionLatest {
  const now = Date.now();
  return WorkoutSessionV1Schema.parse({
    v: 1,
    id: '660e8400-e29b-41d4-a716-446655440000',
    name: 'Séance test',
    date: '2026-05-10',
    startTime: now - 3_600_000,
    endTime: now,
    duration: 3600,
    solo: true,
    isException: false,
    exercises: [],
    ...overrides,
  });
}

export function makeWorkoutLog(overrides: Partial<WorkoutLogV2> = {}): WorkoutLogV2 {
  return WorkoutLogV2Schema.parse({
    v: 2,
    id: '770e8400-e29b-41d4-a716-446655440000',
    date: '2026-05-10',
    startedAt: Date.now(),
    sets: [makeSet()],
    ...overrides,
  });
}
