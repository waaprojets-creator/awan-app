import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import type { DayScheduleLatest, ScheduledSlot } from '@/data/schemas/planning/daySchedule';
import { dateId } from '@/utils/id';

export interface SchedulerConfig {
  dayStartMin: number;
  dayEndMin: number;
  gapMin: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  dayStartMin: 360,
  dayEndMin: 1320,
  gapMin: 5,
};

export function buildSchedule(
  date: string,
  tasks: ScheduleTaskLatest[],
  config: Partial<SchedulerConfig> = {},
): DayScheduleLatest {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const active = tasks.filter(t => t.status === 'active' && t.scheduledDate === date);

  const placed = new Map<string, ScheduledSlot>();
  const unscheduled: string[] = [];

  // Priority 1 avec timeHHMM = ancres immovables
  for (const task of active) {
    if (task.priority !== 1 || !task.timeHHMM) continue;
    const start = timeToMin(task.timeHHMM);
    const end = start + task.durationMin;
    if (hasConflict(start, end, placed)) {
      unscheduled.push(task.id);
    } else {
      placed.set(task.id, { taskId: task.id, startMin: start, endMin: end });
    }
  }

  // Priority 1 sans timeHHMM + priority 2-3 = placement greedy par score
  const flexible = active
    .filter(t => !(t.priority === 1 && t.timeHHMM))
    .sort((a, b) => a.priority - b.priority); // priority 1 < 2 < 3

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
    id: dateId(date),
    date,
    generatedAt: Date.now(),
    slots,
    unscheduled,
  };
}

function timeToMin(timeHHMM: string): number {
  const [h, m] = timeHHMM.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function findBestSlot(
  task: ScheduleTaskLatest,
  placed: Map<string, ScheduledSlot>,
  cfg: SchedulerConfig,
): ScheduledSlot | null {
  const windows = freeWindows(placed, cfg);
  const earliest = task.dependsOn.reduce((max, depId) => {
    const dep = placed.get(depId);
    return dep ? Math.max(max, dep.endMin + cfg.gapMin) : max;
  }, cfg.dayStartMin);

  for (const [winStart, winEnd] of windows) {
    const start = Math.max(winStart, earliest);
    if (winEnd - start < task.durationMin) continue;
    return { taskId: task.id, startMin: start, endMin: start + task.durationMin };
  }

  return null;
}

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
