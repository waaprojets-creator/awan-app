import { getStorage } from '@/data/storage/storageService';
import {
  migrateRoutine,
  migrateWorkoutSession,
  nextCycleLetter,
} from '@/data/schemas/sport/routine';
import type {
  RoutineLatest,
  WorkoutSessionLatest,
  CycleLetter,
} from '@/data/schemas/sport/routine';
import { eventBus } from '@/data/events/bus';

const ROUTINE_PREFIX = 'sport.routine';
const SESSION_PREFIX = 'sport.session';

export const WorkoutService = {
  async getAllRoutines(): Promise<RoutineLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(ROUTINE_PREFIX);
    const results = await Promise.all(keys.map(k => storage.get(k, migrateRoutine)));
    return results.filter((r): r is RoutineLatest => r !== null);
  },

  async getRoutineById(id: string): Promise<RoutineLatest | null> {
    const storage = await getStorage();
    return storage.get(`${ROUTINE_PREFIX}.${id}`, migrateRoutine);
  },

  async saveRoutine(routine: RoutineLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(`${ROUTINE_PREFIX}.${routine.id}`, routine);
  },

  async deleteRoutine(id: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(`${ROUTINE_PREFIX}.${id}`);
  },

  async getAllSessions(): Promise<WorkoutSessionLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(SESSION_PREFIX);
    const results = await Promise.all(keys.map(k => storage.get(k, migrateWorkoutSession)));
    return results.filter((r): r is WorkoutSessionLatest => r !== null);
  },

  async getLastSessionByRoutine(routineId: string): Promise<WorkoutSessionLatest | null> {
    const sessions = await WorkoutService.getAllSessions();
    const matching = sessions
      .filter(s => s.routineId === routineId && !s.isException)
      .sort((a, b) => b.startTime - a.startTime);
    return matching[0] ?? null;
  },

  async saveSession(session: WorkoutSessionLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(`${SESSION_PREFIX}.${session.id}`, session);
    eventBus.emit('workout.completed', { workoutId: session.id, date: session.date });
  },

  // Sets: primary muscle counts 1.0, each secondary muscle counts 0.5
  // Source: Schoenfeld 2017 volume-hypertrophy dose-response
  getWeeklyVolumeByMuscle(sessions: WorkoutSessionLatest[], weekStart: Date): Record<string, number> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const volume: Record<string, number> = {};
    for (const session of sessions) {
      const d = new Date(session.date);
      if (d < weekStart || d >= weekEnd) continue;
      for (const exercise of session.exercises) {
        const workingSets = exercise.sets.filter(s => s.kind === 'working').length;
        if (workingSets === 0) continue;
        if (exercise.primaryMuscle) {
          volume[exercise.primaryMuscle] = (volume[exercise.primaryMuscle] ?? 0) + workingSets;
        }
        for (const sm of exercise.secondaryMuscles ?? []) {
          volume[sm] = (volume[sm] ?? 0) + workingSets * 0.5;
        }
      }
    }
    return volume;
  },

  async computeNextRoutine(
    routines: RoutineLatest[],
    sessions: WorkoutSessionLatest[],
  ): Promise<RoutineLatest | null> {
    if (routines.length === 0) return null;
    const cycled = routines.filter(r => r.cycleLetter);
    if (cycled.length === 0) return routines[0] ?? null;
    const availableLetters = Array.from(
      new Set(cycled.map(r => r.cycleLetter).filter((l): l is CycleLetter => !!l)),
    );
    const lastReal = sessions
      .filter(s => !s.isException && s.cycleLetter)
      .sort((a, b) => b.startTime - a.startTime)[0];
    const targetLetter = nextCycleLetter(lastReal?.cycleLetter ?? null, availableLetters);
    if (!targetLetter) return cycled[0] ?? null;
    return cycled.find(r => r.cycleLetter === targetLetter) ?? cycled[0] ?? null;
  },
};
