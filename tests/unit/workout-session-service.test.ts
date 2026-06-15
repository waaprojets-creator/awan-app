import { describe, it, expect } from 'vitest';
import { buildActiveSession, buildSessionFromActive, shouldAdvanceWeek } from '@/services/workoutSessionService';
import type { RoutineLatest, WorkoutSessionLatest } from '@/data/schemas/sport/routine';
import type { ActiveSession } from '@/screens/sport/types';

function makeRoutine(overrides?: Partial<RoutineLatest>): RoutineLatest {
  return {
    v: 1,
    id: 'r1',
    name: 'Push',
    cycleLetter: 'A',
    exercises: [{
      rid: 'e1',
      exerciseId: 'bench',
      name: 'Bench Press',
      primaryMuscle: 'chest',
      plannedSets: 3,
      plannedReps: 8,
      plannedWeightKg: 80,
      restSec: 120,
      order: 0,
    }],
    defaultRestSec: 120,
    createdAt: 1000,
    ...overrides,
  } as RoutineLatest;
}

function makePreviousSession(overrides?: Partial<WorkoutSessionLatest>): WorkoutSessionLatest {
  return {
    v: 3,
    id: 's1',
    routineId: 'r1',
    name: 'Push',
    cycleLetter: 'A',
    date: '2026-01-01',
    startTime: 1000,
    endTime: 4600,
    duration: 3600,
    solo: true,
    isException: false,
    exercises: [{
      rid: 'e1',
      exerciseId: 'bench',
      name: 'Bench Press',
      order: 0,
      sets: [{
        v: 2,
        exerciseId: 'bench',
        kind: 'working',
        weightKg: 85,
        reps: 7,
        plannedWeightKg: 80,
        plannedReps: 8,
        completedAt: 2000,
      }],
    }],
    tonnage: 595,
    durationMin: 60,
    ...overrides,
  } as WorkoutSessionLatest;
}

function makeActiveSession(overrides?: Partial<ActiveSession>): ActiveSession {
  return {
    id: 'sess-1',
    routineId: 'r1',
    routineName: 'Push',
    cycleLetter: 'A',
    startTime: 1_000_000,
    arrivedAt: 1_000_000,
    solo: true,
    isException: false,
    exercises: [{
      rid: 'e1',
      exerciseId: 'bench',
      name: 'Bench Press',
      order: 0,
      restSec: 120,
      sets: [
        { kind: 'warmup', weightKg: 40, reps: 10, completed: true, completedAt: 1_001_000, index: 0 },
        { kind: 'working', weightKg: 85, reps: 8, completed: true, completedAt: 1_002_000, index: 1 },
        { kind: 'working', weightKg: 85, reps: 7, completed: false, index: 2 },
      ],
    }],
    currentExerciseIdx: 0,
    restEndAt: null,
    stage: 'workout',
    bestOneRMs: {},
    ...overrides,
  } as ActiveSession;
}

// ─── buildActiveSession ──────────────────────────────────────────────────────

describe('buildActiveSession', () => {
  it('suggestion takes priority: when session exists suggestProgression overrides last working weight', () => {
    const prev = makePreviousSession();
    const { session, prevSessionVolume } = buildActiveSession({
      routine: makeRoutine(),
      routineSessions: [prev],
      bestOneRMs: {},
      sessionId: 'new',
      now: 5000,
    });
    // suggestProgression uses plannedWeightKg (80) × 1.01 = 80.8 (RIR=null → increase, no equipment)
    expect(session.exercises[0].sets[0].weightKg).toBe(80.8);
    // reps still prefilled from last working set when no RIR override
    expect(session.exercises[0].sets[0].reps).toBe(7);
    expect(session.exercises[0].sets).toHaveLength(3);
    expect(prevSessionVolume).toBe(595);
  });

  it('falls back to last working set when exercise has no plannedWeightKg (no suggestion)', () => {
    const routineNoPlanned = makeRoutine({ exercises: [{ rid: 'e1', exerciseId: 'bench', name: 'Bench', plannedSets: 3, plannedReps: 8, restSec: 120, order: 0 }] });
    const prev = makePreviousSession();
    const { session } = buildActiveSession({
      routine: routineNoPlanned,
      routineSessions: [prev],
      bestOneRMs: {},
      sessionId: 'new',
      now: 5000,
    });
    // No plannedWeightKg → suggestProgression skips this exercise → falls back to 85
    expect(session.exercises[0].sets[0].weightKg).toBe(85);
    expect(session.exercises[0].sets[0].reps).toBe(7);
  });

  it('prefills from plannedWeightKg/plannedReps and returns null volume when no previous session', () => {
    const { session, prevSessionVolume } = buildActiveSession({
      routine: makeRoutine(),
      routineSessions: [],
      bestOneRMs: {},
      sessionId: 'new',
      now: 5000,
    });
    expect(session.exercises[0].sets[0].weightKg).toBe(80);
    expect(session.exercises[0].sets[0].reps).toBe(8);
    expect(prevSessionVolume).toBeNull();
  });

  it('scaffolds correct number of sets per planned sets count', () => {
    const { session } = buildActiveSession({
      routine: makeRoutine({ exercises: [{ rid: 'e1', exerciseId: 'bench', name: 'Bench', plannedSets: 4, plannedReps: 6, restSec: 90, order: 0 }] }),
      routineSessions: [],
      bestOneRMs: {},
      sessionId: 'new',
      now: 5000,
    });
    expect(session.exercises[0].sets).toHaveLength(4);
    session.exercises[0].sets.forEach(s => expect(s.completed).toBe(false));
  });

  it('sets stage to arrived and bestOneRMs from input', () => {
    const records = { bench: 120 };
    const { session } = buildActiveSession({
      routine: makeRoutine(),
      routineSessions: [],
      bestOneRMs: records,
      sessionId: 'test-id',
      now: 9999,
    });
    expect(session.stage).toBe('arrived');
    expect(session.id).toBe('test-id');
    expect(session.bestOneRMs).toEqual(records);
  });
});

// ─── buildSessionFromActive ──────────────────────────────────────────────────

describe('buildSessionFromActive', () => {
  it('only persists completed sets', () => {
    const active = makeActiveSession();
    const result = buildSessionFromActive({
      active,
      summary: {},
      endTime: 1_060_000,
      date: '2026-06-15',
    });
    // warmup(completed) + 1 working(completed) = 2; 3rd set not completed → excluded
    expect(result.exercises[0].sets).toHaveLength(2);
  });

  it('tonnage counts only working sets', () => {
    const active = makeActiveSession();
    const result = buildSessionFromActive({
      active,
      summary: {},
      endTime: 1_060_000,
      date: '2026-06-15',
    });
    // warmup 40×10=400 excluded, working 85×8=680 only
    expect(result.tonnage).toBe(680);
  });

  it('propagates summary fields', () => {
    const result = buildSessionFromActive({
      active: makeActiveSession(),
      summary: { feeling: 4, sessionRPE: 7, note: 'felt strong' },
      endTime: 1_060_000,
      date: '2026-06-15',
    });
    expect(result.feeling).toBe(4);
    expect(result.sessionRPE).toBe(7);
    expect(result.rpe).toBe(7);
    expect(result.note).toBe('felt strong');
  });

  it('has v === 3 and score within [0, 100]', () => {
    const result = buildSessionFromActive({
      active: makeActiveSession(),
      summary: { sessionRPE: 7 },
      endTime: 1_060_000,
      date: '2026-06-15',
    });
    expect(result.v).toBe(3);
    expect(result.scoreSeance).toBeGreaterThanOrEqual(0);
    expect(result.scoreSeance).toBeLessThanOrEqual(100);
  });

  it('adherence is within [0, 1]', () => {
    const result = buildSessionFromActive({
      active: makeActiveSession(),
      summary: {},
      endTime: 1_060_000,
      date: '2026-06-15',
    });
    expect(result.adherence).toBeGreaterThanOrEqual(0);
    expect(result.adherence).toBeLessThanOrEqual(1);
  });
});

// ─── shouldAdvanceWeek ───────────────────────────────────────────────────────

describe('shouldAdvanceWeek', () => {
  it('returns true when now is after week boundary', () => {
    const p = { startDate: '2026-06-01', mesoWeek: 1 };
    // boundary = 2026-06-08; now = 2026-06-15 (after)
    expect(shouldAdvanceWeek(p, new Date('2026-06-15'))).toBe(true);
  });

  it('returns false when now is before week boundary', () => {
    const p = { startDate: '2026-06-01', mesoWeek: 1 };
    // boundary = 2026-06-08; now = 2026-06-05 (before)
    expect(shouldAdvanceWeek(p, new Date('2026-06-05'))).toBe(false);
  });
});
