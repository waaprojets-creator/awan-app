import { useState, useEffect, useCallback } from 'react';
import { IslamService } from '@/services/islamService';
import { uid } from '@/utils/storage';
import type { PrayerLogLatest, PrayerName } from '@/data/schemas/islam/prayerLog';
import { PRAYER_NAMES } from '@/data/schemas/islam/prayerLog';

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

  const toggle = useCallback(async (prayer: PrayerName): Promise<void> => {
    const updated = await IslamService.togglePrayer(date, prayer, uid());
    setLog(updated);
  }, [date]);

  const isDone = useCallback((prayer: PrayerName): boolean => {
    return log?.prayers?.[prayer] ?? false;
  }, [log]);

  const doneCount = PRAYER_NAMES.filter(p => log?.prayers?.[p]).length;

  return { log, loading, toggle, isDone, doneCount, total: PRAYER_NAMES.length };
}
