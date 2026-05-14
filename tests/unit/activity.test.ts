import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { ActivityService } from '@/modules/activity/api';
import { StepsProvider } from '@/modules/activity/providers/StepsProvider';
import { WorkoutProvider } from '@/modules/activity/providers/WorkoutProvider';
import { createAggregator } from '@/modules/activity/aggregator';
import type { IActivityProvider } from '@/modules/activity/providers/IActivityProvider';
import type { ActivityRecordLatest } from '@/data/schemas/activity/activityRecord';
import { eventBus } from '@/data/events/bus';
import { uuid } from '@/utils/id';

const DATE = '2026-05-10';

function stepsRecord(steps: number): ActivityRecordLatest {
  return {
    v: 1, id: uuid(), date: DATE, type: 'steps',
    source: 'device.pedometer', steps,
  };
}

function workoutLog(durationMin = 60, rpe = 7) {
  const startedAt = new Date(DATE + 'T08:00:00Z').getTime();
  return {
    v: 2,
    id: uuid(),
    date: DATE,
    startedAt,
    endedAt: startedAt + durationMin * 60_000,
    sets: [{ v: 1, exerciseId: 'squat', reps: 5, weightKg: 100, rpe }],
  };
}

describe('StepsProvider', () => {
  it('reads steps records from storage', async () => {
    const storage = new MemoryStorage();
    const record = stepsRecord(5000);
    await storage.set(`activity.steps.${DATE}.1`, record);

    const provider = new StepsProvider(storage);
    const records = await provider.getRecords(DATE);
    expect(records).toHaveLength(1);
    expect(records[0]?.steps).toBe(5000);
  });

  it('returns empty for a day with no data', async () => {
    const storage = new MemoryStorage();
    const provider = new StepsProvider(storage);
    expect(await provider.getRecords(DATE)).toHaveLength(0);
  });
});

describe('WorkoutProvider', () => {
  it('converts a workout log to an activity record', async () => {
    const storage = new MemoryStorage();
    await storage.set('sport.workoutLog.abc', workoutLog(60, 7));

    const provider = new WorkoutProvider(storage);
    const records = await provider.getRecords(DATE);
    expect(records).toHaveLength(1);
    expect(records[0]?.type).toBe('workout');
    expect(records[0]?.activeMinutes).toBe(60);
    expect(records[0]?.caloriesKcal).toBeGreaterThan(0);
  });

  it('ignores workout logs from other dates', async () => {
    const storage = new MemoryStorage();
    await storage.set('sport.workoutLog.abc', { ...workoutLog(), date: '2026-01-01' });

    const provider = new WorkoutProvider(storage);
    expect(await provider.getRecords(DATE)).toHaveLength(0);
  });
});

describe('createAggregator', () => {
  it('sums totals from multiple providers', async () => {
    const mockA: IActivityProvider = {
      sourceId: 'a',
      getRecords: async () => [stepsRecord(3000)],
    };
    const mockB: IActivityProvider = {
      sourceId: 'b',
      getRecords: async () => [stepsRecord(2000)],
    };
    const agg = createAggregator([mockA, mockB]);
    const s = await agg.aggregate(DATE);
    expect(s.totalSteps).toBe(5000);
    expect(s.records).toHaveLength(2);
  });

  it('returns zero totals when providers are empty', async () => {
    const agg = createAggregator([]);
    const s = await agg.aggregate(DATE);
    expect(s.totalSteps).toBe(0);
    expect(s.totalCaloriesKcal).toBe(0);
    expect(s.totalActiveMinutes).toBe(0);
  });
});

describe('ActivityService', () => {
  let storage: MemoryStorage;
  let service: ActivityService;

  beforeEach(() => {
    storage = new MemoryStorage();
    service = new ActivityService(storage);
    eventBus.clear();
  });

  it('summarize persists the summary', async () => {
    await storage.set(`activity.steps.${DATE}.1`, stepsRecord(8000));
    const s = await service.summarize(DATE);
    expect(s.totalSteps).toBe(8000);
    const stored = await service.getSummary(DATE);
    expect(stored?.id).toBe(s.id);
  });

  it('emits steps.updated when steps > 0', async () => {
    await storage.set(`activity.steps.${DATE}.1`, stepsRecord(4000));
    let payload: { date: string; steps: number } | null = null;
    eventBus.on('steps.updated', (p) => { payload = p; });

    await service.summarize(DATE);
    expect(payload).toEqual({ date: DATE, steps: 4000 });
    eventBus.clear();
  });

  it('does not emit steps.updated when steps = 0', async () => {
    let emitted = false;
    eventBus.on('steps.updated', () => { emitted = true; });
    await service.summarize(DATE);
    expect(emitted).toBe(false);
    eventBus.clear();
  });

  it('combines steps + workout calories in one summary', async () => {
    await storage.set(`activity.steps.${DATE}.1`, stepsRecord(6000));
    await storage.set('sport.workoutLog.w1', workoutLog(45, 8));
    const s = await service.summarize(DATE);
    expect(s.totalSteps).toBe(6000);
    expect(s.totalCaloriesKcal).toBeGreaterThan(0);
    expect(s.totalActiveMinutes).toBe(45);
  });
});
