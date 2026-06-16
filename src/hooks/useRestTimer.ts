import { useState, useEffect } from 'react';

export function useRestTimer(
  restEndAt: number | null,
  onElapsed: () => void,
): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (restEndAt === null) { setRemaining(0); return; }
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
