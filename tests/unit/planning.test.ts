import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { Planner } from '@/modules/planning/api';
import { buildSchedule } from '@/modules/planning/engine/greedy';
import { energyAtMinute, dominantEnergy } from '@/modules/planning/engine/energyModel';
import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import { eventBus } from '@/data/events/bus';
import { uuid } from '@/utils/id';

const DATE = '2026-05-10';

// ── Helpers ──────────────────────────────────────────────────────────────────

function task(overrides: Partial<ScheduleTaskLatest> = {}): ScheduleTaskLatest {
  return {
    v: 4,
    id: uuid(),
    date: DATE,
    scheduledDate: DATE,
    title: 'test task',
    durationMin: 30,
    priority: 3,
    domain: 'general',
    tags: [],
    dependsOn: [],
    status: 'active',
    timeCategory: null,
    ...overrides,
  };
}

// ── Circadian model ───────────────────────────────────────────────────────────

describe('energyModel', () => {
  it('returns high energy at 07:00', () => {
    expect(energyAtMinute(7 * 60)).toBe('high');
  });
  it('returns low energy at 13:00 (post-lunch dip)', () => {
    expect(energyAtMinute(13 * 60)).toBe('low');
  });
  it('returns medium energy at 10:00', () => {
    expect(energyAtMinute(10 * 60)).toBe('medium');
  });

  it('dominantEnergy over a 60-min morning window = high', () => {
    expect(dominantEnergy(6 * 60, 60)).toBe('high');
  });
});

// ── Greedy scheduler (V4 : status + scheduledDate + priority 1-3 + timeHHMM) ──

describe('buildSchedule', () => {
  it('schedules a single flexible task', () => {
    const t = task({ title: 'workout', durationMin: 60 });
    const s = buildSchedule(DATE, [t]);
    expect(s.slots).toHaveLength(1);
    expect(s.unscheduled).toHaveLength(0);
    const slot = s.slots[0]!;
    expect(slot.taskId).toBe(t.id);
    expect(slot.endMin - slot.startMin).toBe(60);
  });

  it('places a priority-1 anchor at its exact timeHHMM', () => {
    const t = task({ priority: 1, timeHHMM: '08:00', durationMin: 45 });
    const s = buildSchedule(DATE, [t]);
    expect(s.slots[0]?.startMin).toBe(8 * 60);
    expect(s.slots[0]?.endMin).toBe(8 * 60 + 45);
  });

  it('does not overlap two tasks', () => {
    const tasks = [
      task({ durationMin: 60, priority: 1 }),
      task({ durationMin: 60, priority: 2 }),
      task({ durationMin: 60, priority: 3 }),
    ];
    const s = buildSchedule(DATE, tasks);
    const slots = s.slots.sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]!.startMin).toBeGreaterThanOrEqual(slots[i - 1]!.endMin);
    }
  });

  it('skips non-active tasks (status !== active)', () => {
    const t = task({ status: 'cancelled' });
    const s = buildSchedule(DATE, [t]);
    expect(s.slots).toHaveLength(0);
    expect(s.unscheduled).toHaveLength(0);
  });

  it('only schedules tasks whose scheduledDate matches the target day', () => {
    const t = task({ scheduledDate: '2026-05-11' });
    const s = buildSchedule(DATE, [t]);
    expect(s.slots).toHaveLength(0);
  });

  it('respects dependsOn — dependent task starts after dependency ends', () => {
    const dep = task({ priority: 1, timeHHMM: '08:00', durationMin: 60 });
    const dependent = task({ dependsOn: [dep.id], durationMin: 30 });
    const s = buildSchedule(DATE, [dep, dependent]);
    const depSlot = s.slots.find((x) => x.taskId === dep.id)!;
    const depSlot2 = s.slots.find((x) => x.taskId === dependent.id)!;
    expect(depSlot2.startMin).toBeGreaterThanOrEqual(depSlot.endMin);
  });

  it('prefers higher-priority tasks (1 < 2 < 3) for earlier slots', () => {
    const high = task({ priority: 1, durationMin: 60 });
    const low = task({ priority: 3, durationMin: 60 });
    const s = buildSchedule(DATE, [low, high]);
    const highSlot = s.slots.find((x) => x.taskId === high.id)!;
    const lowSlot = s.slots.find((x) => x.taskId === low.id)!;
    expect(highSlot.startMin).toBeLessThanOrEqual(lowSlot.startMin);
  });

  it('puts in unscheduled when day is full', () => {
    const fill = task({ priority: 1, timeHHMM: '06:00', durationMin: 16 * 60 });
    const extra = task({ durationMin: 30 });
    const s = buildSchedule(DATE, [fill, extra]);
    expect(s.unscheduled).toContain(extra.id);
  });
});

// ── Planner API ──────────────────────────────────────────────────────────────

describe('Planner', () => {
  let storage: MemoryStorage;
  let planner: Planner;

  beforeEach(() => {
    storage = new MemoryStorage();
    planner = new Planner(storage);
    eventBus.clear();
  });

  it('saves and retrieves active tasks', async () => {
    const t = task({ title: 'prière Fajr', domain: 'islam' });
    await planner.saveTask(t);
    const all = await planner.getActiveTasks();
    expect(all).toHaveLength(1);
    expect(all[0]?.title).toBe('prière Fajr');
  });

  it('optimize persists schedule and emits planning.optimized', async () => {
    await planner.saveTask(task({ durationMin: 45 }));
    let emitted = false;
    eventBus.on('planning.optimized', () => { emitted = true; });

    const s = await planner.optimize(DATE);
    expect(s.slots).toHaveLength(1);
    expect(emitted).toBe(true);

    const stored = await planner.getSchedule(DATE);
    expect(stored?.id).toBe(s.id);
    eventBus.clear();
  });

  it('preview does not persist', async () => {
    const tasks = [task({ durationMin: 30 })];
    await planner.preview(DATE, tasks);
    const stored = await planner.getSchedule(DATE);
    expect(stored).toBeNull();
  });

  it('deletes a task', async () => {
    const t = task();
    await planner.saveTask(t);
    await planner.deleteTask(t.id);
    expect(await planner.getActiveTasks()).toHaveLength(0);
  });
});
