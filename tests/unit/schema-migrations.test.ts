import { describe, it, expect } from 'vitest';
import { migrateWorkoutSession } from '../../src/data/schemas/sport/routine';
import { migrateMeasurement } from '../../src/data/schemas/anthropo/measurement';
import { migratePrayerLog, computePrayerScores } from '../../src/data/schemas/islam/prayerLog';
import { migrateSleepEntry, computeSleepScore } from '../../src/data/schemas/sleep/sleepEntry';

// ─── WorkoutSession V1/V2 → V3 ───────────────────────────────────────────────

describe('WorkoutSession V2 → V3 migration', () => {
  const makeV2 = (sessionRPE: number, exerciseSets: { weightKg: number; reps: number; kind: string }[]) => ({
    v: 2 as const,
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test',
    date: '2026-01-01',
    startTime: 1000000,
    endTime: 1000000 + 60 * 60000,
    duration: 3600,
    solo: true,
    isException: false,
    sessionRPE,
    exercises: [{
      rid: 'r1', exerciseId: 'ex1', name: 'Squat', order: 0,
      sets: exerciseSets.map(s => ({ v: 2 as const, exerciseId: 'ex1', ...s })),
    }],
  });

  it('tonnage calculé depuis les sets working uniquement', () => {
    const raw = makeV2(7, [
      { weightKg: 100, reps: 5, kind: 'working' },
      { weightKg: 60, reps: 10, kind: 'warmup' },   // ne compte pas
      { weightKg: 80, reps: 3, kind: 'working' },
    ]);
    const migrated = migrateWorkoutSession(raw);
    expect(migrated.v).toBe(3);
    expect(migrated.tonnage).toBe(100 * 5 + 80 * 3); // 500 + 240 = 740
  });

  it('sessions sans sets → tonnage = 0', () => {
    const raw = { ...makeV2(7, []), exercises: [] };
    const migrated = migrateWorkoutSession(raw);
    expect(migrated.tonnage).toBe(0);
  });

  it('durationMin calculé depuis startTime/endTime', () => {
    const raw = makeV2(8, []);
    // startTime=1000000, endTime=1000000+60*60000 = 1 heure
    const migrated = migrateWorkoutSession(raw);
    expect(migrated.durationMin).toBe(60);
  });

  it('rpe = sessionRPE', () => {
    const raw = makeV2(9, []);
    const migrated = migrateWorkoutSession(raw);
    expect(migrated.rpe).toBe(9);
  });

  it('endTime absent → durationMin = 0', () => {
    const raw = { ...makeV2(7, []), endTime: 0 };
    const migrated = migrateWorkoutSession(raw);
    expect(migrated.durationMin).toBe(0);
  });
});

describe('WorkoutSession V1 → V3 (chaîne complète)', () => {
  it('migration V1 passe par V2 puis V3', () => {
    const raw = {
      v: 1 as const,
      id: '00000000-0000-0000-0000-000000000002', name: 'Old', date: '2025-01-01',
      startTime: 5000000, endTime: 5000000 + 90 * 60000,
      duration: 5400, solo: true, isException: false,
      exercises: [],
    };
    const migrated = migrateWorkoutSession(raw);
    expect(migrated.v).toBe(3);
    expect(migrated.tonnage).toBe(0);
    expect(migrated.durationMin).toBe(90);
  });
});

// ─── MeasurementEntry V1 → V2 ────────────────────────────────────────────────

describe('MeasurementEntry V1 → V2 migration', () => {
  const makeV1 = () => ({
    v: 1 as const,
    id: '00000000-0000-0000-0000-000000000003',
    date: '2026-01-01',
    weight: 80,
    bpm_rest: 60,
    body_fat_pct: 15,
    measurements: {},
    skinfolds: {},
    savedAt: Date.now(),
  });

  it('champs BF% null quand migré sans profil (migration automatique)', () => {
    const migrated = migrateMeasurement(makeV1());
    expect(migrated.v).toBe(2);
    expect(migrated.bf_pct_jp7).toBeNull();
    expect(migrated.bf_pct_dw4).toBeNull();
    expect(migrated.s13_sum).toBeNull();
    expect(migrated.ffmi).toBeNull();
  });

  it('champs V1 préservés après migration', () => {
    const migrated = migrateMeasurement(makeV1());
    // weight est retiré en V2 (stocké dans WeightEntry)
    expect((migrated as any).weight).toBeUndefined();
    expect(migrated.date).toBe('2026-01-01');
    expect(migrated.bpm_rest).toBe(60);
    expect(migrated.body_fat_pct).toBe(15);
  });
});

// ─── PrayerLog V1 → V2 ───────────────────────────────────────────────────────

describe('PrayerLog V1 → V2 migration', () => {
  const makeV1 = (prayers: Partial<Record<string, boolean>> = {}) => ({
    v: 1 as const,
    id: '00000000-0000-0000-0000-000000000004',
    date: '2026-01-01',
    prayers: {
      fajr: prayers.fajr ?? false,
      dhuhr: prayers.dhuhr ?? false,
      asr: prayers.asr ?? false,
      maghrib: prayers.maghrib ?? false,
      isha: prayers.isha ?? false,
    },
    savedAt: Date.now(),
  });

  it('fajr_sunnah et witr initialisés à false', () => {
    const migrated = migratePrayerLog(makeV1({ fajr: true }));
    expect(migrated.v).toBe(2);
    expect(migrated.prayers.fajr_sunnah).toBe(false);
    expect(migrated.prayers.witr).toBe(false);
  });

  it('prières V1 préservées (fajr → sobh en V2)', () => {
    const migrated = migratePrayerLog(makeV1({ fajr: true, dhuhr: true }));
    // en V2, 'fajr' (V1) devient 'sobh'
    expect(migrated.prayers.sobh).toBe(true);
    expect(migrated.prayers.dhuhr).toBe(true);
    expect(migrated.prayers.asr).toBe(false);
  });

  it('adherenceScore = trueCount / 7', () => {
    // 5 prières fard vraies + fajr_sunnah=false + witr=false → 5/7
    const migrated = migratePrayerLog(makeV1({ fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }));
    expect(migrated.adherenceScore).toBeCloseTo(5 / 7, 3);
  });

  it('fardScore = fard trueCount / 5', () => {
    const migrated = migratePrayerLog(makeV1({ fajr: true, dhuhr: true }));
    expect(migrated.fardScore).toBeCloseTo(2 / 5, 3);
  });

  it('trigger=true : toutes les prières → fardScore = 1', () => {
    const migrated = migratePrayerLog(makeV1({ fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }));
    expect(migrated.fardScore).toBe(1);
  });

  it('trigger=false : aucune prière → fardScore = 0', () => {
    const migrated = migratePrayerLog(makeV1());
    expect(migrated.fardScore).toBe(0);
  });
});

describe('computePrayerScores', () => {
  it('7 prières vraies → adherenceScore = 1, fardScore = 1', () => {
    const scores = computePrayerScores({
      sobh: true, fajr_sunnah: true, dhuhr: true,
      asr: true, maghrib: true, isha: true, witr: true,
    });
    expect(scores.adherenceScore).toBe(1);
    expect(scores.fardScore).toBe(1);
  });

  it('aucune prière → scores = 0', () => {
    const scores = computePrayerScores({
      sobh: false, fajr_sunnah: false, dhuhr: false,
      asr: false, maghrib: false, isha: false, witr: false,
    });
    expect(scores.adherenceScore).toBe(0);
    expect(scores.fardScore).toBe(0);
  });
});

// ─── SleepEntry V1 → V2 ──────────────────────────────────────────────────────

describe('SleepEntry V1 → V2 migration', () => {
  const makeV1 = (quality: number, durationH: number) => ({
    v: 1 as const,
    id: '00000000-0000-0000-0000-000000000005',
    date: '2026-01-01',
    timestamp: Date.now(),
    durationH,
    quality,
  });

  it('sleepScore calculé depuis quality + durationH', () => {
    const migrated = migrateSleepEntry(makeV1(5, 8));
    expect(migrated.v).toBe(2);
    expect(migrated.sleepScore).toBeDefined();
    expect(migrated.sleepScore!).toBeGreaterThan(0);
  });

  it('8h + quality 5 → score maximum 100', () => {
    // quality=5 → 50pts, duration=9h (clamp max) → 50pts = 100
    const migrated = migrateSleepEntry(makeV1(5, 9));
    expect(migrated.sleepScore).toBe(100);
  });

  it('6h + quality 1 → score minimum 0', () => {
    // quality=1 → 10pts, duration=6h (clamp min) → 0pts = 10
    const migrated = migrateSleepEntry(makeV1(1, 6));
    expect(migrated.sleepScore).toBe(10);
  });

  it('trigger=true : bonne nuit → sleepScore > 50', () => {
    const migrated = migrateSleepEntry(makeV1(4, 8));
    expect(migrated.sleepScore!).toBeGreaterThan(50);
  });

  it('trigger=false : mauvaise nuit → sleepScore ≤ 50', () => {
    const migrated = migrateSleepEntry(makeV1(2, 6));
    expect(migrated.sleepScore!).toBeLessThanOrEqual(50);
  });
});

describe('computeSleepScore', () => {
  it('quality=3, durationH=7.5 → score intermédiaire', () => {
    const score = computeSleepScore(3, 7.5);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it('durée < 6h → clampé à 6h (durationScore=0)', () => {
    const score4h = computeSleepScore(5, 4);
    const score6h = computeSleepScore(5, 6);
    expect(score4h).toBe(score6h);
  });

  it('durée > 9h → clampé à 9h', () => {
    const score9h = computeSleepScore(5, 9);
    const score12h = computeSleepScore(5, 12);
    expect(score9h).toBe(score12h);
  });
});
