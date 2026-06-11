import { getStorage } from '@/data/storage/storageService';
import { Planner } from '@/modules/planning/api';
import { SleepService } from './sleepService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekTimeFrame {
  weekStart: string;      // ISO date of Monday
  T_somatique: number;    // hours of sleep this week
  T_production: number;   // hours from tasks timeCategory='production'
  T_friction: number;     // hours from tasks timeCategory='friction'
  T_slack: number;        // hours = T_eveil - T_production - T_friction
  T_eveil: number;        // 168 - T_somatique
  Cet: number;            // (T_production + T_slack) / T_eveil
  alert: boolean;         // true if Cet < 0.70
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns { monStr, sunStr } for the ISO week at offset (0 = current). */
function isoWeekBounds(weekOffset: number): { monStr: string; sunStr: string } {
  const now = new Date();
  const day = now.getDay() || 7; // 1=Mon … 7=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day - 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    monStr: monday.toISOString().slice(0, 10),
    sunStr: sunday.toISOString().slice(0, 10),
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Computes the T_friction / T_production / T_slack / Cet framework for a week.
 * Source of truth for T_production and T_friction: ScheduleTask V3 timeCategory.
 * Source of truth for T_somatique: SleepService entries.
 * weekOffset=0 → current week, -1 → last week, etc.
 */
export async function buildWeekTimeFrame(weekOffset = 0): Promise<WeekTimeFrame> {
  const { monStr, sunStr } = isoWeekBounds(weekOffset);

  // ── T_somatique: sleep hours for the week ──────────────────────────────────
  const allSleep = await SleepService.getAll();
  const T_somatique = allSleep
    .filter(e => e.date >= monStr && e.date <= sunStr)
    .reduce((sum, e) => sum + (e.durationH ?? 0), 0);

  // ── T_production & T_friction: scheduled tasks with timeCategory ──────────
  // db.events (AppStateContext) is a stub — tasks in IStorage are the source.
  const storage = await getStorage();
  const planner = new Planner(storage);
  const tasks = await planner.getActiveTasks();

  const enabledTasks = tasks.filter(t => t.status === 'active');

  const T_production = enabledTasks
    .filter(t => t.timeCategory === 'production')
    .reduce((sum, t) => sum + (t.durationMin ?? 0) / 60, 0);

  const T_friction = enabledTasks
    .filter(t => t.timeCategory === 'friction')
    .reduce((sum, t) => sum + (t.durationMin ?? 0) / 60, 0);

  // ── Derived ───────────────────────────────────────────────────────────────
  const T_eveil = Math.max(0, 168 - T_somatique);
  const T_slack = Math.max(0, T_eveil - T_production - T_friction);
  const Cet = T_eveil > 0 ? (T_production + T_slack) / T_eveil : 0;

  return {
    weekStart: monStr,
    T_somatique: parseFloat(T_somatique.toFixed(1)),
    T_production: parseFloat(T_production.toFixed(1)),
    T_friction: parseFloat(T_friction.toFixed(1)),
    T_slack: parseFloat(T_slack.toFixed(1)),
    T_eveil: parseFloat(T_eveil.toFixed(1)),
    Cet: parseFloat(Cet.toFixed(3)),
    alert: Cet < 0.70,
  };
}

/**
 * Builds time frames for the last `weekCount` weeks (most recent last).
 */
export async function buildWeekTimeFrames(weekCount = 4): Promise<WeekTimeFrame[]> {
  const frames: WeekTimeFrame[] = [];
  for (let i = -(weekCount - 1); i <= 0; i++) {
    frames.push(await buildWeekTimeFrame(i));
  }
  return frames;
}
