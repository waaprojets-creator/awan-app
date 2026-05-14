import { migrateRoutine, migrateWorkoutSession } from '../data/schemas/sport/routine';
import { migrateMeasurement } from '../data/schemas/anthropo/measurement';
import { migrateMealEntry } from '../data/schemas/nutrition/mealEntry';
import { migratePrayerLog } from '../data/schemas/islam/prayerLog';
import { migrateJournalEntry } from '../data/schemas/journal/journalEntry';
import { WorkoutService } from '../services/workoutService';
import { MeasurementService } from '../services/measurementService';
import { MealService } from '../services/mealService';
import { IslamService } from '../services/islamService';
import { JournalService } from '../services/journalService';
import type { RoutineLatest, WorkoutSessionLatest } from '../data/schemas/sport/routine';
import type { MeasurementLatest } from '../data/schemas/anthropo/measurement';
import type { MealEntryLatest } from '../data/schemas/nutrition/mealEntry';
import type { PrayerLogLatest } from '../data/schemas/islam/prayerLog';
import type { JournalEntryLatest } from '../data/schemas/journal/journalEntry';

export interface SeedData {
  routines?: unknown[];
  sessions?: unknown[];
  measurements?: unknown[];
  meals?: unknown[];
  prayerLogs?: unknown[];
  journalEntries?: unknown[];
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
    let nRoutines = 0;
    let nSessions = 0;
    let nMeasurements = 0;
    let nMeals = 0;
    let nPrayers = 0;
    let nJournal = 0;

    for (const item of data.routines ?? []) {
      try {
        const r = migrateRoutine(item) as RoutineLatest;
        await WorkoutService.saveRoutine(r);
        nRoutines++;
      } catch { /* skip */ }
    }
    for (const item of data.sessions ?? []) {
      try {
        const s = migrateWorkoutSession(item) as WorkoutSessionLatest;
        await WorkoutService.saveSession(s);
        nSessions++;
      } catch { /* skip */ }
    }
    for (const item of data.measurements ?? []) {
      try {
        const m = migrateMeasurement(item) as MeasurementLatest;
        await MeasurementService.save(m);
        nMeasurements++;
      } catch { /* skip */ }
    }
    for (const item of data.meals ?? []) {
      try {
        const m = migrateMealEntry(item) as MealEntryLatest;
        await MealService.save(m);
        nMeals++;
      } catch { /* skip */ }
    }
    for (const item of data.prayerLogs ?? []) {
      try {
        const p = migratePrayerLog(item) as PrayerLogLatest;
        await IslamService.savePrayerLog(p);
        nPrayers++;
      } catch { /* skip */ }
    }
    for (const item of data.journalEntries ?? []) {
      try {
        const j = migrateJournalEntry(item) as JournalEntryLatest;
        await JournalService.save(j);
        nJournal++;
      } catch { /* skip */ }
    }

    return {
      success: true,
      message: `Seed: ${nRoutines} routines, ${nSessions} sessions, ${nMeasurements} mesures, ${nMeals} repas, ${nPrayers} prières, ${nJournal} journal`,
    };
  }

  return { success: false, message: `Type inconnu: ${(payload as { type?: string }).type ?? 'undefined'}` };
}
