import { getStorage } from '@/data/storage/storageService';
import { Planner } from '@/modules/planning/api';

import { WorkoutService } from '@/services/workoutService';
import { MealService } from '@/services/mealService';
import { IslamService } from '@/services/islamService';
import { SleepService } from '@/services/sleepService';
import { MeasurementService } from '@/services/measurementService';
import { WeightService } from '@/services/weightService';
import { JournalService } from '@/services/journalService';
import { HabitOccurrenceService } from '@/services/habitOccurrenceService';

import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';
import type { MealEntryLatest } from '@/data/schemas/nutrition/mealEntry';
import { PRAYER_NAMES, type PrayerLogLatest, type PrayerName } from '@/data/schemas/islam/prayerLog';
import type { QuranSessionLatest } from '@/data/schemas/islam/quranSession';
import type { SleepEntryLatest } from '@/data/schemas/sleep/sleepEntry';
import type { MeasurementLatest } from '@/data/schemas/anthropo/measurement';
import type { WeightEntryLatest } from '@/data/schemas/body/weightEntry';
import type { JournalEntryLatest } from '@/data/schemas/journal/journalEntry';
import type { HabitOccurrenceLatest } from '@/data/schemas/habits/habitOccurrence';
import type { ScheduleTaskLatest, TimeCategory } from '@/data/schemas/planning/scheduleTask';
import type { DayScheduleLatest, ScheduledSlot } from '@/data/schemas/planning/daySchedule';
import { TASK_TYPE_META, type TaskType } from '@/data/schemas/planning/taskType';

// ─────────────────────────────────────────────────────────────────────────────
// Visionneur AWAN dans le temps.
//
// Pour une date donnée, agrège toutes les activités AWAN (lues via les requêtes
// `getByDate` de chaque domaine) en une liste unifiée et typée, placée dans le
// temps. Read-only sur les domaines : le Planning rend visible ce qui est déjà
// enregistré ; il n'écrit que ses propres tâches (type `tache`, via Planner).
// ─────────────────────────────────────────────────────────────────────────────

export interface TimelineItem {
  /** Clé unique dans la journée (préfixe type + id source). */
  id: string;
  type: TaskType;
  /** 'logged' = activité réellement enregistrée · 'planned' = tâche planifiée. */
  origin: 'logged' | 'planned';
  title: string;
  subtitle: string | null;
  /** Minutes depuis minuit (heure locale). null = non daté (marqueur sans heure). */
  startMin: number | null;
  /** Fin du bloc (minutes). null = ponctuel (pas de durée placée). */
  endMin: number | null;
  durationMin: number | null;
  /** Tâches planifiées / prières : statut de complétion. null = non applicable. */
  done: boolean | null;
  timeCategory: TimeCategory;
  /** Préfixe de clé storage source (trace). */
  sourceKey: string;
}

/** Données brutes d'une journée, déjà récupérées via les `getByDate` des domaines. */
export interface TimelineSources {
  sessions: WorkoutSessionLatest[];
  meals: MealEntryLatest[];
  prayerLog: PrayerLogLatest | null;
  quran: QuranSessionLatest[];
  sleep: SleepEntryLatest[];
  measurement: MeasurementLatest | null;
  weight: WeightEntryLatest | null;
  journal: JournalEntryLatest[];
  habits: HabitOccurrenceLatest[];
  /** Tâches actives planifiées pour la date. */
  tasks: ScheduleTaskLatest[];
  /** Résultat du scheduler (slots placés) pour la date, si calculé. */
  schedule: DayScheduleLatest | null;
}

// ── Helpers temps ──────────────────────────────────────────────────────────────

/** "HH:MM" → minutes depuis minuit. */
export function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** timestamp unix ms → minutes depuis minuit (heure locale). */
export function tsToMin(timestamp: number): number {
  const d = new Date(timestamp);
  return d.getHours() * 60 + d.getMinutes();
}

const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr_sunnah: 'Sunna Fajr',
  sobh: 'Sobh',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  witr: 'Witr',
};

function metaCat(type: TaskType): TimeCategory {
  return TASK_TYPE_META[type].timeCategory;
}

// ── Mappers (purs) ───────────────────────────────────────────────────────────

export function mapWorkout(s: WorkoutSessionLatest): TimelineItem {
  const startMin = tsToMin(s.startTime);
  const dur = s.durationMin ?? 0;
  return {
    id: `sport.${s.id}`,
    type: 'sport',
    origin: 'logged',
    title: s.name,
    subtitle: s.rpe != null ? `RPE ${s.rpe}` : null,
    startMin,
    endMin: s.endTime != null ? tsToMin(s.endTime) : startMin + dur,
    durationMin: s.durationMin ?? null,
    done: true,
    timeCategory: metaCat('sport'),
    sourceKey: 'sport.session',
  };
}

export function mapMeal(m: MealEntryLatest): TimelineItem {
  return {
    id: `nutrition.${m.id}`,
    type: 'nutrition',
    origin: 'logged',
    title: m.name,
    subtitle: `${Math.round(m.kcal)} kcal`,
    startMin: m.timeHHMM ? hhmmToMin(m.timeHHMM) : tsToMin(m.timestamp),
    endMin: null,
    durationMin: null,
    done: true,
    timeCategory: metaCat('nutrition'),
    sourceKey: 'nutrition.meal',
  };
}

export function mapPrayers(log: PrayerLogLatest): TimelineItem[] {
  const out: TimelineItem[] = [];
  for (const p of PRAYER_NAMES) {
    if (!log.prayers[p]) continue; // n'affiche que les prières accomplies
    const t = log.prayerTimes?.[p] ?? null;
    out.push({
      id: `islam.prayer.${log.date}.${p}`,
      type: 'islam',
      origin: 'logged',
      title: PRAYER_LABELS[p],
      subtitle: 'Prière',
      startMin: t ? hhmmToMin(t) : null,
      endMin: null,
      durationMin: null,
      done: true,
      timeCategory: metaCat('islam'),
      sourceKey: 'islam.prayer',
    });
  }
  return out;
}

export function mapQuran(q: QuranSessionLatest): TimelineItem {
  const startMin = tsToMin(q.timestamp);
  const durationMin = q.durationMin ?? null;
  return {
    id: `islam.quran.${q.id}`,
    type: 'islam',
    origin: 'logged',
    title: `Coran — ${q.ayahsRead} ayahs`,
    subtitle: null,
    startMin,
    endMin: durationMin != null ? startMin + durationMin : null,
    durationMin,
    done: true,
    timeCategory: metaCat('islam'),
    sourceKey: 'islam.quran.session',
  };
}

export function mapSleep(e: SleepEntryLatest): TimelineItem {
  return {
    id: `sommeil.${e.id}`,
    type: 'sommeil',
    origin: 'logged',
    title: `Sommeil — ${e.durationH} h`,
    subtitle: `Qualité ${e.quality}/5`,
    startMin: e.bedtime ? hhmmToMin(e.bedtime) : null,
    endMin: e.wakeTime ? hhmmToMin(e.wakeTime) : null,
    durationMin: Math.round(e.durationH * 60),
    done: true,
    timeCategory: metaCat('sommeil'),
    sourceKey: 'sleep.entry',
  };
}

export function mapMeasurement(m: MeasurementLatest): TimelineItem {
  const bf = m.bf_pct_jp7 ?? m.body_fat_pct;
  return {
    id: `mensuration.measure.${m.date}`,
    type: 'mensuration',
    origin: 'logged',
    title: 'Mensuration',
    subtitle: bf != null ? `MG ${bf}%` : null,
    startMin: tsToMin(m.savedAt),
    endMin: null,
    durationMin: null,
    done: true,
    timeCategory: metaCat('mensuration'),
    sourceKey: 'anthropo.measurement',
  };
}

export function mapWeight(w: WeightEntryLatest): TimelineItem {
  return {
    id: `mensuration.weight.${w.date}`,
    type: 'mensuration',
    origin: 'logged',
    title: w.weight != null ? `Poids — ${w.weight} kg` : 'BPM repos',
    subtitle: w.bpm_rest != null ? `${w.bpm_rest} bpm` : null,
    startMin: tsToMin(w.savedAt),
    endMin: null,
    durationMin: null,
    done: true,
    timeCategory: metaCat('mensuration'),
    sourceKey: 'weight.entry',
  };
}

export function mapJournal(j: JournalEntryLatest): TimelineItem {
  return {
    id: `journal.${j.id}`,
    type: 'journal',
    origin: 'logged',
    title: 'Journal',
    subtitle: `Humeur ${j.mood}/5`,
    startMin: tsToMin(j.timestamp),
    endMin: null,
    durationMin: null,
    done: true,
    timeCategory: metaCat('journal'),
    sourceKey: 'journal.entry',
  };
}

export function mapHabit(h: HabitOccurrenceLatest): TimelineItem {
  const startMin = h.timeHHMM ? hhmmToMin(h.timeHHMM) : tsToMin(h.timestamp);
  const durationMin = h.durationMin ?? null;
  return {
    id: `habitude.${h.id}`,
    type: 'habitude',
    origin: 'logged',
    title: h.habitName,
    subtitle: null,
    startMin,
    endMin: durationMin != null ? startMin + durationMin : null,
    durationMin,
    done: true,
    timeCategory: metaCat('habitude'),
    sourceKey: 'habit.occurrence',
  };
}

export function mapTask(t: ScheduleTaskLatest, slot: ScheduledSlot | null): TimelineItem {
  const startMin = slot ? slot.startMin : (t.timeHHMM ? hhmmToMin(t.timeHHMM) : null);
  const endMin = slot ? slot.endMin : (startMin != null ? startMin + t.durationMin : null);
  return {
    id: `tache.${t.id}`,
    type: 'tache',
    origin: 'planned',
    title: t.title,
    subtitle: t.domain,
    startMin,
    endMin,
    durationMin: t.durationMin,
    done: t.status === 'done',
    timeCategory: t.timeCategory ?? null,
    sourceKey: 'planning.task',
  };
}

// ── Assemblage (pur) ─────────────────────────────────────────────────────────

/** Trie par heure de début (non datés en fin), puis par titre. */
export function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    const am = a.startMin ?? Number.POSITIVE_INFINITY;
    const bm = b.startMin ?? Number.POSITIVE_INFINITY;
    if (am !== bm) return am - bm;
    return a.title.localeCompare(b.title);
  });
}

/** Construit la timeline triée d'une journée à partir des données déjà récupérées. */
export function assembleTimeline(sources: TimelineSources): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const s of sources.sessions) items.push(mapWorkout(s));
  for (const m of sources.meals) items.push(mapMeal(m));
  if (sources.prayerLog) items.push(...mapPrayers(sources.prayerLog));
  for (const q of sources.quran) items.push(mapQuran(q));
  for (const e of sources.sleep) items.push(mapSleep(e));
  if (sources.measurement) items.push(mapMeasurement(sources.measurement));
  if (sources.weight) items.push(mapWeight(sources.weight));
  for (const j of sources.journal) items.push(mapJournal(j));
  for (const h of sources.habits) items.push(mapHabit(h));
  for (const t of sources.tasks) {
    const slot = sources.schedule?.slots.find(sl => sl.taskId === t.id) ?? null;
    items.push(mapTask(t, slot));
  }

  return sortTimeline(items);
}

// ── Service (I/O) ────────────────────────────────────────────────────────────

export const TimelineService = {
  /** Agrège toutes les activités AWAN d'une date via les requêtes getByDate. */
  async getByDate(date: string): Promise<TimelineItem[]> {
    const storage = await getStorage();
    const planner = new Planner(storage);

    const [
      sessions, meals, prayerLog, quran, sleep,
      measurement, weight, journal, habits, activeTasks, schedule,
    ] = await Promise.all([
      WorkoutService.getSessionsByDate(date),
      MealService.getByDate(date),
      IslamService.getPrayerLog(date),
      IslamService.getQuranSessionsByDate(date),
      SleepService.getByDate(date),
      MeasurementService.getByDate(date),
      WeightService.getByDate(date),
      JournalService.getByDate(date),
      HabitOccurrenceService.getByDate(date),
      planner.getActiveTasks(),
      planner.getSchedule(date),
    ]);

    const tasks = activeTasks.filter(t => t.scheduledDate === date);
    return assembleTimeline({
      sessions, meals, prayerLog, quran, sleep,
      measurement, weight, journal, habits, tasks, schedule,
    });
  },
};
