import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { eventBus } from '@/data/events/bus';
import type { EventMap } from '@/data/events/types';
import { getStorage } from '@/data/storage/storageService';
import { Planner } from '@/modules/planning/api';
import { HabitService } from '@/services/habitService';
import { HabitOccurrenceService } from '@/services/habitOccurrenceService';
import { assembleInventory, type TaskListItem } from '@/modules/tasks/inventory';
import { ds } from '@/utils/storage';

const REFRESH_EVENTS: ReadonlyArray<keyof EventMap> = [
  'task.modified',
  'planning.optimized',
  'habit.definition.modified',
  'habit.logged',
];

/**
 * Inventaire unifié tâches one-off + habitudes récurrentes, tenu à jour via
 * l'event bus. La complétion des habitudes est évaluée pour aujourd'hui.
 */
export function useTaskInventory() {
  const today = useMemo(() => ds(new Date()), []);
  const [items, setItems] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    const storage = await getStorage();
    const planner = new Planner(storage);
    const [tasks, habits, occ] = await Promise.all([
      planner.getAllTasks(),
      HabitService.getDefinitions(),
      HabitOccurrenceService.getByDate(today),
    ]);
    const doneHabitIds = new Set(occ.map(o => o.habitId));
    if (mounted.current) setItems(assembleInventory(tasks, habits, doneHabitIds));
  }, [today]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    reload().finally(() => { if (mounted.current) setLoading(false); });

    const offs = REFRESH_EVENTS.map(ev => eventBus.on(ev, () => { void reload(); }));
    return () => {
      mounted.current = false;
      offs.forEach(off => off());
    };
  }, [reload]);

  return { items, loading, reload, today };
}
