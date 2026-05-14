import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { Planner } from '@/modules/planning/api';
import { buildSchedule } from '@/modules/planning/engine/greedy';
import { energyAtMinute, energyMatchScore, dominantEnergy } from '@/modules/planning/engine/energyModel';
import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import { eventBus } from '@/data/events/bus';
import { uuid } from '@/utils/id';

// ── Helpers ──────────────────────────────────────────────────────────────────

function task(overrides: Partial<ScheduleTaskLatest> = {}): ScheduleTaskLatest {
  return {
    v: 1,
    id: uuid(),
    title: 'test task',
    durationMin: 30,
    priority: 3,
    energyLevel: 'medium',
    domain: 'general',
    tags: [],
    dependsOn: [],
    enabled: true,
    ...overrides,
  };
}

// ── Energy model ─────────────────────────────────────────────────────────────

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

  it('energyMatchScore: exact match = 2', () => {
    expect(energyMatchScore('high', 'high')).toBe(2);
  });
  it('energyMatchScore: one level off = 1', () => {
    expect(energyMatchScore('high', 'medium')).toBe(1);
  });
  it('energyMatchScore: two levels off = 0', () => {
    expect(energyMatchScore('high', 'low')).toBe(0);
  });

  it('dominantEnergy over a 60-min morning window = high', () => {
    expect(dominantEnergy(6 * 60, 60)).toBe('high');
  });
});

// ── Greedy scheduler ─────────────────────────────────────────────────────────

describe('buildSchedule', () => {
  it('schedules a single flexible task', () => {
    const t = task({ title: 'workout', durationMin: 60 });
    const s = buildSchedule('2026-05-10', [t]);
    expect(s.slots).toHaveLength(1);
    expect(s.unscheduled).toHaveLength(0);
    const slot = s.slots[0]!;
    expect(slot.taskId).toBe(t.id);
    expect(slot.endMin - slot.startMin).toBe(60);
  });

  it('places a fixed-time task at its exact minute', () => {
    const t = task({ fixedStartMin: 8 * 60, durationMin: 45 });
    const s = buildSchedule('2026-05-10', [t]);
    expect(s.slots[0]?.startMin).toBe(8 * 60);
    expect(s.slots[0]?.endMin).toBe(8 * 60 + 45);
  });

  it('does not overlap two tasks', () => {
    const tasks = [
      task({ durationMin: 60, priority: 5 }),
      task({ durationMin: 60, priority: 4 }),
      task({ durationMin: 60, priority: 3 }),
    ];
    const s = buildSchedule('2026-05-10', tasks);
    const slots = s.slots.sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]!.startMin).toBeGreaterThanOrEqual(slots[i - 1]!.endMin);
    }
  });

  it('skips disabled tasks', () => {
    const t = task({ enabled: false });
    const s = buildSchedule('2026-05-10', [t]);
    expect(s.slots).toHaveLength(0);
    expect(s.unscheduled).toHaveLength(0);
  });

  it('respects notBeforeMin constraint', () => {
    const t = task({ notBeforeMin: 12 * 60, durationMin: 30 });
    const s = buildSchedule('2026-05-10', [t]);
    expect(s.slots[0]?.startMin).toBeGreaterThanOrEqual(12 * 60);
  });

  it('respects notAfterMin constraint — puts task in unscheduled when window too tight', () => {
    // Only 20 min window available but task needs 30
    const t = task({ notBeforeMin: 21 * 60 + 40, notAfterMin: 22 * 60, durationMin: 30 });
    const s = buildSchedule('2026-05-10', [t]);
    expect(s.unscheduled).toContain(t.id);
  });

  it('respects dependsOn — dependent task starts after dependency ends', () => {
    const dep = task({ fixedStartMin: 8 * 60, durationMin: 60 });
    const dependent = task({ dependsOn: [dep.id], durationMin: 30 });
    const s = buildSchedule('2026-05-10', [dep, dependent]);
    const depSlot = s.slots.find((x) => x.taskId === dep.id)!;
    const depSlot2 = s.slots.find((x) => x.taskId === dependent.id)!;
    expect(depSlot2.startMin).toBeGreaterThanOrEqual(depSlot.endMin);
  });

  it('prefers higher-priority tasks for better time slots', () => {
    const high = task({ priority: 5, durationMin: 60, energyLevel: 'high' });
    const low = task({ priority: 1, durationMin: 60, energyLevel: 'high' });
    const s = buildSchedule('2026-05-10', [low, high]);
    const highSlot = s.slots.find((x) => x.taskId === high.id)!;
    const lowSlot = s.slots.find((x) => x.taskId === low.id)!;
    // High priority gets placed first = earlier in the day
    expect(highSlot.startMin).toBeLessThanOrEqual(lowSlot.startMin);
  });

  it('puts in unscheduled when day is full', () => {
    // Fill the day with one giant task, then try to add another
    const fill = task({ fixedStartMin: 6 * 60, durationMin: 16 * 60 }); // 6h–22h
    const extra = task({ durationMin: 30 });
    const s = buildSchedule('2026-05-10', [fill, extra]);
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

  it('saves and retrieves tasks', async () => {
    const t = task({ title: 'prière Fajr', domain: 'islam' });
    await planner.saveTask(t);
    const all = await planner.getTasks();
    expect(all).toHaveLength(1);
    expect(all[0]?.title).toBe('prière Fajr');
  });

  it('optimize persists schedule and emits planning.optimized', async () => {
    await planner.saveTask(task({ durationMin: 45 }));
    let emitted = false;
    eventBus.on('planning.optimized', () => { emitted = true; });

    const s = await planner.optimize('2026-05-10');
    expect(s.slots).toHaveLength(1);
    expect(emitted).toBe(true);

    const stored = await planner.getSchedule('2026-05-10');
    expect(stored?.id).toBe(s.id);
    eventBus.clear();
  });

  it('preview does not persist', async () => {
    const tasks = [task({ durationMin: 30 })];
    await planner.preview('2026-05-10', tasks);
    const stored = await planner.getSchedule('2026-05-10');
    expect(stored).toBeNull();
  });

  it('deletes a task', async () => {
    const t = task();
    await planner.saveTask(t);
    await planner.deleteTask(t.id);
    expect(await planner.getTasks()).toHaveLength(0);
  });
});
