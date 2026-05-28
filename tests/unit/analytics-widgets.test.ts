import { describe, it, expect } from 'vitest';
import {
  computeACWR,
  computeWeeklyTonnage,
  computeEAT,
  computeFluxDensity,
} from '../../src/services/analyticsService';
import type { WorkoutSessionLatest } from '../../src/data/schemas/sport/routine';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSession(
  date: string,
  sessionRPE: number,
  tonnageKg = 0,
  durationMin = 60,
): WorkoutSessionLatest {
  const start = new Date(`${date}T09:00:00`).getTime();
  const end = start + durationMin * 60000;
  return {
    id: `s-${date}`,
    v: 3,
    name: 'Test Session',
    date,
    startTime: start,
    endTime: end,
    workoutEndedAt: end,
    duration: durationMin,
    sessionRPE,
    rpe: sessionRPE,
    tonnage: tonnageKg,
    durationMin,
    recoveryScore: 7,
    solo: true,
    isException: false,
    exercises: tonnageKg > 0 ? [{
      rid: 'r1',
      exerciseId: 'ex1',
      name: 'Squat',
      order: 0,
      sets: [{
        v: 2 as const, kind: 'working' as const,
        exerciseId: 'ex1',
        weightKg: tonnageKg / 5, reps: 5,
        restActualSec: 90,
      }],
    }] : [],
  } as WorkoutSessionLatest;
}

const TODAY = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => { const d = new Date(TODAY); d.setDate(d.getDate() - n); return fmt(d); };

// ─── computeACWR ──────────────────────────────────────────────────────────────

describe('computeACWR', () => {
  it('returns null when fewer than 4 sessions in 28 days', () => {
    const sessions = [makeSession(daysAgo(2), 8)];
    expect(computeACWR(sessions)).toBeNull();
  });

  it('returns null when no sessions in last 7 days', () => {
    const sessions = Array.from({ length: 8 }, (_, i) => makeSession(daysAgo(10 + i), 7));
    expect(computeACWR(sessions)).toBeNull();
  });

  it('trigger=true: high recent RPE > avg → ACWR > 1.5 (danger zone)', () => {
    // 7 recent sessions with RPE=10, 28 sessions spread out with RPE=5
    const recent = Array.from({ length: 7 }, (_, i) => makeSession(daysAgo(i), 10));
    const old = Array.from({ length: 14 }, (_, i) => makeSession(daysAgo(8 + i), 5));
    const acwr = computeACWR([...recent, ...old]);
    expect(acwr).not.toBeNull();
    expect(acwr!).toBeGreaterThan(1.5);
  });

  it('trigger=false: low recent RPE → ACWR in safe zone', () => {
    // 7 recent sessions RPE=4, 21 prior sessions RPE=7
    const recent = Array.from({ length: 7 }, (_, i) => makeSession(daysAgo(i), 4));
    const old = Array.from({ length: 14 }, (_, i) => makeSession(daysAgo(8 + i), 7));
    const acwr = computeACWR([...recent, ...old]);
    expect(acwr).not.toBeNull();
    expect(acwr!).toBeLessThan(1.0);
  });

  it('balanced training → ACWR near 1.0', () => {
    const sessions = Array.from({ length: 28 }, (_, i) => makeSession(daysAgo(i), 7));
    const acwr = computeACWR(sessions);
    expect(acwr).not.toBeNull();
    expect(acwr!).toBeCloseTo(1.0, 1);
  });
});

// ─── computeWeeklyTonnage ─────────────────────────────────────────────────────

describe('computeWeeklyTonnage', () => {
  it('returns 0 when no sessions in the week', () => {
    const sessions = [makeSession(daysAgo(30), 7, 500)];
    expect(computeWeeklyTonnage(sessions, 0)).toBe(0);
  });

  it('returns correct tonnage for current week', () => {
    // Monday of current week
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    const monStr = fmt(monday);

    // 2 sessions this week: 100kg × 5 reps = 500kg each
    const s1 = makeSession(monStr, 7, 500);
    const s2 = makeSession(fmt(now), 7, 500);
    const tonnage = computeWeeklyTonnage([s1, s2], 0);
    expect(tonnage).toBe(1000);
  });

  it('does not count sessions outside the week', () => {
    const lastWeekSession = makeSession(daysAgo(8), 7, 1000);
    expect(computeWeeklyTonnage([lastWeekSession], 0)).toBe(0);
    expect(computeWeeklyTonnage([lastWeekSession], -1)).toBeGreaterThanOrEqual(0);
  });
});

// ─── computeEAT ───────────────────────────────────────────────────────────────

describe('computeEAT', () => {
  it('60 min session × MET 5.5 × 80 kg → ~440 kcal', () => {
    const session = makeSession(fmt(TODAY), 7, 0, 60);
    const eat = computeEAT(session, 80);
    // EAT = 60 * 5.5 * 80 / 60 = 440
    expect(eat).toBe(440);
  });

  it('90 min session × MET 5.5 × 75 kg → ~619 kcal', () => {
    const session = makeSession(fmt(TODAY), 7, 0, 90);
    const eat = computeEAT(session, 75);
    // EAT = 90 * 5.5 * 75 / 60 ≈ 619
    expect(eat).toBeCloseTo(619, 0);
  });

  it('returns 0 if weight is 0', () => {
    const session = makeSession(fmt(TODAY), 7, 0, 60);
    expect(computeEAT(session, 0)).toBe(0);
  });

  it('returns 0 if no end time', () => {
    const session = makeSession(fmt(TODAY), 7, 0, 60);
    // Remove workoutEndedAt and endTime
    const s = { ...session, workoutEndedAt: undefined, endTime: 0 } as any;
    expect(computeEAT(s, 80)).toBe(0);
  });
});

// ─── computeFluxDensity ───────────────────────────────────────────────────────

describe('computeFluxDensity', () => {
  it('intake > expenditure + 1400 → surplus', () => {
    expect(computeFluxDensity(12000, 10000)).toBe('surplus');
    expect(computeFluxDensity(14500, 10000)).toBe('surplus');
  });

  it('intake within ±1400 of expenditure → maintenance', () => {
    expect(computeFluxDensity(10000, 10000)).toBe('maintenance');
    expect(computeFluxDensity(11300, 10000)).toBe('maintenance');
    expect(computeFluxDensity(8800, 10000)).toBe('maintenance');
  });

  it('intake < expenditure - 1400 → deficit', () => {
    expect(computeFluxDensity(7000, 10000)).toBe('deficit');
    expect(computeFluxDensity(5000, 10000)).toBe('deficit');
  });
});
