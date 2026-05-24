/**
 * AWAN — Generate full realistic seed.
 *
 * Past biometric window : 2025-11-25 → 2026-05-24 (181 days)
 * Future planning window: 2026-05-24 → 2026-08-21 (90 days)
 *
 * Outputs /public/data/seed-demo.json with payload { type:'seed.full', data:{...} }.
 * Validates every entry via its migrator → 0 fail required.
 */

import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { migrateRoutine, migrateWorkoutSession } from '../src/data/schemas/sport/routine';
import { migrateMeasurement } from '../src/data/schemas/anthropo/measurement';
import { migrateMealEntry } from '../src/data/schemas/nutrition/mealEntry';
import { migratePrayerLog, PRAYER_NAMES, type PrayerName } from '../src/data/schemas/islam/prayerLog';
import { migrateJournalEntry } from '../src/data/schemas/journal/journalEntry';
import { migrateSleepEntry } from '../src/data/schemas/sleep/sleepEntry';
import { migrateWaterIntake } from '../src/data/schemas/nutrition/waterIntake';
import { migrateScheduleTask } from '../src/data/schemas/planning/scheduleTask';
import { migrateDaySchedule } from '../src/data/schemas/planning/daySchedule';

// ─── Constantes temporelles ────────────────────────────────────────────────
const TODAY = '2026-05-24';
const PAST_START = '2025-11-25';
const FUTURE_END = '2026-08-21';

// PRNG seedé pour résultats reproductibles
let _rngSeed = 0x9e3779b9;
function rng(): number {
  _rngSeed |= 0;
  _rngSeed = (_rngSeed + 0x6d2b79f5) | 0;
  let t = _rngSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rngBetween(min: number, max: number): number {
  return min + rng() * (max - min);
}
function rngInt(min: number, max: number): number {
  return Math.floor(rngBetween(min, max + 1));
}
function rngPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

// Bell-curve via central limit
function gaussian(mean: number, stdev: number): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rng();
  return mean + ((s - 3) / 3) * stdev;
}

// ─── Date helpers ───────────────────────────────────────────────────────────
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}
function tsAtLocal(date: string, hhmm: string): number {
  // Treat dates as local Paris (~UTC+1/+2). For ms precision we just need consistency.
  const [h, m] = hhmm.split(':').map(Number);
  const [Y, M, D] = date.split('-').map(Number);
  return Date.UTC(Y!, M! - 1, D!, h! - 1, m!); // approx Paris timezone
}
function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}
function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = parseDate(start);
  const stop = parseDate(end);
  while (cur.getTime() <= stop.getTime()) {
    out.push(toISODate(cur));
    cur = addDays(cur, 1);
  }
  return out;
}
function dayOfWeek(date: string): number {
  // 0=Sunday … 6=Saturday (JS)
  return parseDate(date).getUTCDay();
}

// ─── Heures de prière Paris (approximations annuelles) ──────────────────────
// Approximation simple en interpolant fajr/maghrib selon jour de l'année
function prayerTimesFor(date: string): Record<PrayerName, string> {
  const d = parseDate(date);
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 1);
  const doy = Math.floor((d.getTime() - startOfYear) / 86400000);
  // Position autour du solstice d'été (jour 172)
  const phase = Math.cos(((doy - 172) / 365) * 2 * Math.PI); // 1=hiver, -1=été
  // sobh (fajr) varie de 4:00 (été) → 6:45 (hiver)
  const sobhMin = 5 * 60 + 20 + phase * 85; // ~4:00 été à ~6:45 hiver
  const maghribMin = 19 * 60 + 30 - phase * 110; // ~21:20 été à ~17:40 hiver
  const dhuhrMin = 13 * 60 + 30; // ~constant
  const asrMin = 16 * 60 + 30 - phase * 60;
  const ishaMin = maghribMin + 80;
  const fajrSunnahMin = sobhMin - 10;
  const witrMin = ishaMin + 30;
  const fmt = (m: number) => {
    const mm = Math.max(0, Math.min(23 * 60 + 59, Math.round(m)));
    const H = Math.floor(mm / 60);
    const M = mm % 60;
    return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
  };
  return {
    fajr_sunnah: fmt(fajrSunnahMin),
    sobh: fmt(sobhMin),
    dhuhr: fmt(dhuhrMin),
    asr: fmt(asrMin),
    maghrib: fmt(maghribMin),
    isha: fmt(ishaMin),
    witr: fmt(witrMin),
  };
}

// ─── Foods (échantillon depuis foods.json) ─────────────────────────────────
const foodsRaw = JSON.parse(
  readFileSync(path.join(process.cwd(), 'public/data/foods.json'), 'utf8'),
) as Array<{ id: string; n: string; kcal: number; p: number; c: number; f: number }>;
const foodById = new Map(foodsRaw.map(f => [f.id, f]));

// Sélection thématique par usage repas (par ID stables)
function pickFood(category: 'protein' | 'carb' | 'fat' | 'veg' | 'dairy' | 'fruit' | 'snack'): {
  id: string; n: string; kcal: number; p: number; c: number; f: number;
} {
  const buckets: Record<string, string[]> = {
    protein: ['f001', 'f002', 'f004', 'f008', 'f010', 'f012', 'f013'],
    carb:    ['f061', 'f062', 'f063', 'f064', 'f065', 'f066', 'f067', 'f068', 'f069', 'f070'],
    fat:     ['f111', 'f112', 'f113', 'f114', 'f115'],
    veg:     ['f081', 'f082', 'f083', 'f084', 'f085', 'f086', 'f087', 'f088'],
    dairy:   ['f041', 'f042', 'f043', 'f044', 'f045', 'f046'],
    fruit:   ['f101', 'f102', 'f103', 'f104', 'f105', 'f106', 'f107'],
    snack:   ['f121', 'f122', 'f123', 'f124', 'f125'],
  };
  const ids = buckets[category]!;
  // Fall back to existing IDs only
  const existingIds = ids.filter(id => foodById.has(id));
  const pool = existingIds.length > 0 ? existingIds : Array.from(foodById.keys()).slice(0, 20);
  const id = rngPick(pool);
  return foodById.get(id)!;
}

// ─── Routines ──────────────────────────────────────────────────────────────
// Exercise IDs (free-exercise-db catalog references). Names are generic FR.
type ExoTpl = { exerciseId: string; name: string; primaryMuscle: string; sets: number; reps: number; weight: number; rest: number };
const PUSH_EXOS: ExoTpl[] = [
  { exerciseId: 'ex_bench_barbell', name: 'Développé couché', primaryMuscle: 'chest', sets: 4, reps: 8, weight: 80, rest: 120 },
  { exerciseId: 'ex_overhead_press', name: 'Développé militaire', primaryMuscle: 'shoulders', sets: 4, reps: 8, weight: 50, rest: 120 },
  { exerciseId: 'ex_incline_db', name: 'Développé incliné haltères', primaryMuscle: 'chest', sets: 3, reps: 10, weight: 28, rest: 90 },
  { exerciseId: 'ex_lateral_raise', name: 'Élévations latérales', primaryMuscle: 'shoulders', sets: 3, reps: 12, weight: 10, rest: 60 },
  { exerciseId: 'ex_triceps_pushdown', name: 'Triceps poulie', primaryMuscle: 'triceps', sets: 3, reps: 12, weight: 30, rest: 60 },
  { exerciseId: 'ex_dips', name: 'Dips lestés', primaryMuscle: 'triceps', sets: 3, reps: 8, weight: 10, rest: 90 },
];
const PULL_EXOS: ExoTpl[] = [
  { exerciseId: 'ex_deadlift', name: 'Soulevé de terre', primaryMuscle: 'lower_back', sets: 4, reps: 5, weight: 120, rest: 180 },
  { exerciseId: 'ex_pullup', name: 'Tractions', primaryMuscle: 'lats', sets: 4, reps: 8, weight: 0, rest: 120 },
  { exerciseId: 'ex_barbell_row', name: 'Rowing barre', primaryMuscle: 'middle_back', sets: 4, reps: 8, weight: 70, rest: 120 },
  { exerciseId: 'ex_lat_pulldown', name: 'Tirage vertical', primaryMuscle: 'lats', sets: 3, reps: 10, weight: 60, rest: 90 },
  { exerciseId: 'ex_face_pull', name: 'Face pull', primaryMuscle: 'shoulders', sets: 3, reps: 15, weight: 20, rest: 60 },
  { exerciseId: 'ex_curl_barbell', name: 'Curl barre', primaryMuscle: 'biceps', sets: 3, reps: 10, weight: 30, rest: 60 },
];
const LEGS_EXOS: ExoTpl[] = [
  { exerciseId: 'ex_squat', name: 'Squat barre', primaryMuscle: 'quadriceps', sets: 4, reps: 6, weight: 100, rest: 180 },
  { exerciseId: 'ex_rdl', name: 'Soulevé de terre roumain', primaryMuscle: 'hamstrings', sets: 4, reps: 8, weight: 80, rest: 120 },
  { exerciseId: 'ex_leg_press', name: 'Presse à cuisses', primaryMuscle: 'quadriceps', sets: 3, reps: 10, weight: 180, rest: 120 },
  { exerciseId: 'ex_leg_curl', name: 'Leg curl allongé', primaryMuscle: 'hamstrings', sets: 3, reps: 12, weight: 45, rest: 90 },
  { exerciseId: 'ex_walking_lunge', name: 'Fentes marchées', primaryMuscle: 'glutes', sets: 3, reps: 12, weight: 20, rest: 90 },
  { exerciseId: 'ex_calf_raise', name: 'Mollets debout', primaryMuscle: 'calves', sets: 4, reps: 15, weight: 80, rest: 60 },
];
const FULL_EXOS: ExoTpl[] = [
  { exerciseId: 'ex_goblet_squat', name: 'Goblet squat', primaryMuscle: 'quadriceps', sets: 3, reps: 12, weight: 24, rest: 60 },
  { exerciseId: 'ex_pushup', name: 'Pompes', primaryMuscle: 'chest', sets: 3, reps: 15, weight: 0, rest: 60 },
  { exerciseId: 'ex_inverted_row', name: 'Tirage horizontal', primaryMuscle: 'middle_back', sets: 3, reps: 12, weight: 0, rest: 60 },
  { exerciseId: 'ex_plank', name: 'Planche', primaryMuscle: 'abdominals', sets: 3, reps: 60, weight: 0, rest: 45 },
  { exerciseId: 'ex_kb_swing', name: 'Kettlebell swing', primaryMuscle: 'glutes', sets: 4, reps: 15, weight: 24, rest: 60 },
];

type RoutineSeed = { name: string; cycleLetter: 'A' | 'B' | 'C' | 'D'; days: number[]; exos: ExoTpl[] };
const ROUTINES: RoutineSeed[] = [
  { name: 'PUSH — Pecs/Épaules/Triceps', cycleLetter: 'A', days: [1, 4], exos: PUSH_EXOS },
  { name: 'PULL — Dos/Biceps',           cycleLetter: 'B', days: [2, 5], exos: PULL_EXOS },
  { name: 'LEGS — Quadri/Ischio/Mollets', cycleLetter: 'C', days: [3],    exos: LEGS_EXOS },
  { name: 'FULL — Corps entier récup',    cycleLetter: 'D', days: [6],    exos: FULL_EXOS },
];

// ─── Génération ──────────────────────────────────────────────────────────────
const out = {
  routines: [] as unknown[],
  sessions: [] as unknown[],
  measurements: [] as unknown[],
  meals: [] as unknown[],
  prayerLogs: [] as unknown[],
  journalEntries: [] as unknown[],
  sleepEntries: [] as unknown[],
  waterIntakes: [] as unknown[],
  scheduleTasks: [] as unknown[],
  daySchedules: [] as unknown[],
};

// 1. ROUTINES
type RoutineRuntime = { id: string; routine: RoutineSeed };
const routineRuntimes: RoutineRuntime[] = ROUTINES.map(r => {
  const id = randomUUID();
  const routine = {
    v: 1 as const,
    id,
    name: r.name,
    cycleLetter: r.cycleLetter,
    assignedDays: r.days,
    exercises: r.exos.map((e, i) => ({
      rid: randomUUID(),
      exerciseId: e.exerciseId,
      name: e.name,
      primaryMuscle: e.primaryMuscle,
      plannedSets: e.sets,
      plannedReps: e.reps,
      plannedWeightKg: e.weight,
      restSec: e.rest,
      order: i,
    })),
    defaultRestSec: 90,
    createdAt: tsAtLocal(PAST_START, '08:00'),
    source: 'user' as const,
  };
  out.routines.push(routine);
  return { id, routine: r };
});

const routineByDay = new Map<number, RoutineRuntime>();
for (const rt of routineRuntimes) {
  for (const d of rt.routine.days) routineByDay.set(d, rt);
}

// 2. SESSIONS sport (passé uniquement, jusqu'à TODAY)
const pastDays = eachDay(PAST_START, TODAY);
const totalWeeks = pastDays.length / 7;
for (const date of pastDays) {
  const dow = dayOfWeek(date);
  // JS: Sun=0 Mon=1 … But routines use 1..6 with 6=Saturday.
  // Convert: dow JS → dow routine (Mon=1 … Sun=0).
  // Routines assigned days use [1..6] meaning Mon..Sat.
  const routine = routineByDay.get(dow);
  if (!routine) continue; // dimanche off (dow=0)

  // 1 chance sur 14 de skip (vie réelle, maladie/voyage)
  if (rng() < 0.07) continue;

  const dayIndex = diffDays(PAST_START, date);
  const progressFactor = 1 + 0.05 * (dayIndex / pastDays.length); // +5% sur la période

  const startHHMM = dow === 6 ? '10:00' : '18:30';
  const endHHMM = dow === 6 ? '11:30' : '19:55';
  const startTs = tsAtLocal(date, startHHMM);
  const endTs = tsAtLocal(date, endHHMM);

  const exercises = routine.routine.exos.map((e, i) => {
    const plannedW = e.weight * progressFactor;
    const sets = [] as unknown[];
    for (let s = 0; s < e.sets; s++) {
      const wVar = gaussian(0, 0.5);
      const repsVar = rngInt(-1, 1);
      sets.push({
        v: 2 as const,
        exerciseId: e.exerciseId,
        kind: 'working',
        reps: Math.max(1, e.reps + repsVar),
        weightKg: e.weight === 0 ? 0 : Math.round((plannedW + wVar) * 2) / 2,
        rir: rngInt(1, 3),
        rpe: rngInt(7, 9),
        restActualSec: e.rest + rngInt(-15, 30),
        completedAt: startTs + (i * e.sets + s) * 90 * 1000,
        plannedWeightKg: e.weight === 0 ? 0 : Math.round(plannedW * 2) / 2,
        plannedReps: e.reps,
      });
    }
    return {
      rid: randomUUID(),
      exerciseId: e.exerciseId,
      name: e.name,
      primaryMuscle: e.primaryMuscle,
      order: i,
      sets,
    };
  });

  out.sessions.push({
    v: 2 as const,
    id: randomUUID(),
    routineId: routine.id,
    name: routine.routine.name,
    cycleLetter: routine.routine.cycleLetter,
    date,
    startTime: startTs,
    endTime: endTs,
    duration: Math.round((endTs - startTs) / 1000),
    warmupStartedAt: startTs,
    workoutEndedAt: endTs - 5 * 60 * 1000,
    solo: rng() < 0.85,
    feeling: rngInt(3, 5),
    sessionRPE: rngInt(6, 9),
    recoveryScore: rngInt(5, 9),
    isException: false,
    exercises,
    scoreSeance: rngInt(60, 95),
    exitedAt: endTs,
    adherence: 0.85 + rng() * 0.15,
  });
}

void totalWeeks;

// 3. MEASUREMENTS — tous les 14j, plis cutanés tous les 60j
const baseWeight = 78;
for (let i = 0; i < pastDays.length; i += 14) {
  const date = pastDays[i]!;
  const t = i / pastDays.length;
  const weight = baseWeight - t * 2.5 + gaussian(0, 0.4); // -2.5kg sur 6 mois
  const bodyFat = 16 - t * 1.8 + gaussian(0, 0.3);
  const includeSkinfolds = i % 60 < 14; // ~3 mesures ISAK
  const measurements: Record<string, number> = {
    waist: 82 - t * 2 + gaussian(0, 0.5),
    hip: 98 - t * 0.8 + gaussian(0, 0.4),
    chest: 102 + t * 0.5 + gaussian(0, 0.3),
    arm_relaxed: 36 + t * 0.5 + gaussian(0, 0.2),
    arm_flexed: 38.5 + t * 0.6 + gaussian(0, 0.2),
    thigh: 58 + t * 0.4 + gaussian(0, 0.3),
    calf: 38 + gaussian(0, 0.2),
    neck: 38 + gaussian(0, 0.2),
    height: 178,
  };
  const skinfolds: Record<string, number> = includeSkinfolds ? {
    triceps: 9 - t * 1 + gaussian(0, 0.3),
    biceps: 4 + gaussian(0, 0.2),
    subscapular: 11 - t * 0.5 + gaussian(0, 0.3),
    suprailiac: 13 - t * 1.5 + gaussian(0, 0.3),
    abdominal: 18 - t * 2 + gaussian(0, 0.4),
    thigh: 11 - t * 0.8 + gaussian(0, 0.3),
    calf: 7 + gaussian(0, 0.2),
  } : {};
  out.measurements.push({
    v: 1 as const,
    id: randomUUID(),
    date,
    weight: Math.round(weight * 10) / 10,
    bpm_rest: rngInt(54, 62),
    body_fat_pct: Math.round(bodyFat * 10) / 10,
    measurements: Object.fromEntries(Object.entries(measurements).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    skinfolds: Object.fromEntries(Object.entries(skinfolds).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    savedAt: tsAtLocal(date, '07:30'),
    whtr: Math.round((measurements.waist! / measurements.height!) * 1000) / 1000,
    whr: Math.round((measurements.waist! / measurements.hip!) * 1000) / 1000,
  });
}

// 4. MEALS — 5 par jour
const mealSlots: Array<{ slot: number; label: string; time: string; foods: Array<'protein'|'carb'|'fat'|'veg'|'dairy'|'fruit'|'snack'> }> = [
  { slot: 1, label: 'Petit-déj', time: '07:30', foods: ['dairy', 'fruit', 'carb'] },
  { slot: 2, label: 'Collation pré-séance', time: '17:30', foods: ['fruit', 'snack'] },
  { slot: 3, label: 'Déjeuner', time: '13:00', foods: ['protein', 'carb', 'veg'] },
  { slot: 4, label: 'Goûter', time: '20:30', foods: ['dairy', 'snack'] },
  { slot: 5, label: 'Dîner', time: '21:30', foods: ['protein', 'carb', 'veg', 'fat'] },
];

for (const date of pastDays) {
  for (const slot of mealSlots) {
    const items = slot.foods.map(cat => {
      const food = pickFood(cat);
      const grams = rngInt(80, 220);
      const ratio = grams / 100;
      return {
        foodId: food.id,
        grams,
        name: food.n,
        kcal: Math.round(food.kcal * ratio),
        p: Math.round(food.p * ratio * 10) / 10,
        c: Math.round(food.c * ratio * 10) / 10,
        f: Math.round(food.f * ratio * 10) / 10,
      };
    });
    const totals = items.reduce(
      (acc, it) => ({ kcal: acc.kcal + it.kcal, p: acc.p + it.p, c: acc.c + it.c, f: acc.f + it.f }),
      { kcal: 0, p: 0, c: 0, f: 0 },
    );
    out.meals.push({
      v: 2 as const,
      id: randomUUID(),
      date,
      name: slot.label,
      kcal: Math.round(totals.kcal),
      p: Math.round(totals.p * 10) / 10,
      c: Math.round(totals.c * 10) / 10,
      f: Math.round(totals.f * 10) / 10,
      timestamp: tsAtLocal(date, slot.time),
      source: 'db' as const,
      timeHHMM: slot.time,
      mealSlot: slot.slot,
      mealLabel: slot.label,
      items,
      nutritionScore: rngInt(55, 90),
    });
  }
}

// 5. PRAYER LOGS — 1 par jour, 5-7 prières validées
for (const date of pastDays) {
  const times = prayerTimesFor(date);
  // Obligatoires presque toujours validées
  const prayers: Record<PrayerName, boolean> = {
    fajr_sunnah: rng() < 0.7,
    sobh:        rng() < 0.92,
    dhuhr:       rng() < 0.9,
    asr:         rng() < 0.88,
    maghrib:     rng() < 0.95,
    isha:        rng() < 0.9,
    witr:        rng() < 0.55,
  };
  const prayerTimes: Record<PrayerName, string | null> = { ...times } as Record<PrayerName, string | null>;
  // null si non validé
  for (const name of PRAYER_NAMES) {
    if (!prayers[name]) prayerTimes[name] = null;
  }
  out.prayerLogs.push({
    v: 2 as const,
    id: randomUUID(),
    date,
    prayers,
    prayerTimes,
    savedAt: tsAtLocal(date, '22:00'),
  });
}

// 6. SLEEP — 1 par jour
for (const date of pastDays) {
  const durationH = Math.max(5, Math.min(9.5, gaussian(7.3, 0.7)));
  const quality = Math.max(3, Math.min(5, Math.round(gaussian(4, 0.7))));
  const bedH = rngInt(22, 23);
  const bedM = rngInt(0, 59);
  const wakeMin = bedH * 60 + bedM + Math.round(durationH * 60);
  const wakeH = Math.floor((wakeMin / 60) % 24);
  const wakeM = wakeMin % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  out.sleepEntries.push({
    v: 1 as const,
    id: randomUUID(),
    date,
    timestamp: tsAtLocal(date, '07:30'),
    durationH: Math.round(durationH * 10) / 10,
    quality,
    bedtime: `${pad(bedH)}:${pad(bedM)}`,
    wakeTime: `${pad(wakeH)}:${pad(wakeM)}`,
  });
}

// 7. WATER — 1 par jour
for (const date of pastDays) {
  const targetMl = rngInt(2000, 3200);
  const entries: Array<{ timeHHMM: string; ml: number }> = [];
  const times = ['07:30', '10:00', '12:30', '15:00', '17:30', '20:00', '22:00'];
  let remaining = targetMl;
  for (let i = 0; i < times.length; i++) {
    const isLast = i === times.length - 1;
    const ml = isLast ? remaining : Math.round(targetMl / times.length + rngInt(-50, 100));
    remaining -= ml;
    entries.push({ timeHHMM: times[i]!, ml: Math.max(100, ml) });
  }
  const total = entries.reduce((a, e) => a + e.ml, 0);
  out.waterIntakes.push({
    v: 1 as const,
    id: randomUUID(),
    date,
    totalMl: total,
    entries,
    updatedAt: tsAtLocal(date, '22:30'),
  });
}

// 8. JOURNAL — passé uniquement, ~1 toutes les 2-3j
const JOURNAL_MOODS = [
  { mood: 5, content: "Séance excellente, je sens les progrès, alhamdulillah.", module: 'sport', tags: ['progrès', 'motivation'] },
  { mood: 4, content: "Bonne journée. Prières en temps, repas équilibré.", module: 'spirituel', tags: ['gratitude', 'discipline'] },
  { mood: 4, content: "PR sur le squat aujourd'hui, +5kg ! Le travail paie.", module: 'sport', tags: ['PR', 'progrès'] },
  { mood: 3, content: "Fatigue post-séance, sommeil court hier. Besoin de récupération.", module: 'sommeil', tags: ['fatigue'] },
  { mood: 3, content: "Journée chargée au boulot, dur de tenir le planning nutrition.", module: 'planning', tags: ['stress'] },
  { mood: 5, content: "Réveil pour Sobh apaisé, journée bien commencée.", module: 'spirituel', tags: ['fajr', 'gratitude'] },
  { mood: 4, content: "Meal prep dimanche matin, semaine alignée.", module: 'nutrition', tags: ['mealprep', 'planning'] },
  { mood: 3, content: "Petit coup de mou, je remonte demain incha'Allah.", module: 'mental', tags: ['résilience'] },
  { mood: 5, content: "Famille réunie ce soir, moments précieux.", module: 'mental', tags: ['gratitude', 'famille'] },
  { mood: 4, content: "Mesures bimensuelles : -0,6kg, bonne tendance.", module: 'anthropo', tags: ['mesures', 'progrès'] },
];
for (let i = 0; i < pastDays.length; i += rngInt(2, 3)) {
  const date = pastDays[i]!;
  const tpl = rngPick(JOURNAL_MOODS);
  out.journalEntries.push({
    v: 1 as const,
    id: randomUUID(),
    date,
    content: tpl.content,
    mood: tpl.mood,
    module: tpl.module,
    tags: tpl.tags,
    timestamp: tsAtLocal(date, '21:45'),
  });
}

// 9. SCHEDULE TASKS — ~18 templates
type TaskTpl = {
  title: string;
  durationMin: number;
  priority: number;
  domain: 'sport' | 'nutrition' | 'anthropo' | 'sleep' | 'islam' | 'planning' | 'mental' | 'general';
  tags: string[];
  fixedStartMin?: number; // 0..1439
};
const TASK_TPLS: TaskTpl[] = [
  { title: 'Sobh (Fard)',             durationMin: 15, priority: 5, domain: 'islam', tags: ['prière'], fixedStartMin: 5 * 60 + 30 },
  { title: 'Fajr Sunnah',              durationMin: 5,  priority: 4, domain: 'islam', tags: ['sunnah'] },
  { title: 'Petit-déj',                durationMin: 20, priority: 4, domain: 'nutrition', tags: ['repas'], fixedStartMin: 7 * 60 + 30 },
  { title: 'Trajet bureau',            durationMin: 35, priority: 3, domain: 'planning', tags: ['trajet'] },
  { title: 'Travail matin',            durationMin: 210, priority: 5, domain: 'general', tags: ['travail'], fixedStartMin: 9 * 60 },
  { title: 'Dhuhr',                    durationMin: 15, priority: 5, domain: 'islam', tags: ['prière'], fixedStartMin: 13 * 60 + 30 },
  { title: 'Déjeuner',                 durationMin: 30, priority: 4, domain: 'nutrition', tags: ['repas'], fixedStartMin: 13 * 60 + 0 },
  { title: 'Travail après-midi',       durationMin: 300, priority: 5, domain: 'general', tags: ['travail'], fixedStartMin: 14 * 60 },
  { title: 'Asr',                      durationMin: 15, priority: 5, domain: 'islam', tags: ['prière'], fixedStartMin: 17 * 60 },
  { title: 'Trajet domicile',          durationMin: 35, priority: 3, domain: 'planning', tags: ['trajet'] },
  { title: 'Collation pré-séance',     durationMin: 10, priority: 3, domain: 'nutrition', tags: ['collation'], fixedStartMin: 17 * 60 + 45 },
  { title: 'Séance sport',             durationMin: 90, priority: 5, domain: 'sport', tags: ['training'], fixedStartMin: 18 * 60 + 30 },
  { title: 'Maghrib',                  durationMin: 15, priority: 5, domain: 'islam', tags: ['prière'] },
  { title: 'Dîner',                    durationMin: 40, priority: 4, domain: 'nutrition', tags: ['repas'], fixedStartMin: 21 * 60 },
  { title: 'Isha',                     durationMin: 15, priority: 5, domain: 'islam', tags: ['prière'] },
  { title: 'Wird coranique',           durationMin: 20, priority: 3, domain: 'islam', tags: ['lecture', 'coran'] },
  { title: 'Sommeil',                  durationMin: 450, priority: 5, domain: 'sleep', tags: ['repos'], fixedStartMin: 22 * 60 + 30 },
  { title: 'Mesures bimensuelles',     durationMin: 15, priority: 3, domain: 'anthropo', tags: ['mesures'] },
  { title: 'Meal prep',                durationMin: 90, priority: 3, domain: 'nutrition', tags: ['cuisine'] },
  { title: 'Witr',                     durationMin: 10, priority: 3, domain: 'islam', tags: ['sunnah'] },
];

const taskIds = new Map<string, string>();
for (const t of TASK_TPLS) {
  const id = randomUUID();
  taskIds.set(t.title, id);
  const task: Record<string, unknown> = {
    v: 2 as const,
    id,
    title: t.title,
    durationMin: t.durationMin,
    priority: t.priority,
    domain: t.domain,
    tags: t.tags,
    dependsOn: [],
    enabled: true,
  };
  if (t.fixedStartMin !== undefined) task.fixedStartMin = t.fixedStartMin;
  out.scheduleTasks.push(task);
}

// RDV ponctuels (passé + futur)
type OneOff = { date: string; title: string; duration: number; priority: number; domain: TaskTpl['domain']; tags: string[]; startMin: number };
const oneOffs: OneOff[] = [
  // Passé
  { date: '2025-12-15', title: 'RDV médecin (check-up)', duration: 45, priority: 5, domain: 'general', tags: ['santé', 'rdv'], startMin: 10 * 60 },
  { date: '2026-03-10', title: 'RDV médecin (suivi)',    duration: 30, priority: 5, domain: 'general', tags: ['santé', 'rdv'], startMin: 14 * 60 },
  { date: '2026-02-04', title: 'RDV dentiste',           duration: 30, priority: 4, domain: 'general', tags: ['santé', 'rdv'], startMin: 11 * 60 },
  { date: '2025-12-24', title: 'Dîner famille',          duration: 180, priority: 4, domain: 'mental', tags: ['famille'], startMin: 20 * 60 },
  { date: '2026-01-20', title: 'Anniversaire frère',     duration: 180, priority: 4, domain: 'mental', tags: ['famille', 'anniversaire'], startMin: 19 * 60 },
  { date: '2026-04-15', title: 'Vacances (J1)',          duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-04-16', title: 'Vacances (J2)',          duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-04-17', title: 'Vacances (J3)',          duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-04-18', title: 'Vacances (J4)',          duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-04-19', title: 'Vacances (J5)',          duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-04-20', title: 'Vacances (J6)',          duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-04-21', title: 'Vacances (J7)',          duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-02-14', title: 'Voyage Lyon (J1)',       duration: 600, priority: 3, domain: 'planning', tags: ['voyage'], startMin: 8 * 60 },
  { date: '2026-02-15', title: 'Voyage Lyon (J2)',       duration: 600, priority: 3, domain: 'planning', tags: ['voyage'], startMin: 8 * 60 },
  { date: '2026-02-16', title: 'Voyage Lyon (J3)',       duration: 600, priority: 3, domain: 'planning', tags: ['voyage'], startMin: 8 * 60 },
  // Futur
  { date: '2026-07-06', title: 'RDV médecin (suivi)',    duration: 30, priority: 5, domain: 'general', tags: ['santé', 'rdv'], startMin: 10 * 60 },
  { date: '2026-06-18', title: 'Anniversaire papa',      duration: 180, priority: 4, domain: 'mental', tags: ['famille', 'anniversaire'], startMin: 19 * 60 },
  { date: '2026-07-20', title: 'Congés (J1)',            duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-07-21', title: 'Congés (J2)',            duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-07-22', title: 'Congés (J3)',            duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-07-23', title: 'Congés (J4)',            duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-07-24', title: 'Congés (J5)',            duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-07-25', title: 'Congés (J6)',            duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
  { date: '2026-07-26', title: 'Congés (J7)',            duration: 480, priority: 3, domain: 'planning', tags: ['vacances'], startMin: 9 * 60 },
];

// Map date → list of oneOff taskIds
const oneOffByDate = new Map<string, Array<{ id: string; startMin: number; duration: number }>>();
for (const o of oneOffs) {
  const id = randomUUID();
  out.scheduleTasks.push({
    v: 2 as const,
    id,
    title: o.title,
    durationMin: o.duration,
    priority: o.priority,
    domain: o.domain,
    tags: o.tags,
    fixedStartMin: o.startMin,
    dependsOn: [],
    enabled: true,
  });
  const list = oneOffByDate.get(o.date) ?? [];
  list.push({ id, startMin: o.startMin, duration: o.duration });
  oneOffByDate.set(o.date, list);
}

// 10. DAY SCHEDULES — passé + futur
const allDays = eachDay(PAST_START, FUTURE_END);

function buildDaySlots(date: string): Array<{ taskId: string; startMin: number; endMin: number }> {
  const dow = dayOfWeek(date); // 0=Sun, 6=Sat
  const slots: Array<{ taskId: string; startMin: number; endMin: number }> = [];
  const add = (title: string, startMin: number, durationMin: number) => {
    const id = taskIds.get(title);
    if (!id) return;
    slots.push({ taskId: id, startMin, endMin: Math.min(1440, startMin + durationMin) });
  };

  // OneOffs prennent priorité — bloquent journée si présents
  const oneOffsToday = oneOffByDate.get(date);
  if (oneOffsToday) {
    for (const o of oneOffsToday) {
      slots.push({ taskId: o.id, startMin: o.startMin, endMin: Math.min(1440, o.startMin + o.duration) });
    }
    // Si vacances/voyage = on garde uniquement prières + sommeil
    const isFullDay = oneOffsToday.some(o => o.duration >= 400);
    if (isFullDay) {
      add('Sobh (Fard)', 5 * 60 + 30, 15);
      add('Dhuhr', 13 * 60 + 30, 15);
      add('Asr', 17 * 60, 15);
      add('Maghrib', 19 * 60 + 30, 15);
      add('Isha', 21 * 60, 15);
      add('Sommeil', 22 * 60 + 30, 450);
      return slots.sort((a, b) => a.startMin - b.startMin);
    }
  }

  if (dow >= 1 && dow <= 5) {
    // Semaine
    add('Sobh (Fard)', 5 * 60 + 30, 15);
    add('Fajr Sunnah', 5 * 60 + 15, 5);
    add('Petit-déj', 7 * 60 + 30, 20);
    add('Trajet bureau', 8 * 60 + 15, 35);
    add('Travail matin', 9 * 60, 210);
    add('Déjeuner', 13 * 60, 30);
    add('Dhuhr', 13 * 60 + 30, 15);
    add('Travail après-midi', 14 * 60, 240);
    add('Asr', 17 * 60, 15);
    add('Trajet domicile', 17 * 60 + 20, 35);
    add('Collation pré-séance', 17 * 60 + 55, 10);
    if (dow !== 0) add('Séance sport', 18 * 60 + 30, 90);
    add('Maghrib', 20 * 60, 15);
    add('Dîner', 21 * 60, 40);
    add('Isha', 21 * 60 + 50, 15);
    add('Wird coranique', 22 * 60 + 10, 20);
    add('Witr', 22 * 60 + 30, 10);
    add('Sommeil', 22 * 60 + 45, 435);
  } else if (dow === 6) {
    // Samedi
    add('Sobh (Fard)', 5 * 60 + 45, 15);
    add('Petit-déj', 8 * 60, 25);
    add('Meal prep', 9 * 60, 90);
    add('Déjeuner', 13 * 60, 30);
    add('Dhuhr', 13 * 60 + 30, 15);
    add('Séance sport', 10 * 60, 90); // Décalée matin samedi
    add('Asr', 17 * 60, 15);
    add('Maghrib', 20 * 60, 15);
    add('Dîner', 20 * 60 + 30, 60);
    add('Isha', 21 * 60 + 45, 15);
    add('Sommeil', 23 * 60, 420);
  } else {
    // Dimanche (repos)
    add('Sobh (Fard)', 6 * 60, 15);
    add('Petit-déj', 9 * 60, 30);
    add('Dhuhr', 13 * 60 + 30, 15);
    add('Déjeuner', 13 * 60, 45);
    add('Asr', 17 * 60, 15);
    add('Maghrib', 20 * 60, 15);
    add('Dîner', 20 * 60 + 30, 45);
    add('Isha', 21 * 60 + 45, 15);
    add('Wird coranique', 22 * 60 + 10, 20);
    add('Sommeil', 22 * 60 + 45, 450);
  }

  // Ajout mesures bimensuelles
  const dayIdx = diffDays(PAST_START, date);
  if (dayIdx % 14 === 0 && dow === 0) {
    add('Mesures bimensuelles', 7 * 60 + 30, 15);
  }

  return slots.sort((a, b) => a.startMin - b.startMin);
}

for (const date of allDays) {
  const slots = buildDaySlots(date);
  out.daySchedules.push({
    v: 1 as const,
    id: randomUUID(),
    date,
    generatedAt: tsAtLocal(date, '06:00'),
    slots,
    unscheduled: [],
  });
}

// ─── VALIDATION ─────────────────────────────────────────────────────────────
type Counter = { ok: number; fail: number };
const report: Record<string, Counter> = {};

function validate<T>(name: string, items: unknown[], migrate: (raw: unknown) => T) {
  const c: Counter = { ok: 0, fail: 0 };
  for (const item of items) {
    try {
      migrate(item);
      c.ok++;
    } catch (err) {
      c.fail++;
      console.error(`\n[FAIL] ${name}:`, JSON.stringify(item).slice(0, 300));
      console.error(err);
      throw new Error(`Validation failed for ${name}`);
    }
  }
  report[name] = c;
}

validate('routines',       out.routines,       migrateRoutine);
validate('sessions',       out.sessions,       migrateWorkoutSession);
validate('measurements',   out.measurements,   migrateMeasurement);
validate('meals',          out.meals,          migrateMealEntry);
validate('prayerLogs',     out.prayerLogs,     migratePrayerLog);
validate('journalEntries', out.journalEntries, migrateJournalEntry);
validate('sleepEntries',   out.sleepEntries,   migrateSleepEntry);
validate('waterIntakes',   out.waterIntakes,   migrateWaterIntake);
validate('scheduleTasks',  out.scheduleTasks,  migrateScheduleTask);
validate('daySchedules',   out.daySchedules,   migrateDaySchedule);

// ─── REPORT ────────────────────────────────────────────────────────────────
console.log('\n========== Seed generation report ==========');
for (const [k, v] of Object.entries(report)) {
  console.log(`  ${k.padEnd(16)} ok=${String(v.ok).padStart(4)}  fail=${v.fail}`);
}
console.log('============================================');

if (Object.values(report).some(c => c.fail > 0)) {
  throw new Error('Some entries failed validation — aborting.');
}

// ─── WRITE FILE ────────────────────────────────────────────────────────────
const payload = {
  type: 'seed.full' as const,
  version: '4.0',
  generatedAt: `${TODAY}T00:00:00Z`,
  data: out,
};
const outPath = path.join(process.cwd(), 'public/data/seed-demo.json');
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`\n✓ Wrote ${outPath}`);
console.log(`  Past window  : ${PAST_START} → ${TODAY} (${pastDays.length} days)`);
console.log(`  Full window  : ${PAST_START} → ${FUTURE_END} (${allDays.length} days)`);
