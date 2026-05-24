import { useState, useEffect, useCallback } from 'react';
import { IslamService } from '@/services/islamService';
import { uid } from '@/utils/storage';
import type { PrayerLogLatest, PrayerName } from '@/data/schemas/islam/prayerLog';
import { PRAYER_NAMES } from '@/data/schemas/islam/prayerLog';
import { useAppStore } from '@/data/store/appStore';

export function usePrayerStore(date: string) {
  const [log, setLog] = useState<PrayerLogLatest | null>(null);
  const [loading, setLoading] = useState(true);
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    IslamService.getPrayerLog(date).then(l => {
      if (active) { setLog(l); setLoading(false); }
    });
    return () => { active = false; };
  }, [date, dataVersion]);

  /** Toggle une prière. `timeHHMM` = heure réelle saisie (sinon non enregistrée). */
  const toggle = useCallback(async (prayer: PrayerName, timeHHMM?: string | null): Promise<void> => {
    const updated = await IslamService.togglePrayer(date, prayer, uid(), timeHHMM);
    setLog(updated);
  }, [date]);

  const isDone = useCallback((prayer: PrayerName): boolean => {
    return log?.prayers?.[prayer] ?? false;
  }, [log]);

  const realTime = useCallback((prayer: PrayerName): string | null => {
    return log?.prayerTimes?.[prayer] ?? null;
  }, [log]);

  const doneCount = PRAYER_NAMES.filter(p => log?.prayers?.[p]).length;

  return { log, loading, toggle, isDone, realTime, doneCount, total: PRAYER_NAMES.length };
}
