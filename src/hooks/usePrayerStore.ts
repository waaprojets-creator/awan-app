import { useState, useEffect, useCallback } from 'react';
import { IslamService } from '@/services/islamService';
import { uid } from '@/utils/storage';
import type { PrayerLogLatest, PrayerNameV2 } from '@/data/schemas/islam/prayerLog';
import { PRAYER_NAMES_V2, computePrayerScores } from '@/data/schemas/islam/prayerLog';
import { DbFullError } from '@/data/storage/IStorage';

function dispatchDbFull() { window.dispatchEvent(new CustomEvent('awan:db-full')); }

export function usePrayerStore(date: string) {
  const [log, setLog] = useState<PrayerLogLatest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    IslamService.getPrayerLog(date).then(l => {
      if (active) { setLog(l); setLoading(false); }
    });
    return () => { active = false; };
  }, [date]);

  const toggle = useCallback(async (prayer: PrayerNameV2, timeHHMM?: string): Promise<void> => {
    try {
      const updated = await IslamService.togglePrayer(date, prayer, uid(), timeHHMM);
      setLog(updated);
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, [date]);

  const setTime = useCallback(async (prayer: PrayerNameV2, timeHHMM: string): Promise<void> => {
    try {
      const existing = await IslamService.getPrayerLog(date);
      const defaultPrayers = PRAYER_NAMES_V2.reduce(
        (acc, p) => ({ ...acc, [p]: false }),
        {} as Record<PrayerNameV2, boolean>,
      );
      const prayers: Record<PrayerNameV2, boolean> = { ...defaultPrayers, ...(existing?.prayers ?? {}) };
      const prayerTimes = { ...(existing?.prayerTimes ?? {}), [prayer]: timeHHMM };
      const updated: PrayerLogLatest = {
        v: 2,
        id: existing?.id ?? uid(),
        date,
        prayers,
        savedAt: Date.now(),
        ...computePrayerScores(prayers),
        prayerTimes,
      };
      await IslamService.savePrayerLog(updated);
      setLog(updated);
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, [date]);

  const isDone = useCallback((prayer: PrayerNameV2): boolean => {
    return log?.prayers?.[prayer] ?? false;
  }, [log]);

  const getTime = useCallback((prayer: PrayerNameV2): string | undefined => {
    return log?.prayerTimes?.[prayer];
  }, [log]);

  const doneCount = PRAYER_NAMES_V2.filter(p => log?.prayers?.[p]).length;

  return { log, loading, toggle, setTime, isDone, getTime, doneCount, total: PRAYER_NAMES_V2.length };
}
