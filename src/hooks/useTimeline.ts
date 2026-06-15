import { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus } from '@/data/events/bus';
import type { EventMap } from '@/data/events/types';
import { TimelineService, type TimelineItem } from '@/modules/planning/timeline';

// Événements de mutation qui modifient la timeline d'une journée.
// Couvre les 8 types de tâches : sport, nutrition, mensuration (poids+mesures),
// sommeil (day.ended), tâche (planning.optimized), journal, islam, habitude.
const REFRESH_EVENTS: ReadonlyArray<keyof EventMap> = [
  'workout.completed',
  'meal.logged',
  'measurement.recorded',
  'day.ended',
  'planning.optimized',
  'journal.logged',
  'prayer.logged',
  'quran.logged',
  'habit.logged',
];

/**
 * Visionneur AWAN : items agrégés d'une date, tenus à jour via l'event bus.
 * @param date YYYY-MM-DD
 */
export function useTimeline(date: string) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    const next = await TimelineService.getByDate(date);
    if (mounted.current) setItems(next);
  }, [date]);

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

  return { items, loading, reload };
}
