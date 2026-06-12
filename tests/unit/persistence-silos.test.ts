import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../../src/data/storage/MemoryStorage';
import { _setStorageForTest } from '../../src/data/storage/storageService';
import { AnthropoGoalsService } from '../../src/services/anthropoGoalsService';
import { OneRepMaxService } from '../../src/services/oneRepMaxService';
import { migratePeriodization } from '../../src/data/schemas/sport/periodization';

// ─── anthropo.goals ───────────────────────────────────────────────────────────

describe('AnthropoGoalsService (silo anthropo.goals)', () => {
  beforeEach(() => _setStorageForTest(new MemoryStorage()));

  it('get retourne null si vide', async () => {
    expect(await AnthropoGoalsService.get()).toBeNull();
  });

  it('save puis get round-trip', async () => {
    await AnthropoGoalsService.save({ v: 1, targetWeightKg: 80, targetBodyFatPct: 12 });
    const g = await AnthropoGoalsService.get();
    expect(g?.targetWeightKg).toBe(80);
    expect(g?.targetBodyFatPct).toBe(12);
  });

  it('champs optionnels absents tolérés', async () => {
    await AnthropoGoalsService.save({ v: 1 });
    const g = await AnthropoGoalsService.get();
    expect(g?.v).toBe(1);
    expect(g?.targetWeightKg).toBeUndefined();
  });
});

// ─── sport.oneRepMax ──────────────────────────────────────────────────────────

describe('OneRepMaxService (silo sport.oneRepMax)', () => {
  beforeEach(() => _setStorageForTest(new MemoryStorage()));

  it('getRecords retourne {} si vide', async () => {
    expect(await OneRepMaxService.getRecords()).toEqual({});
  });

  it('saveRecords puis getRecords round-trip', async () => {
    await OneRepMaxService.saveRecords({ squat: 140, bench: 100 });
    expect(await OneRepMaxService.getRecords()).toEqual({ squat: 140, bench: 100 });
  });

  it('écrase les records au save suivant', async () => {
    await OneRepMaxService.saveRecords({ squat: 140 });
    await OneRepMaxService.saveRecords({ squat: 145, deadlift: 180 });
    expect(await OneRepMaxService.getRecords()).toEqual({ squat: 145, deadlift: 180 });
  });
});

// ─── sport.periodization ──────────────────────────────────────────────────────

describe('Periodization silo (sport.periodization)', () => {
  it('migrator + storage round-trip (durabilité du mésocycle)', async () => {
    const storage = new MemoryStorage();
    const state = { v: 1 as const, phase: 1 as const, mesoWeek: 3, startDate: '2026-01-01', deloadTriggered: true };
    await storage.set('sport.periodization', state);
    const loaded = await storage.get('sport.periodization', migratePeriodization);
    expect(loaded).toEqual(state);
  });
});
