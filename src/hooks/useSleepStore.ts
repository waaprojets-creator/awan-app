import { useState, useEffect, useCallback } from 'react';
import { SleepService } from '@/services/sleepService';
import type { SleepEntryLatest } from '@/data/schemas/sleep/sleepEntry';
import { useAppStore } from '@/data/store/appStore';

export function useSleepStore() {
  const [entries, setEntries] = useState<SleepEntryLatest[]>([]);
  const [loading, setLoading] = useState(true);
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    SleepService.getAll().then(all => {
      if (active) { setEntries(all); setLoading(false); }
    });
    return () => { active = false; };
  }, [dataVersion]);

  const add = useCallback(async (entry: SleepEntryLatest): Promise<void> => {
    await SleepService.save(entry);
    setEntries(prev => [entry, ...prev.filter(e => e.id !== entry.id)]
      .sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  const update = useCallback(async (entry: SleepEntryLatest): Promise<void> => {
    await SleepService.save(entry);
    setEntries(prev =>
      prev.map(e => e.id === entry.id ? entry : e)
        .sort((a, b) => b.date.localeCompare(a.date)),
    );
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await SleepService.delete(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const avgDurationH = SleepService.avgDurationH(
    entries.filter(e => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      return e.date >= cutoff.toISOString().slice(0, 10);
    }),
  );

  return { entries, loading, avgDurationH, add, update, remove };
}
