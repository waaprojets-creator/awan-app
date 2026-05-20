import { describe, it, expect, vi } from 'vitest';
import type { ExerciseEntry } from '@/utils/sportData';
import { selectExercisesForMuscle } from '@/modules/coach/routine-generator/exerciseSelector';
import { allocateSetsPerMuscle } from '@/modules/coach/routine-generator/volumeAllocator';
import { generateRoutines } from '@/modules/coach/routine-generator/generator';
import { VOLUME_LANDMARKS } from '@/constants/volumeLandmarks';
import type { GeneratorConfig } from '@/modules/coach/routine-generator/types';

const MOCK_EXERCISES: ExerciseEntry[] = [
  { id: 'barbell_bench_press', n: 'Barbell Bench Press', pm: ['chest'], sm: ['triceps', 'shoulders'], eq: 'barbell', cat: 'strength', lvl: 'intermediate', force: 'push' },
  { id: 'incline_dumbbell_press', n: 'Incline DB Press', pm: ['chest'], sm: ['shoulders'], eq: 'dumbbell', cat: 'strength', lvl: 'intermediate', force: 'push' },
  { id: 'push_up', n: 'Push Up', pm: ['chest'], sm: ['triceps'], eq: 'body only', cat: 'strength', lvl: 'beginner', force: 'push' },
  { id: 'cable_crossover', n: 'Cable Crossover', pm: ['chest'], sm: [], eq: 'cable', cat: 'strength', lvl: 'intermediate', force: 'push' },
  { id: 'pull_up', n: 'Pull Up', pm: ['lats'], sm: ['biceps'], eq: 'body only', cat: 'strength', lvl: 'intermediate', force: 'pull' },
  { id: 'barbell_row', n: 'Barbell Row', pm: ['middle_back'], sm: ['biceps'], eq: 'barbell', cat: 'strength', lvl: 'intermediate', force: 'pull' },
  { id: 'muscle_up', n: 'Muscle Up', pm: ['lats'], sm: ['triceps'], eq: 'body only', cat: 'strength', lvl: 'expert', force: 'pull' },
  { id: 'overhead_press', n: 'Overhead Press', pm: ['shoulders'], sm: ['triceps'], eq: 'barbell', cat: 'strength', lvl: 'intermediate', force: 'push' },
  { id: 'barbell_curl', n: 'Barbell Curl', pm: ['biceps'], sm: ['forearms'], eq: 'barbell', cat: 'strength', lvl: 'beginner', force: 'pull' },
  { id: 'tricep_dip', n: 'Tricep Dip', pm: ['triceps'], sm: ['chest'], eq: 'body only', cat: 'strength', lvl: 'intermediate', force: 'push' },
  { id: 'squat', n: 'Barbell Squat', pm: ['quadriceps'], sm: ['glutes', 'hamstrings'], eq: 'barbell', cat: 'strength', lvl: 'intermediate', force: 'push' },
  { id: 'deadlift', n: 'Deadlift', pm: ['hamstrings'], sm: ['lower_back', 'glutes'], eq: 'barbell', cat: 'strength', lvl: 'intermediate', force: 'pull' },
  { id: 'calf_raise', n: 'Calf Raise', pm: ['calves'], sm: [], eq: 'machine', cat: 'strength', lvl: 'beginner', force: 'push' },
  { id: 'hip_thrust', n: 'Hip Thrust', pm: ['glutes'], sm: ['hamstrings'], eq: 'barbell', cat: 'strength', lvl: 'intermediate', force: 'push' },
  { id: 'crunch', n: 'Crunch', pm: ['abdominals'], sm: [], eq: 'body only', cat: 'strength', lvl: 'beginner', force: 'push' },
];

vi.mock('@/utils/sportData', () => ({
  getExercises: () => MOCK_EXERCISES,
  loadExerciseCatalog: async () => {},
}));

const BASE_CONFIG: GeneratorConfig = {
  objectif: 'hypertrophie',
  niveau: 'intermediate',
  frequenceJours: 3,
  equipement: ['barbell', 'dumbbell'],
};

// ─── exerciseSelector ────────────────────────────────────────────────────────

describe('exerciseSelector — matching', () => {
  it('returns exercises matching muscle and equipment', () => {
    const results = selectExercisesForMuscle('chest', BASE_CONFIG, 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(e => e.id === 'barbell_bench_press')).toBe(true);
    expect(results.some(e => e.id === 'incline_dumbbell_press')).toBe(true);
    expect(results.some(e => e.id === 'push_up')).toBe(true); // body only always included
    expect(results.some(e => e.id === 'cable_crossover')).toBe(false); // cable not in config
  });

  it('back muscle matches lats and middle_back', () => {
    const results = selectExercisesForMuscle('back', BASE_CONFIG, 10);
    expect(results.some(e => e.id === 'pull_up')).toBe(true);   // lats
    expect(results.some(e => e.id === 'barbell_row')).toBe(true); // middle_back
  });

  it('returns empty when no equipment matches and no body only exercises', () => {
    const results = selectExercisesForMuscle('shoulders', { ...BASE_CONFIG, equipement: [] }, 10);
    expect(results).toHaveLength(0); // overhead_press is barbell, not body only
  });

  it('respects the limit parameter', () => {
    const results = selectExercisesForMuscle('chest', BASE_CONFIG, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});

describe('exerciseSelector — level filter', () => {
  it('beginner config excludes expert exercises', () => {
    const results = selectExercisesForMuscle('back', { ...BASE_CONFIG, niveau: 'beginner' }, 10);
    expect(results.some(e => e.id === 'muscle_up')).toBe(false); // expert
    expect(results.some(e => e.id === 'pull_up')).toBe(true);    // intermediate → ok for beginner
  });

  it('intermediate config includes all levels', () => {
    const results = selectExercisesForMuscle('back', { ...BASE_CONFIG, niveau: 'intermediate' }, 10);
    expect(results.some(e => e.id === 'muscle_up')).toBe(true);
    expect(results.some(e => e.id === 'pull_up')).toBe(true);
  });
});

// ─── volumeAllocator ─────────────────────────────────────────────────────────

describe('volumeAllocator — bounds', () => {
  it('never exceeds MAV[1] for any objective', () => {
    const muscles = Object.keys(VOLUME_LANDMARKS);
    for (const objectif of ['hypertrophie', 'force', 'endurance', 'recomposition'] as const) {
      const result = allocateSetsPerMuscle(muscles, objectif, 4);
      for (const muscle of muscles) {
        expect(result[muscle]).toBeLessThanOrEqual(VOLUME_LANDMARKS[muscle]!.mav[1]);
      }
    }
  });

  it('never goes below MEV for muscles with MEV > 0', () => {
    const muscles = Object.keys(VOLUME_LANDMARKS).filter(m => VOLUME_LANDMARKS[m]!.mev > 0);
    for (const objectif of ['hypertrophie', 'force', 'endurance', 'recomposition'] as const) {
      const result = allocateSetsPerMuscle(muscles, objectif, 3);
      for (const muscle of muscles) {
        expect(result[muscle]).toBeGreaterThanOrEqual(VOLUME_LANDMARKS[muscle]!.mev);
      }
    }
  });

  it('hypertrophie targets MAV[1]', () => {
    const result = allocateSetsPerMuscle(['chest'], 'hypertrophie', 3);
    expect(result['chest']).toBe(VOLUME_LANDMARKS['chest']!.mav[1]); // 20
  });

  it('force allocates less volume than hypertrophie', () => {
    const hyper = allocateSetsPerMuscle(['chest', 'back'], 'hypertrophie', 3);
    const force = allocateSetsPerMuscle(['chest', 'back'], 'force', 3);
    expect(force['chest']!).toBeLessThan(hyper['chest']!);
    expect(force['back']!).toBeLessThan(hyper['back']!);
  });
});

// ─── generateRoutines ────────────────────────────────────────────────────────

describe('generateRoutines — structure', () => {
  it('returns correct number of routines for frequenceJours', async () => {
    for (const freq of [2, 3, 4, 5, 6] as const) {
      const routines = await generateRoutines({ ...BASE_CONFIG, frequenceJours: freq });
      expect(routines).toHaveLength(freq);
    }
  });

  it('all routines have source: coach', async () => {
    const routines = await generateRoutines(BASE_CONFIG);
    for (const r of routines) {
      expect(r.source).toBe('coach');
    }
  });

  it('all routines have v: 1', async () => {
    const routines = await generateRoutines(BASE_CONFIG);
    for (const r of routines) {
      expect(r.v).toBe(1);
    }
  });

  it('each routine has at least one exercise', async () => {
    const routines = await generateRoutines(BASE_CONFIG);
    for (const r of routines) {
      expect(r.exercises.length).toBeGreaterThan(0);
    }
  });
});

describe('generateRoutines — cycle letters', () => {
  it('4j assigns A, B, C, D', async () => {
    const routines = await generateRoutines({ ...BASE_CONFIG, frequenceJours: 4 });
    expect(routines[0]?.cycleLetter).toBe('A');
    expect(routines[1]?.cycleLetter).toBe('B');
    expect(routines[2]?.cycleLetter).toBe('C');
    expect(routines[3]?.cycleLetter).toBe('D');
  });

  it('5j has null cycleLetter for the 5th routine', async () => {
    const routines = await generateRoutines({ ...BASE_CONFIG, frequenceJours: 5 });
    expect(routines[4]?.cycleLetter).toBeNull();
  });

  it('6j has null cycleLetter for routines 5 and 6', async () => {
    const routines = await generateRoutines({ ...BASE_CONFIG, frequenceJours: 6 });
    expect(routines[4]?.cycleLetter).toBeNull();
    expect(routines[5]?.cycleLetter).toBeNull();
  });
});
