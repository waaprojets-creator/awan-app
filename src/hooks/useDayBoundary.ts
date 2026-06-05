import { useEffect, useRef } from 'react';
import { eventBus } from '@/data/events/bus';
import { toDateString } from '@/utils/date';

/**
 * Detects midnight crossings while the app is open and emits `day.ended`
 * for the previous day. Polls once per minute — negligible battery impact.
 */
export function useDayBoundary(): void {
  const lastDate = useRef(toDateString(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      const today = toDateString(new Date());
      if (today !== lastDate.current) {
        eventBus.emit('day.ended', { date: lastDate.current });
        lastDate.current = today;
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);
}
