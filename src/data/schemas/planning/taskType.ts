import { z } from 'zod';
import type { TimeCategory } from './scheduleTask';

// ─────────────────────────────────────────────────────────────────────────────
// Taxonomie canonique des « types de tâches » du visionneur Planning.
//
// Chaque type correspond à un domaine AWAN déjà tracké (« compter chaque jour »).
// Le Planning agrège, pour une date donnée, toutes les activités de ces domaines
// via leurs requêtes `getByDate` — il n'invente aucune donnée, il les rend
// visibles dans le temps.
//
//   sport        → WorkoutService.getSessionsByDate   (séance)
//   nutrition    → MealService.getByDate              (repas)
//   islam        → IslamService.getPrayerLog + getQuranSessionsByDate (prière/coran)
//   sommeil      → SleepService.getByDate             (nuit)
//   mensuration  → MeasurementService + WeightService (corps)
//   journal      → JournalService.getByDate           (humeur)
//   habitude     → HabitOccurrenceService.getByDate   (routine)
//   tache        → Planner (ScheduleTask)             (tâche planifiée manuelle)
// ─────────────────────────────────────────────────────────────────────────────

export const TASK_TYPES = [
  'sport',
  'nutrition',
  'islam',
  'sommeil',
  'mensuration',
  'journal',
  'habitude',
  'tache',
] as const;

export const TaskTypeSchema = z.enum(TASK_TYPES);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export interface TaskTypeMeta {
  /** Libellé du type (legende / filtre). */
  label: string;
  /** Catégorie temporelle naturelle du domaine (comptabilité T_friction/slack/…).
   *  null = dimension orthogonale (ex. axiologique pour islam) ou variable. */
  timeCategory: TimeCategory;
}

export const TASK_TYPE_META: Record<TaskType, TaskTypeMeta> = {
  sport:       { label: 'Sport',       timeCategory: 'somatique' },
  nutrition:   { label: 'Nutrition',   timeCategory: 'somatique' },
  islam:       { label: 'Islam',       timeCategory: null },
  sommeil:     { label: 'Sommeil',     timeCategory: 'somatique' },
  mensuration: { label: 'Mensuration', timeCategory: 'friction' },
  journal:     { label: 'Journal',     timeCategory: 'slack' },
  habitude:    { label: 'Habitude',    timeCategory: null },
  tache:       { label: 'Tâche',       timeCategory: null },
};
