import { useEffect, useRef } from 'react';
import { eventBus } from '@/data/events/bus';
import { toDateString } from '@/utils/date';
import { perfMonitor } from '@/utils/perfMonitor';
import { PerfService } from '@/services/perfService';

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
        const yesterday = lastDate.current;
        eventBus.emit('day.ended', { date: yesterday });
        perfMonitor.buildSnapshot(yesterday)
          .then(snap => PerfService.saveSnapshot(snap))
          .catch(() => { /* silent — perf data non-critique */ });
        lastDate.current = today;
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);
}
