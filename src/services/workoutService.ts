import { getStorage } from '@/data/storage/storageService';
import { migrateRoutine, migrateWorkoutSession } from '@/data/schemas/sport/routine';
import type { RoutineLatest, WorkoutSessionLatest } from '@/data/schemas/sport/routine';
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

  async saveSession(session: WorkoutSessionLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(`${SESSION_PREFIX}.${session.id}`, session);
    eventBus.emit('workout.completed', { workoutId: session.id, date: session.date });
  },
};
