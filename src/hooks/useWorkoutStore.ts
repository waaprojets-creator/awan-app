import { useState, useEffect } from 'react';
import { WorkoutService } from '@/services/workoutService';
import type { RoutineLatest, WorkoutSessionLatest } from '@/data/schemas/sport/routine';
import { useAppStore } from '@/data/store/appStore';

export function useWorkoutStore() {
  const [routines, setRoutines] = useState<RoutineLatest[]>([]);
  const [sessions, setSessions] = useState<WorkoutSessionLatest[]>([]);
  const [loading, setLoading] = useState(true);
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    Promise.all([
      WorkoutService.getAllRoutines(),
      WorkoutService.getAllSessions(),
    ]).then(([rs, ss]) => {
      if (!active) return;
      setRoutines(rs);
      setSessions(ss);
      setLoading(false);
    });
    return () => { active = false; };
  }, [dataVersion]);

  async function saveRoutine(routine: RoutineLatest): Promise<void> {
    await WorkoutService.saveRoutine(routine);
    setRoutines(prev => {
      const idx = prev.findIndex(r => r.id === routine.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = routine;
        return next;
      }
      return [...prev, routine];
    });
  }

  async function deleteRoutine(id: string): Promise<void> {
    await WorkoutService.deleteRoutine(id);
    setRoutines(prev => prev.filter(r => r.id !== id));
  }

  async function saveSession(session: WorkoutSessionLatest): Promise<void> {
    await WorkoutService.saveSession(session);
    setSessions(prev => [...prev, session]);
  }

  return { routines, sessions, loading, saveRoutine, deleteRoutine, saveSession };
}
