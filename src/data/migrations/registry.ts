import { migrateWorkoutLog } from '../schemas/sport/workoutLog';
import { migrateRoutine, migrateWorkoutSession } from '../schemas/sport/routine';
import { migrateMealEntry } from '../schemas/nutrition/mealEntry';
import { migrateMeasurement } from '../schemas/anthropo/measurement';
import { migratePrayerLog } from '../schemas/islam/prayerLog';
import { migrateQuranProgress } from '../schemas/islam/quranProgress';
import { migrateJournalEntry } from '../schemas/journal/journalEntry';
import { migrateRule } from '../schemas/coach/rule';
import { migrateAssessment } from '../schemas/coach/assessment';
import { migrateScheduleTask } from '../schemas/planning/scheduleTask';
import { migrateDaySchedule } from '../schemas/planning/daySchedule';
import { migrateActivityRecord } from '../schemas/activity/activityRecord';
import { migrateDailySummary } from '../schemas/activity/dailySummary';
import { migrateSleepEntry } from '../schemas/sleep/sleepEntry';
import { migrateAnthropoGoals } from '../schemas/anthropo/anthropoGoals';
import { migrateOneRepMax } from '../schemas/sport/oneRepMax';

/**
 * Central registry mapping storage keys (or domain identifiers) to their
 * versioned migrator functions. Each migrator accepts raw unknown data and
 * returns the latest typed version, running all intermediate migration steps.
 */
export const migrators = {
  'sport.workoutLog': migrateWorkoutLog,
  'sport.routine': migrateRoutine,
  'sport.session': migrateWorkoutSession,
  'nutrition.meal': migrateMealEntry,
  'anthropo.measurement': migrateMeasurement,
  'islam.prayer': migratePrayerLog,
  'islam.quran': migrateQuranProgress,
  'journal.entry': migrateJournalEntry,
  'coach.rule': migrateRule,
  'coach.assessment': migrateAssessment,
  'planning.task': migrateScheduleTask,
  'planning.schedule': migrateDaySchedule,
  'activity.record': migrateActivityRecord,
  'activity.summary': migrateDailySummary,
  'sleep.entry': migrateSleepEntry,
  'anthropo.goals': migrateAnthropoGoals,
  'sport.oneRepMax': migrateOneRepMax,
} as const;

export type MigratorKey = keyof typeof migrators;
