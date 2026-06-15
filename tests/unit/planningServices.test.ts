import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { _setStorageForTest } from '@/data/storage/storageService';
import { eventBus } from '@/data/events/bus';

import { DayStateService } from '@/services/dayStateService';
import { defaultSegments, stateAtMinute } from '@/modules/planning/dayState';

import { TimelineService } from '@/modules/planning/timeline';
import { MealService } from '@/services/mealService';
import { SleepService } from '@/services/sleepService';
import { WorkoutService } from '@/services/workoutService';
import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';

const DATE = '2026-05-10';
const at = (h: number, m: number): number => new Date(2026, 4, 10, h, m, 0, 0).getTime();

describe('DayStateService', () => {
  beforeEach(() => _setStorageForTest(new MemoryStorage()));

  it('segmentsForDate → défaut libre si rien de stocké', async () => {
    expect(await DayStateService.getByDate(DATE)).toBeNull();
    expect(await DayStateService.segmentsForDate(DATE)).toEqual(defaultSegments());
  });

  it('setSegment persiste et émet state.changed', async () => {
    let fired = '';
    const off = eventBus.on('state.changed', e => { fired = e.date; });
    const saved = await DayStateService.setSegment(DATE, 'travail', 540, 1020);
    off();

    expect(fired).toBe(DATE);
    expect(stateAtMinute(saved.segments, 600)).toBe('travail');

    const reloaded = await DayStateService.getByDate(DATE);
    expect(reloaded).not.toBeNull();
    expect(stateAtMinute(reloaded!.segments, 600)).toBe('travail');
  });

  it('setSegment successifs se composent', async () => {
    await DayStateService.setSegment(DATE, 'endormi', 0, 420);
    const s2 = await DayStateService.setSegment(DATE, 'travail', 540, 1020);
    expect(stateAtMinute(s2.segments, 100)).toBe('endormi');
    expect(stateAtMinute(s2.segments, 600)).toBe('travail');
    expect(stateAtMinute(s2.segments, 1200)).toBe('libre');
  });

  it('reset supprime l\'enregistrement et émet', async () => {
    await DayStateService.setSegment(DATE, 'malade', 0, 1440);
    let fired = '';
    const off = eventBus.on('state.changed', e => { fired = e.date; });
    await DayStateService.reset(DATE);
    off();

    expect(fired).toBe(DATE);
    expect(await DayStateService.getByDate(DATE)).toBeNull();
  });
});

describe('TimelineService.getByDate (intégration)', () => {
  beforeEach(() => _setStorageForTest(new MemoryStorage()));

  function session(): WorkoutSessionLatest {
    return {
      v: 3, id: `${DATE}.1`, name: 'Push A', date: DATE,
      startTime: at(18, 0), endTime: at(19, 0), duration: 3600,
      solo: true, isException: false, exercises: [], tonnage: 0, durationMin: 60,
    };
  }

  it('agrège les domaines réellement persistés pour la date', async () => {
    await MealService.save({
      v: 2, id: `${DATE}.2`, date: DATE, name: 'Déjeuner', kcal: 600,
      p: 40, c: 50, f: 20, timestamp: at(12, 0), source: 'manual', mealSlot: 2, timeHHMM: '12:30',
    });
    await SleepService.save({
      v: 2, id: `${DATE}.3`, date: DATE, timestamp: at(7, 0),
      durationH: 7, quality: 4, bedtime: '23:30', wakeTime: '07:00',
    });
    await WorkoutService.saveSession(session());

    const items = await TimelineService.getByDate(DATE);
    const types = items.map(i => i.type);
    expect(types).toContain('nutrition');
    expect(types).toContain('sommeil');
    expect(types).toContain('sport');
    // tri : déjeuner 12:30 placé avant la séance 18:00
    const nutritionIdx = items.findIndex(i => i.type === 'nutrition');
    const sportIdx = items.findIndex(i => i.type === 'sport');
    expect(nutritionIdx).toBeLessThan(sportIdx);
  });

  it('date sans donnée → liste vide', async () => {
    expect(await TimelineService.getByDate('2026-01-01')).toEqual([]);
  });
});
