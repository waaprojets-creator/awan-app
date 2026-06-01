import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { SleepEntryLatest } from '../../src/data/schemas/sleep/sleepEntry';
import type { ScheduleTaskLatest } from '../../src/data/schemas/planning/scheduleTask';

// ─── Hoisted mocks (vi.hoisted runs before vi.mock hoisting) ─────────────────

const mockGetAll = vi.hoisted(() => vi.fn<[], Promise<SleepEntryLatest[]>>().mockResolvedValue([]));
const mockGetTasks = vi.hoisted(() => vi.fn<[], Promise<ScheduleTaskLatest[]>>().mockResolvedValue([]));

vi.mock('../../src/services/sleepService', () => ({
  SleepService: { getAll: mockGetAll },
}));

vi.mock('../../src/data/storage/storageService', () => ({
  getStorage: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/modules/planning/api', () => ({
  Planner: class {
    getTasks() { return mockGetTasks(); }
  },
}));

// ─── Import AFTER mocks are registered ───────────────────────────────────────

const { buildWeekTimeFrame } = await import('../../src/services/timeFrameworkService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSleep(date: string, durationH: number): SleepEntryLatest {
  return {
    v: 2, id: `sleep-${date}`, date,
    bedtime: '22:00', wakeTime: '06:00',
    durationH, quality: 4,
  } as SleepEntryLatest;
}

function makeTask(
  id: string,
  timeCategory: ScheduleTaskLatest['timeCategory'],
  durationMin: number,
  enabled = true,
): ScheduleTaskLatest {
  return {
    v: 3, id, title: `Task ${id}`,
    durationMin, priority: 3,
    domain: 'general', tags: [], dependsOn: [],
    enabled, timeCategory,
  };
}

function currentMonday(): string {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildWeekTimeFrame', () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    mockGetTasks.mockReset();
    mockGetAll.mockResolvedValue([]);
    mockGetTasks.mockResolvedValue([]);
  });

  it('returns zero hours when no sleep and no tasks', async () => {
    const frame = await buildWeekTimeFrame(0);
    expect(frame.T_somatique).toBe(0);
    expect(frame.T_production).toBe(0);
    expect(frame.T_friction).toBe(0);
    expect(frame.T_eveil).toBe(168);
    expect(frame.T_slack).toBe(168);
  });

  it('computes T_somatique from sleep entries this week', async () => {
    const mon = currentMonday();
    mockGetAll.mockResolvedValue([
      makeSleep(mon, 7.5),
      makeSleep(mon, 8.0),
    ]);
    const frame = await buildWeekTimeFrame(0);
    expect(frame.T_somatique).toBeCloseTo(15.5, 1);
    expect(frame.T_eveil).toBeCloseTo(168 - 15.5, 1);
  });

  it('ignores sleep entries outside the current week', async () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    const oldStr = old.toISOString().slice(0, 10);
    mockGetAll.mockResolvedValue([makeSleep(oldStr, 8)]);
    const frame = await buildWeekTimeFrame(0);
    expect(frame.T_somatique).toBe(0);
  });

  it('computes T_production from enabled production tasks', async () => {
    mockGetTasks.mockResolvedValue([
      makeTask('t1', 'production', 120),  // 2h
      makeTask('t2', 'production', 60),   // 1h
      makeTask('t3', 'friction', 90),     // should not count
    ]);
    const frame = await buildWeekTimeFrame(0);
    expect(frame.T_production).toBeCloseTo(3, 5);
  });

  it('computes T_friction from enabled friction tasks', async () => {
    mockGetTasks.mockResolvedValue([
      makeTask('t1', 'friction', 60),     // 1h
      makeTask('t2', 'friction', 30),     // 0.5h
      makeTask('t3', 'production', 120),  // should not count
    ]);
    const frame = await buildWeekTimeFrame(0);
    expect(frame.T_friction).toBeCloseTo(1.5, 5);
  });

  it('excludes disabled tasks', async () => {
    mockGetTasks.mockResolvedValue([
      makeTask('t1', 'production', 120, false),
      makeTask('t2', 'friction', 60, false),
    ]);
    const frame = await buildWeekTimeFrame(0);
    expect(frame.T_production).toBe(0);
    expect(frame.T_friction).toBe(0);
  });

  it('treats null timeCategory as unclassified (not counted)', async () => {
    mockGetTasks.mockResolvedValue([makeTask('t1', null, 120)]);
    const frame = await buildWeekTimeFrame(0);
    expect(frame.T_production).toBe(0);
    expect(frame.T_friction).toBe(0);
  });

  it('computes Cet = (T_production + T_slack) / T_eveil', async () => {
    mockGetTasks.mockResolvedValue([
      makeTask('t1', 'production', 1200),  // 20h
      makeTask('t2', 'friction', 900),     // 15h
    ]);
    const frame = await buildWeekTimeFrame(0);
    expect(frame.T_production).toBeCloseTo(20, 5);
    expect(frame.T_friction).toBeCloseTo(15, 5);
    expect(frame.T_slack).toBeCloseTo(133, 1);  // 168 - 20 - 15
    expect(frame.Cet).toBeGreaterThan(0.9);
    expect(frame.alert).toBe(false);
  });

  it('sets alert=true when Cet < 0.70', async () => {
    mockGetTasks.mockResolvedValue([
      makeTask('t1', 'friction', 6000),  // 100h — extreme friction scenario
      makeTask('t2', 'production', 300), // 5h
    ]);
    const frame = await buildWeekTimeFrame(0);
    expect(frame.Cet).toBeLessThan(0.70);
    expect(frame.alert).toBe(true);
  });

  it('weekStart is the Monday of the current week', async () => {
    const frame = await buildWeekTimeFrame(0);
    expect(frame.weekStart).toBe(currentMonday());
  });

  it('T_eveil + T_somatique equals 168', async () => {
    const mon = currentMonday();
    mockGetAll.mockResolvedValue([makeSleep(mon, 49)]);
    const frame = await buildWeekTimeFrame(0);
    expect(frame.T_somatique + frame.T_eveil).toBeCloseTo(168, 1);
  });
});
