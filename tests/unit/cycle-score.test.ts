import { describe, it, expect } from 'vitest';
import { computeCycleScore } from '@/services/cycleScoreService';
import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';

const NOW = new Date('2026-05-21T12:00:00Z').getTime();
const DAY = 86_400_000;

function makeSession(daysAgo: number, overrides?: Partial<WorkoutSessionLatest>): WorkoutSessionLatest {
  const start = NOW - daysAgo * DAY;
  return {
    v: 2,
    id: `s-${daysAgo}`,
    name: 'Test',
    date: new Date(start).toISOString().slice(0, 10),
    startTime: start,
    endTime: start + 3600_000,
    duration: 3600,
    solo: true,
    isException: false,
    feeling: 4,
    adherence: 0.95,
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
        plannedReps: 8,
        completedAt: start + 1000,
      }],
    }],
    ...overrides,
  };
}

describe('computeCycleScore', () => {
  it('returns 0 + reprise message when no sessions in window', () => {
    const result = computeCycleScore([], NOW);
    expect(result.score).toBe(0);
    expect(result.diagnostic).toContain('reprise');
    expect(result.sessionsCount).toBe(0);
  });

  it('ignores sessions older than 28 days', () => {
    const old = makeSession(45);
    const recent = makeSession(2);
    const result = computeCycleScore([old, recent], NOW);
    expect(result.sessionsCount).toBe(1);
  });

  it('high score for balanced 4×/week cycle with good adherence', () => {
    // 16 sessions over 4 weeks (4/week) with adherence 0.95 + feeling 4
    const sessions: WorkoutSessionLatest[] = [];
    for (let w = 0; w < 4; w++) {
      for (let d = 0; d < 4; d++) {
        sessions.push(makeSession(w * 7 + d * 2, {
          id: `s-w${w}d${d}`,
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
              weightKg: 100 + w * 3, // mild progression
              completedAt: NOW - (w * 7 + d * 2) * DAY,
            }],
          }],
        }));
      }
    }
    const result = computeCycleScore(sessions, NOW);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.diagnostic).toMatch(/équilibré|satisfaisant/);
  });

  it('flags plateau when 3+ consecutive weeks at same volume', () => {
    // Same volume each week
    const sessions: WorkoutSessionLatest[] = [];
    for (let w = 0; w < 4; w++) {
      sessions.push(makeSession(w * 7 + 1, { id: `s-w${w}` }));
    }
    const result = computeCycleScore(sessions, NOW);
    expect(result.breakdown.plateau).toBeLessThan(15);
  });

  it('penalizes low frequency (<2 sessions/week)', () => {
    const sessions = [makeSession(2), makeSession(15)]; // 2 sessions over 4 weeks
    const result = computeCycleScore(sessions, NOW);
    expect(result.breakdown.frequency).toBeLessThanOrEqual(12);
  });

  it('penalizes empty weeks (consistency)', () => {
    const sessions = [makeSession(2), makeSession(5)]; // all in week 1 only
    const result = computeCycleScore(sessions, NOW);
    expect(result.breakdown.consistency).toBeLessThan(10);
  });

  it('rewards progression (volume increasing across weeks)', () => {
    const sessions: WorkoutSessionLatest[] = [];
    for (let w = 0; w < 4; w++) {
      sessions.push(makeSession(w * 7 + 1, {
        id: `s-w${w}`,
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
            weightKg: 80 + (3 - w) * 10, // descending in daysAgo = ascending in time
            completedAt: NOW - (w * 7 + 1) * DAY,
          }],
        }],
      }));
    }
    const result = computeCycleScore(sessions, NOW);
    expect(result.breakdown.progression).toBeGreaterThanOrEqual(15);
  });
});
