import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';

export function useChessClock() {
  const phase = useGameStore((s) => s.phase);
  const tickClock = useGameStore((s) => s.tickClock);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === 'playing') {
      intervalRef.current = setInterval(tickClock, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, tickClock]);
}
