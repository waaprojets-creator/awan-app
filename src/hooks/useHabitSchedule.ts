import { useState, useEffect, useCallback, useRef } from 'react';
import { HabitService } from '@/services/habitService';
import { isHabitScheduled } from '@/data/schemas/habits/habitDefinition';
import type { HabitDefinitionLatest } from '@/data/schemas/habits/habitDefinition';
import { eventBus } from '@/data/events/bus';

interface HabitScheduleCache {
  definitions: HabitDefinitionLatest[];
  builtAt: number;
}

export function useHabitSchedule() {
  const [loading, setLoading] = useState(true);
  const cache = useRef<HabitScheduleCache | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    const definitions = await HabitService.getDefinitions();
    cache.current = { definitions, builtAt: Date.now() };
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const unsub = eventBus.on('habit.definition.modified', () => {
      cache.current = null;
      setVersion(v => v + 1);
      void load();
    });
    return unsub;
  }, [load]);

  const getScheduledForDate = useCallback((date: string): HabitDefinitionLatest[] => {
    if (!cache.current) return [];
    return cache.current.definitions.filter(d => isHabitScheduled(d, date));
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  return { getScheduledForDate, loading };
}
