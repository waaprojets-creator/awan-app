import { describe, it, expect } from 'vitest';
import { migrateWorkoutLog, WorkoutLogV2Schema, WORKOUT_LOG_LATEST_VERSION } from '@/data/schemas/sport/workoutLog';
import { migrators } from '@/data/migrations/registry';

import v1Fixture from '../fixtures/sport/workoutLog.v1.json';
import v2Fixture from '../fixtures/sport/workoutLog.v2.json';

describe('migrateWorkoutLog', () => {
  it('migrates v1 fixture → v2 with correct shape', () => {
    const result = migrateWorkoutLog(v1Fixture);
    expect(result.v).toBe(WORKOUT_LOG_LATEST_VERSION);
    // v2 adds templateId (optional)
    expect('templateId' in result).toBe(true);
    // original fields preserved
    expect(result.id).toBe(v1Fixture.id);
    expect(result.date).toBe(v1Fixture.date);
    expect(result.sets).toHaveLength(v1Fixture.sets.length);
    expect(result.note).toBe(v1Fixture.note);
  });

  it('accepts already-v2 data without re-migrating', () => {
    const result = migrateWorkoutLog(v2Fixture);
    expect(result.v).toBe(2);
    expect(result.templateId).toBe(v2Fixture.templateId);
  });

  it('validates the migrated output against WorkoutLogV2Schema', () => {
    const result = migrateWorkoutLog(v1Fixture);
    const parsed = WorkoutLogV2Schema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('rejects data with unknown version', () => {
    expect(() => migrateWorkoutLog({ v: 99, id: 'bad', date: '2026-01-01', startedAt: 0, sets: [] })).toThrow();
  });

  it('rejects data missing required fields', () => {
    expect(() => migrateWorkoutLog({ v: 1, date: '2026-05-10', startedAt: 0, sets: [] })).toThrow();
  });
});

describe('migrators registry', () => {
  it('contains sport.workoutLog', () => {
    expect(typeof migrators['sport.workoutLog']).toBe('function');
  });

  it('registry entry produces same result as direct migrator', () => {
    const fromRegistry = migrators['sport.workoutLog'](v1Fixture);
    const direct = migrateWorkoutLog(v1Fixture);
    expect(fromRegistry).toEqual(direct);
  });
});
