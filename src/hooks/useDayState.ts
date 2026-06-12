import { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus } from '@/data/events/bus';
import { DayStateService } from '@/services/dayStateService';
import { defaultSegments } from '@/modules/planning/dayState';
import type { LifeState, StateSegment } from '@/data/schemas/planning/dayState';

/**
 * États de vie d'une journée (segments intra-journée), tenus à jour via l'event bus.
 * @param date YYYY-MM-DD
 */
export function useDayState(date: string) {
  const [segments, setSegments] = useState<StateSegment[]>(defaultSegments);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    const segs = await DayStateService.segmentsForDate(date);
    if (mounted.current) setSegments(segs);
  }, [date]);

  useEffect(() => {
    mounted.current = true;
    void reload();
    const off = eventBus.on('state.changed', e => { if (e.date === date) void reload(); });
    return () => { mounted.current = false; off(); };
  }, [reload, date]);

  const setSegment = useCallback(
    async (state: LifeState, startMin: number, endMin: number) => {
      const next = await DayStateService.setSegment(date, state, startMin, endMin);
      if (mounted.current) setSegments(next.segments);
    },
    [date],
  );

  const reset = useCallback(async () => {
    await DayStateService.reset(date);
    if (mounted.current) setSegments(defaultSegments());
  }, [date]);

  return { segments, setSegment, reset, reload };
}
