import { useState, useEffect, useRef } from 'react';
import { Planner } from '@/modules/planning/api';
import { getStorage } from '@/data/storage/storageService';
import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import type { DayScheduleLatest } from '@/data/schemas/planning/daySchedule';

export function usePlanner() {
  const [tasks, setTasks] = useState<ScheduleTaskLatest[]>([]);
  const [schedule, setSchedule] = useState<DayScheduleLatest | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const plannerRef = useRef<Planner | null>(null);

  useEffect(() => {
    let active = true;
    getStorage().then(async storage => {
      const planner = new Planner(storage);
      plannerRef.current = planner;
      const ts = await planner.getTasks();
      if (active) setTasks(ts);
    });
    return () => { active = false; };
  }, []);

  async function saveTask(task: ScheduleTaskLatest): Promise<void> {
    if (!plannerRef.current) return;
    await plannerRef.current.saveTask(task);
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = task;
        return next;
      }
      return [...prev, task];
    });
  }

  async function deleteTask(id: string): Promise<void> {
    if (!plannerRef.current) return;
    await plannerRef.current.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function optimize(date: string): Promise<void> {
    if (!plannerRef.current) return;
    setOptimizing(true);
    try {
      const result = await plannerRef.current.optimize(date);
      setSchedule(result);
    } finally {
      setOptimizing(false);
    }
  }

  async function getSchedule(date: string): Promise<void> {
    if (!plannerRef.current) return;
    const result = await plannerRef.current.getSchedule(date);
    setSchedule(result);
  }

  return { tasks, schedule, optimizing, saveTask, deleteTask, optimize, getSchedule };
}
