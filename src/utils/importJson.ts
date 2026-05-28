import { migrateRoutine, migrateWorkoutSession } from '../data/schemas/sport/routine';
import { migrateMeasurement } from '../data/schemas/anthropo/measurement';
import { migrateMealEntry } from '../data/schemas/nutrition/mealEntry';
import { migratePrayerLog } from '../data/schemas/islam/prayerLog';
import { migrateJournalEntry } from '../data/schemas/journal/journalEntry';
import { migrateSleepEntry } from '../data/schemas/sleep/sleepEntry';
import { migrateWaterIntake } from '../data/schemas/nutrition/waterIntake';
import { migrateScheduleTask } from '../data/schemas/planning/scheduleTask';
import { migrateDaySchedule } from '../data/schemas/planning/daySchedule';
import { migrateWeightEntry } from '../data/schemas/body/weightEntry';
import { WorkoutService } from '../services/workoutService';
import { getStorage } from '../data/storage/storageService';
import type { RoutineLatest, WorkoutSessionLatest } from '../data/schemas/sport/routine';
import type { MeasurementLatest } from '../data/schemas/anthropo/measurement';
import type { MealEntryLatest } from '../data/schemas/nutrition/mealEntry';
import type { PrayerLogLatest } from '../data/schemas/islam/prayerLog';
import type { JournalEntryLatest } from '../data/schemas/journal/journalEntry';
import type { SleepEntryLatest } from '../data/schemas/sleep/sleepEntry';
import type { WaterIntakeLatest } from '../data/schemas/nutrition/waterIntake';
import type { ScheduleTaskLatest } from '../data/schemas/planning/scheduleTask';
import type { DayScheduleLatest } from '../data/schemas/planning/daySchedule';
import type { WeightEntryLatest } from '../data/schemas/body/weightEntry';

export interface SeedData {
  routines?: unknown[];
  sessions?: unknown[];
  measurements?: unknown[];
  weightEntries?: unknown[];
  meals?: unknown[];
  prayerLogs?: unknown[];
  journalEntries?: unknown[];
  sleepEntries?: unknown[];
  waterIntakes?: unknown[];
  scheduleTasks?: unknown[];
  daySchedules?: unknown[];
}

export type ImportPayload =
  | { type: 'sport.routine'; data: unknown }
  | { type: 'sport.routines'; data: unknown[] }
  | { type: 'seed.full'; data: SeedData };

export async function importFromJson(raw: string): Promise<{ success: boolean; message: string }> {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return { success: false, message: 'JSON invalide' }; }

  const payload = parsed as ImportPayload;

  if (payload.type === 'sport.routine') {
    try {
      const routine = migrateRoutine(payload.data) as RoutineLatest;
      await WorkoutService.saveRoutine(routine);
      return { success: true, message: `Routine "${routine.name}" importée` };
    } catch (e) {
      return { success: false, message: `Erreur schema: ${String(e)}` };
    }
  }

  if (payload.type === 'sport.routines') {
    const arr = Array.isArray(payload.data) ? payload.data : [];
    let count = 0;
    for (const item of arr) {
      try {
        const routine = migrateRoutine(item) as RoutineLatest;
        await WorkoutService.saveRoutine(routine);
        count++;
      } catch { /* skip invalid */ }
    }
    return { success: true, message: `${count} routine(s) importée(s)` };
  }

  if (payload.type === 'seed.full') {
    const data = payload.data ?? {};
    let nRoutines = 0, nSessions = 0, nMeasurements = 0, nMeals = 0;
    let nPrayers = 0, nJournal = 0, nSleep = 0, nWater = 0, nTasks = 0;
    let nWeights = 0, nSchedules = 0;

    const storage = await getStorage();

    await storage.transaction(async (tx) => {
      for (const item of data.routines ?? []) {
        try { const r = migrateRoutine(item) as RoutineLatest; await tx.set(`sport.routine.${r.id}`, r); nRoutines++; } catch { /* skip */ }
      }
      for (const item of data.sessions ?? []) {
        try { const s = migrateWorkoutSession(item) as WorkoutSessionLatest; await tx.set(`sport.session.${s.id}`, s); nSessions++; } catch { /* skip */ }
      }
      for (const item of data.measurements ?? []) {
        try { const m = migrateMeasurement(item) as MeasurementLatest; await tx.set(`anthropo.measurement.${m.date}`, m); nMeasurements++; } catch { /* skip */ }
      }
      for (const item of data.weightEntries ?? []) {
        try { const w = migrateWeightEntry(item) as WeightEntryLatest; await tx.set(`weight.entry.${w.id}`, w); nWeights++; } catch { /* skip */ }
      }
      for (const item of data.meals ?? []) {
        try { const m = migrateMealEntry(item) as MealEntryLatest; await tx.set(`nutrition.meal.${m.id}`, m); nMeals++; } catch { /* skip */ }
      }
      for (const item of data.prayerLogs ?? []) {
        try { const p = migratePrayerLog(item) as PrayerLogLatest; await tx.set(`islam.prayer.${p.date}`, p); nPrayers++; } catch { /* skip */ }
      }
      for (const item of data.journalEntries ?? []) {
        try { const j = migrateJournalEntry(item) as JournalEntryLatest; await tx.set(`journal.entry.${j.id}`, j); nJournal++; } catch { /* skip */ }
      }
      for (const item of data.sleepEntries ?? []) {
        try { const s = migrateSleepEntry(item) as SleepEntryLatest; await tx.set(`sleep.entry.${s.id}`, s); nSleep++; } catch { /* skip */ }
      }
      for (const item of data.waterIntakes ?? []) {
        try { const w = migrateWaterIntake(item) as WaterIntakeLatest; await tx.set(`nutrition.water.${w.date}`, w); nWater++; } catch { /* skip */ }
      }
      for (const item of data.scheduleTasks ?? []) {
        try { const t = migrateScheduleTask(item) as ScheduleTaskLatest; await tx.set(`planning.task.${t.id}`, t); nTasks++; } catch { /* skip */ }
      }
      for (const item of data.daySchedules ?? []) {
        try { const s = migrateDaySchedule(item) as DayScheduleLatest; await tx.set(`planning.schedule.${s.date}`, s); nSchedules++; } catch { /* skip */ }
      }
    });

    return {
      success: true,
      message: `Seed: ${nRoutines} routines, ${nSessions} sessions, ${nMeasurements} mesures, ${nWeights} poids, ${nMeals} repas, ${nPrayers} prières, ${nJournal} journal, ${nSleep} sommeil, ${nWater} eau, ${nTasks} tâches, ${nSchedules} plannings`,
    };
  }

  return { success: false, message: `Type inconnu: ${(payload as { type?: string }).type ?? 'undefined'}` };
}
