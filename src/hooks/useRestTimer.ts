import { useState, useEffect, useRef } from 'react';

export function useRestTimer(
  restEndAt: number | null,
  onElapsed: () => void,
): number {
  const [remaining, setRemaining] = useState(0);
  const prevRestEndAt = useRef<number | null>(null);

  useEffect(() => {
    if (restEndAt === null) {
      setRemaining(0);
      const hadRest = prevRestEndAt.current !== null;
      prevRestEndAt.current = null;
      if (hadRest) onElapsed();
      return;
    }
    prevRestEndAt.current = restEndAt;
    let fired = false;
    const tick = () => {
      const r = Math.max(0, Math.ceil((restEndAt - Date.now()) / 1000));
      setRemaining(r);
      if (r === 0 && !fired) { fired = true; onElapsed(); }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [restEndAt, onElapsed]);

  return remaining;
}
