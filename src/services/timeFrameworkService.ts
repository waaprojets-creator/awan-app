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

// ─── Granularité période ──────────────────────────────────────────────────────

export type Granularity = 'day' | 'week' | 'month' | 'year';

export interface PeriodTimeFrame {
  periodStart: string;   // ISO YYYY-MM-DD
  periodEnd: string;
  periodHours: number;   // nombre d'heures total de la période
  T_somatique: number;
  T_production: number;
  T_friction: number;
  T_slack: number;
  T_eveil: number;
  Cet: number;
  alert: boolean;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function periodBounds(g: Granularity, anchor: Date): { from: string; to: string; hours: number; scale: number } {
  const d = new Date(anchor); d.setHours(0, 0, 0, 0);

  if (g === 'day') {
    const s = toDateStr(d);
    return { from: s, to: s, hours: 24, scale: 1 / 7 };
  }
  if (g === 'week') {
    const dow = d.getDay() || 7;
    const mon = new Date(d); mon.setDate(d.getDate() - (dow - 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: toDateStr(mon), to: toDateStr(sun), hours: 168, scale: 1 };
  }
  if (g === 'month') {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const days = last.getDate();
    return { from: toDateStr(first), to: toDateStr(last), hours: days * 24, scale: days / 7 };
  }
  // year
  const first = new Date(d.getFullYear(), 0, 1);
  const last = new Date(d.getFullYear(), 11, 31);
  const yr = d.getFullYear();
  const days = (yr % 4 === 0 && (yr % 100 !== 0 || yr % 400 === 0)) ? 366 : 365;
  return { from: toDateStr(first), to: toDateStr(last), hours: days * 24, scale: days / 7 };
}

/**
 * Calcule le budget temporel pour une granularité et une date d'ancrage données.
 * Sleep : données réelles filtrées par plage.
 * Production/Friction : tâches actives de la semaine × coefficient de période
 *   (la file Planifier = engagement hebdomadaire, mis à l'échelle).
 */
export async function buildPeriodTimeFrame(g: Granularity, anchor: Date): Promise<PeriodTimeFrame> {
  const { from, to, hours, scale } = periodBounds(g, anchor);

  const allSleep = await SleepService.getAll();
  const T_somatique = allSleep
    .filter(e => e.date >= from && e.date <= to)
    .reduce((sum, e) => sum + (e.durationH ?? 0), 0);

  const storage = await getStorage();
  const planner = new Planner(storage);
  const tasks = await planner.getActiveTasks();
  const active = tasks.filter(t => t.status === 'active');

  const weekProduction = active
    .filter(t => t.timeCategory === 'production')
    .reduce((sum, t) => sum + (t.durationMin ?? 0) / 60, 0);

  const weekFriction = active
    .filter(t => t.timeCategory === 'friction')
    .reduce((sum, t) => sum + (t.durationMin ?? 0) / 60, 0);

  const T_production = weekProduction * scale;
  const T_friction = weekFriction * scale;
  const T_eveil = Math.max(0, hours - T_somatique);
  const T_slack = Math.max(0, T_eveil - T_production - T_friction);
  const Cet = T_eveil > 0 ? (T_production + T_slack) / T_eveil : 0;

  return {
    periodStart: from,
    periodEnd: to,
    periodHours: hours,
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
