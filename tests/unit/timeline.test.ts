import { describe, it, expect } from 'vitest';
import {
  hhmmToMin, tsToMin,
  mapWorkout, mapMeal, mapPrayers, mapQuran, mapSleep,
  mapMeasurement, mapWeight, mapJournal, mapHabit, mapTask,
  assembleTimeline, sortTimeline,
  type TimelineSources,
} from '@/modules/planning/timeline';
import { PRAYER_NAMES, type PrayerLogLatest, type PrayerName } from '@/data/schemas/islam/prayerLog';
import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';
import type { MealEntryLatest } from '@/data/schemas/nutrition/mealEntry';
import type { QuranSessionLatest } from '@/data/schemas/islam/quranSession';
import type { SleepEntryLatest } from '@/data/schemas/sleep/sleepEntry';
import type { MeasurementLatest } from '@/data/schemas/anthropo/measurement';
import type { WeightEntryLatest } from '@/data/schemas/body/weightEntry';
import type { JournalEntryLatest } from '@/data/schemas/journal/journalEntry';
import type { HabitOccurrenceLatest } from '@/data/schemas/habits/habitOccurrence';
import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import type { ScheduledSlot } from '@/data/schemas/planning/daySchedule';

const DATE = '2026-05-10';
/** Timestamp local stable (mêmes heure/minute que ce qu'on lit). */
const at = (h: number, m: number): number => new Date(2026, 4, 10, h, m, 0, 0).getTime();

const EMPTY: TimelineSources = {
  sessions: [], meals: [], prayerLog: null, quran: [], sleep: [],
  measurement: null, weight: null, journal: [], habits: [], tasks: [], schedule: null,
};

function prayers(done: Partial<Record<PrayerName, boolean>>): Record<PrayerName, boolean> {
  return PRAYER_NAMES.reduce(
    (acc, p) => ({ ...acc, [p]: done[p] ?? false }),
    {} as Record<PrayerName, boolean>,
  );
}

// ── Helpers temps ──────────────────────────────────────────────────────────────

describe('timeline helpers', () => {
  it('hhmmToMin convertit HH:MM en minutes', () => {
    expect(hhmmToMin('00:00')).toBe(0);
    expect(hhmmToMin('07:30')).toBe(450);
    expect(hhmmToMin('23:59')).toBe(1439);
  });

  it('tsToMin lit heure locale d\'un timestamp', () => {
    expect(tsToMin(at(13, 15))).toBe(13 * 60 + 15);
    expect(tsToMin(at(0, 0))).toBe(0);
  });
});

// ── Mappers (data présente = trigger vrai) ───────────────────────────────────

describe('timeline mappers — trigger vrai', () => {
  it('mapWorkout → type sport, bloc, RPE', () => {
    const s: WorkoutSessionLatest = {
      v: 3, id: 'w1', name: 'Push A', date: DATE,
      startTime: at(18, 0), endTime: at(19, 0), duration: 3600,
      solo: true, isException: false, exercises: [],
      tonnage: 5000, durationMin: 60, rpe: 8,
    };
    const item = mapWorkout(s);
    expect(item.type).toBe('sport');
    expect(item.origin).toBe('logged');
    expect(item.startMin).toBe(18 * 60);
    expect(item.endMin).toBe(19 * 60);
    expect(item.durationMin).toBe(60);
    expect(item.subtitle).toBe('RPE 8');
    expect(item.done).toBe(true);
  });

  it('mapMeal → startMin depuis timeHHMM si présent', () => {
    const m: MealEntryLatest = {
      v: 2, id: 'm1', date: DATE, name: 'Déjeuner', kcal: 720.4,
      p: 50, c: 60, f: 20, timestamp: at(9, 0), source: 'manual', mealSlot: 2,
      timeHHMM: '12:30',
    };
    const item = mapMeal(m);
    expect(item.type).toBe('nutrition');
    expect(item.startMin).toBe(12 * 60 + 30);
    expect(item.subtitle).toBe('720 kcal');
    expect(item.endMin).toBeNull();
  });

  it('mapMeal → fallback timestamp si pas de timeHHMM', () => {
    const m: MealEntryLatest = {
      v: 2, id: 'm2', date: DATE, name: 'Collation', kcal: 200,
      p: 10, c: 20, f: 5, timestamp: at(16, 45), source: 'quick', mealSlot: 4,
    };
    expect(mapMeal(m).startMin).toBe(16 * 60 + 45);
  });

  it('mapPrayers → uniquement les prières accomplies, datées si prayerTimes', () => {
    const log: PrayerLogLatest = {
      v: 2, date: DATE, timezone: 'UTC',
      prayers: prayers({ sobh: true, dhuhr: true, asr: false }),
      prayerTimes: { sobh: '05:30' },
      savedAt: at(6, 0),
    };
    const items = mapPrayers(log);
    expect(items).toHaveLength(2); // sobh + dhuhr (asr=false exclu)
    const sobh = items.find(i => i.title === 'Sobh')!;
    const dhuhr = items.find(i => i.title === 'Dhuhr')!;
    expect(sobh.startMin).toBe(5 * 60 + 30);
    expect(dhuhr.startMin).toBeNull(); // accomplie mais sans heure saisie
    expect(items.every(i => i.type === 'islam' && i.done === true)).toBe(true);
  });

  it('mapQuran → endMin = start + durée si durationMin', () => {
    const q: QuranSessionLatest = {
      v: 1, id: 'q1', date: DATE, ayahsRead: 12,
      surahStart: 2, ayahStart: 1, durationMin: 15, timestamp: at(6, 0),
    };
    const item = mapQuran(q);
    expect(item.title).toBe('Coran — 12 ayahs');
    expect(item.startMin).toBe(6 * 60);
    expect(item.endMin).toBe(6 * 60 + 15);
  });

  it('mapSleep → bedtime/wakeTime + durée en minutes', () => {
    const e: SleepEntryLatest = {
      v: 2, id: 's1', date: DATE, timestamp: at(7, 0),
      durationH: 7.5, quality: 4, bedtime: '23:30', wakeTime: '07:00',
    };
    const item = mapSleep(e);
    expect(item.type).toBe('sommeil');
    expect(item.startMin).toBe(23 * 60 + 30);
    expect(item.endMin).toBe(7 * 60);
    expect(item.durationMin).toBe(450);
    expect(item.subtitle).toBe('Qualité 4/5');
  });

  it('mapMeasurement → MG depuis bf_pct_jp7', () => {
    const m: MeasurementLatest = {
      v: 3, date: DATE, timezone: 'UTC', savedAt: at(8, 0), bf_pct_jp7: 14.2,
    };
    const item = mapMeasurement(m);
    expect(item.type).toBe('mensuration');
    expect(item.subtitle).toBe('MG 14.2%');
    expect(item.startMin).toBe(8 * 60);
  });

  it('mapWeight → titre poids + sous-titre bpm', () => {
    const w: WeightEntryLatest = {
      v: 3, date: DATE, timezone: 'UTC', savedAt: at(7, 15), weight: 78.3, bpm_rest: 58,
    };
    const item = mapWeight(w);
    expect(item.title).toBe('Poids — 78.3 kg');
    expect(item.subtitle).toBe('58 bpm');
  });

  it('mapJournal → humeur', () => {
    const j: JournalEntryLatest = {
      v: 1, id: 'j1', date: DATE, content: 'ok', mood: 3, module: 'general',
      tags: [], timestamp: at(21, 0),
    };
    const item = mapJournal(j);
    expect(item.type).toBe('journal');
    expect(item.subtitle).toBe('Humeur 3/5');
    expect(item.startMin).toBe(21 * 60);
  });

  it('mapHabit → startMin depuis timeHHMM, endMin si durée', () => {
    const h: HabitOccurrenceLatest = {
      v: 1, id: 'h1', date: DATE, habitId: 'med', habitName: 'Méditation',
      timezone: 'UTC', timestamp: at(6, 0), timeHHMM: '06:15', durationMin: 20,
    };
    const item = mapHabit(h);
    expect(item.type).toBe('habitude');
    expect(item.title).toBe('Méditation');
    expect(item.startMin).toBe(6 * 60 + 15);
    expect(item.endMin).toBe(6 * 60 + 35);
  });

  it('mapTask → utilise le slot du scheduler si présent', () => {
    const t = baseTask({ timeHHMM: '09:00', durationMin: 30 });
    const slot: ScheduledSlot = { taskId: t.id, startMin: 600, endMin: 660 };
    const item = mapTask(t, slot);
    expect(item.type).toBe('tache');
    expect(item.origin).toBe('planned');
    expect(item.startMin).toBe(600);
    expect(item.endMin).toBe(660);
  });

  it('mapTask → fallback timeHHMM sans slot, done selon statut', () => {
    const active = mapTask(baseTask({ timeHHMM: '09:00', durationMin: 30, status: 'active' }), null);
    expect(active.startMin).toBe(540);
    expect(active.endMin).toBe(570);
    expect(active.done).toBe(false);

    const done = mapTask(baseTask({ status: 'done' }), null);
    expect(done.done).toBe(true);
  });
});

function baseTask(overrides: Partial<ScheduleTaskLatest> = {}): ScheduleTaskLatest {
  return {
    v: 4, id: 't1', date: DATE, scheduledDate: DATE, title: 'Admin',
    durationMin: 30, priority: 3, domain: 'travail', tags: [],
    dependsOn: [], status: 'active', timeCategory: null, ...overrides,
  };
}

// ── Assemblage (trigger faux + tri) ──────────────────────────────────────────

describe('assembleTimeline', () => {
  it('sources vides → liste vide (trigger faux)', () => {
    expect(assembleTimeline(EMPTY)).toEqual([]);
  });

  it('agrège tous les domaines et trie par heure, non datés en fin', () => {
    const sources: TimelineSources = {
      ...EMPTY,
      sessions: [{
        v: 3, id: 'w1', name: 'Legs', date: DATE,
        startTime: at(18, 0), endTime: at(19, 0), duration: 3600,
        solo: true, isException: false, exercises: [], tonnage: 0, durationMin: 60,
      }],
      meals: [{
        v: 2, id: 'm1', date: DATE, name: 'Petit-déj', kcal: 400,
        p: 30, c: 40, f: 10, timestamp: at(8, 0), source: 'manual', mealSlot: 1,
        timeHHMM: '08:00',
      }],
      prayerLog: {
        v: 2, date: DATE, timezone: 'UTC',
        prayers: prayers({ dhuhr: true }), // accomplie, sans heure → non datée
        savedAt: at(13, 0),
      },
    };
    const items = assembleTimeline(sources);
    expect(items).toHaveLength(3);
    // Ordre : repas 08:00 < séance 18:00 < prière (non datée → fin)
    expect(items.map(i => i.type)).toEqual(['nutrition', 'sport', 'islam']);
    expect(items[2]!.startMin).toBeNull();
  });

  it('sortTimeline est stable et pur (ne mute pas l\'entrée)', () => {
    const input = assembleTimeline({
      ...EMPTY,
      meals: [{
        v: 2, id: 'm1', date: DATE, name: 'Repas', kcal: 100, p: 1, c: 1, f: 1,
        timestamp: at(12, 0), source: 'manual', mealSlot: 2,
      }],
    });
    const copy = [...input];
    sortTimeline(input);
    expect(input).toEqual(copy); // entrée non mutée
  });
});
