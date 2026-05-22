import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import type { DayScheduleLatest, ScheduledSlot } from '@/data/schemas/planning/daySchedule';
import { uuid } from '@/utils/id';

export interface SchedulerConfig {
  /** Start of schedulable day in minutes (default: 360 = 06:00) */
  dayStartMin: number;
  /** End of schedulable day in minutes (default: 1320 = 22:00) */
  dayEndMin: number;
  /** Minimum gap between slots in minutes (default: 5) */
  gapMin: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  dayStartMin: 360,
  dayEndMin: 1320,
  gapMin: 5,
};

/**
 * Greedy daily scheduler.
 *
 * Algorithm:
 *   1. Validate and filter enabled tasks.
 *   2. Place fixed-time tasks first (immovable anchors).
 *   3. Sort remaining flexible tasks by score DESC:
 *        score = priority × 10 + dependencyDepth
 *   4. For each flexible task, attempt placement in first available window.
 *        Respect notBefore/notAfter and dependency constraints.
 *   5. Unplaced tasks go into `unscheduled`.
 */
export function buildSchedule(
  date: string,
  tasks: ScheduleTaskLatest[],
  config: Partial<SchedulerConfig> = {},
): DayScheduleLatest {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const enabled = tasks.filter((t) => t.enabled);

  const placed = new Map<string, ScheduledSlot>();
  const unscheduled: string[] = [];

  // ── Step 1: place fixed tasks ──────────────────────────────────────────────
  for (const task of enabled) {
    if (task.fixedStartMin === undefined) continue;
    const start = task.fixedStartMin;
    const end = start + task.durationMin;
    if (hasConflict(start, end, placed)) {
      unscheduled.push(task.id);
    } else {
      placed.set(task.id, { taskId: task.id, startMin: start, endMin: end });
    }
  }

  // ── Step 2: sort flexible tasks ───────────────────────────────────────────
  const flexible = enabled
    .filter((t) => t.fixedStartMin === undefined)
    .sort((a, b) => taskScore(b) - taskScore(a));

  // ── Step 3: place flexible tasks ──────────────────────────────────────────
  for (const task of flexible) {
    const slot = findBestSlot(task, placed, cfg);
    if (!slot) {
      unscheduled.push(task.id);
    } else {
      placed.set(task.id, slot);
    }
  }

  const slots = [...placed.values()].sort((a, b) => a.startMin - b.startMin);

  return {
    v: 1,
    id: uuid(),
    date,
    generatedAt: Date.now(),
    slots,
    unscheduled,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function taskScore(t: ScheduleTaskLatest): number {
  return t.priority * 10;
}

function findBestSlot(
  task: ScheduleTaskLatest,
  placed: Map<string, ScheduledSlot>,
  cfg: SchedulerConfig,
): ScheduledSlot | null {
  const windows = freeWindows(placed, cfg);
  const notBefore = task.notBeforeMin ?? cfg.dayStartMin;
  const notAfter = (task.notAfterMin ?? cfg.dayEndMin) - task.durationMin;

  // Dependency constraint: task must start after all dependsOn tasks end
  const depsEndMin = task.dependsOn.reduce((max, depId) => {
    const dep = placed.get(depId);
    return dep ? Math.max(max, dep.endMin + cfg.gapMin) : max;
  }, notBefore);
  const earliest = Math.max(notBefore, depsEndMin);

  for (const [winStart, winEnd] of windows) {
    const start = Math.max(winStart, earliest);
    const end = Math.min(winEnd, notAfter + task.durationMin);
    if (end - start < task.durationMin) continue;

    const candidateStart = start;
    const candidateEnd = candidateStart + task.durationMin;
    if (candidateEnd > end) continue;

    return { taskId: task.id, startMin: candidateStart, endMin: candidateEnd };
  }

  return null;
}

/** Returns list of [start, end] free windows within the schedulable day. */
function freeWindows(
  placed: Map<string, ScheduledSlot>,
  cfg: SchedulerConfig,
): Array<[number, number]> {
  const occupied = [...placed.values()]
    .map((s): [number, number] => [s.startMin, s.endMin + cfg.gapMin])
    .sort((a, b) => a[0] - b[0]);

  const windows: Array<[number, number]> = [];
  let cursor = cfg.dayStartMin;

  for (const [oStart, oEnd] of occupied) {
    if (oStart > cursor) windows.push([cursor, oStart]);
    cursor = Math.max(cursor, oEnd);
  }

  if (cursor < cfg.dayEndMin) windows.push([cursor, cfg.dayEndMin]);
  return windows;
}

function hasConflict(start: number, end: number, placed: Map<string, ScheduledSlot>): boolean {
  for (const s of placed.values()) {
    if (start < s.endMin && end > s.startMin) return true;
  }
  return false;
}
