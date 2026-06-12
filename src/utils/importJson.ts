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
import { migrateHabitDefinition } from '../data/schemas/habits/habitDefinition';
import { migrateHabitOccurrence } from '../data/schemas/habits/habitOccurrence';
import { migrateQuranSession } from '../data/schemas/islam/quranSession';
import { migrateQuranProgress } from '../data/schemas/islam/quranProgress';
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
import type { HabitDefinitionLatest } from '../data/schemas/habits/habitDefinition';
import type { HabitOccurrenceLatest } from '../data/schemas/habits/habitOccurrence';
import type { QuranSessionLatest } from '../data/schemas/islam/quranSession';
import type { QuranProgressLatest } from '../data/schemas/islam/quranProgress';

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
  habitDefinitions?: unknown[];
  habitOccurrences?: unknown[];
  quranSessions?: unknown[];
  quranProgress?: unknown;
}

export type ImportPayload =
  | { type: 'sport.routine'; data: unknown }
  | { type: 'sport.routines'; data: unknown[] }
  | { type: 'seed.full'; data: SeedData };

type SiloCount = { ok: number; fail: number };

/** Accepte le JSON brut (string) ou le payload déjà parsé (require Metro). */
export async function importFromJson(raw: string | object): Promise<{ success: boolean; message: string }> {
  let parsed: unknown;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); }
    catch { return { success: false, message: 'JSON invalide' }; }
  } else {
    parsed = raw;
  }

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
    const counts: Record<string, SiloCount> = {};

    const storage = await getStorage();

    await storage.transaction(async (tx) => {
      // Importe un silo : migration Zod puis écriture sous la clé construite.
      // Les rejets sont comptés (plus de skip silencieux) pour diagnostic.
      async function importSilo<T>(
        name: string,
        items: unknown[] | undefined,
        migrate: (raw: unknown) => unknown,
        keyOf: (entry: T) => string,
      ): Promise<void> {
        const c: SiloCount = { ok: 0, fail: 0 };
        counts[name] = c;
        for (const item of items ?? []) {
          try {
            const entry = migrate(item) as T;
            await tx.set(keyOf(entry), entry);
            c.ok++;
          } catch {
            c.fail++;
          }
        }
      }

      await importSilo<RoutineLatest>('routines', data.routines, migrateRoutine,
        r => `sport.routine.${r.id}`);
      // Clé alignée sur WorkoutService.save : sport.session.{date}.{id}
      await importSilo<WorkoutSessionLatest>('sessions', data.sessions, migrateWorkoutSession,
        s => `sport.session.${s.date}.${s.id}`);
      await importSilo<MeasurementLatest>('mesures', data.measurements, migrateMeasurement,
        m => `anthropo.measurement.${m.date}`);
      await importSilo<WeightEntryLatest>('poids', data.weightEntries, migrateWeightEntry,
        w => `weight.entry.${w.date}`);
      // id = dateId "{date}.{ms}" → la clé encode la date
      await importSilo<MealEntryLatest>('repas', data.meals, migrateMealEntry,
        m => `nutrition.meal.${m.id}`);
      await importSilo<PrayerLogLatest>('prières', data.prayerLogs, migratePrayerLog,
        p => `islam.prayer.${p.date}`);
      await importSilo<JournalEntryLatest>('journal', data.journalEntries, migrateJournalEntry,
        j => `journal.entry.${j.id}`);
      // id = dateId "{date}.{ms}" → la clé encode la date
      await importSilo<SleepEntryLatest>('sommeil', data.sleepEntries, migrateSleepEntry,
        s => `sleep.entry.${s.id}`);
      await importSilo<WaterIntakeLatest>('eau', data.waterIntakes, migrateWaterIntake,
        w => `nutrition.water.${w.date}`);
      // id = dateId "{date}.{ms}" (V4) → la clé encode la date
      await importSilo<ScheduleTaskLatest>('tâches', data.scheduleTasks, migrateScheduleTask,
        t => `planning.task.${t.id}`);
      await importSilo<DayScheduleLatest>('plannings', data.daySchedules, migrateDaySchedule,
        s => `planning.schedule.${s.date}`);
      await importSilo<HabitDefinitionLatest>('habitudes', data.habitDefinitions, migrateHabitDefinition,
        h => `habit.definition.${h.id}`);
      await importSilo<HabitOccurrenceLatest>('occurrences', data.habitOccurrences, migrateHabitOccurrence,
        o => `habit.occurrence.${o.id}`);
      await importSilo<QuranSessionLatest>('coran', data.quranSessions, migrateQuranSession,
        q => `islam.quran.session.${q.id}`);
      if (data.quranProgress !== undefined) {
        await importSilo<QuranProgressLatest>('coranProgress', [data.quranProgress], migrateQuranProgress,
          () => 'islam.quran.progress');
      }
    });

    const parts = Object.entries(counts).map(([name, c]) =>
      c.fail > 0 ? `${name} ${c.ok} (${c.fail} rejetés)` : `${name} ${c.ok}`);
    const totalFail = Object.values(counts).reduce((a, c) => a + c.fail, 0);

    return {
      success: true,
      message: `Seed: ${parts.join(', ')}${totalFail > 0 ? ` — ${totalFail} entrées rejetées` : ''}`,
    };
  }

  return { success: false, message: `Type inconnu: ${(payload as { type?: string }).type ?? 'undefined'}` };
}
