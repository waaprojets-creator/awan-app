import { useState, useEffect, useCallback } from 'react';
import { WorkoutService } from '@/services/workoutService';
import type { RoutineLatest } from '@/data/schemas/sport/routine';
import { eventBus } from '@/data/events/bus';

export interface RoutineSchedule {
  nextRoutine: RoutineLatest | null;
  loading: boolean;
}

export function useRoutineSchedule(): RoutineSchedule {
  const [nextRoutine, setNextRoutine] = useState<RoutineLatest | null>(null);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    const [routines, sessions] = await Promise.all([
      WorkoutService.getAllRoutines(),
      WorkoutService.getAllSessions(),
    ]);
    const next = await WorkoutService.computeNextRoutine(routines, sessions);
    setNextRoutine(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    compute();
    const unsubWorkout = eventBus.on('workout.completed', () => { void compute(); });
    const unsubRoutine = eventBus.on('sport.routine.modified', () => { void compute(); });
    return () => {
      unsubWorkout();
      unsubRoutine();
    };
  }, [compute]);

  return { nextRoutine, loading };
}
