import { useState, useEffect, useCallback, useMemo } from 'react';
import { WeightService } from '@/services/weightService';
import type { WeightEntryLatest } from '@/data/schemas/body/weightEntry';
import { useAppStore } from '@/data/store/appStore';
import { DbFullError } from '@/data/storage/IStorage';
import { dbFullBus } from '@/utils/dbFullBus';
import { eventBus } from '@/data/events/bus';

function dispatchDbFull() { dbFullBus.emit(); }

export function useWeightStore() {
  const [entries, setEntries] = useState<WeightEntryLatest[]>([]);
  const [loading, setLoading] = useState(true);

  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    WeightService.getAll().then(all => {
      if (active) { setEntries(all); setLoading(false); }
    });
    return () => { active = false; };
  }, [dataVersion]);

  const add = useCallback(async (entry: WeightEntryLatest): Promise<void> => {
    try {
      await WeightService.save(entry);
      eventBus.emit('measurement.recorded', { measurementId: entry.date, date: entry.date });
      setEntries(prev => [entry, ...prev.filter(e => e.date !== entry.date)]
        .sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, []);

  const update = useCallback(async (entry: WeightEntryLatest): Promise<void> => {
    try {
      await WeightService.save(entry);
      eventBus.emit('measurement.recorded', { measurementId: entry.date, date: entry.date });
      setEntries(prev =>
        prev.map(e => e.date === entry.date ? entry : e)
          .sort((a, b) => b.date.localeCompare(a.date)),
      );
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, []);

  const remove = useCallback(async (date: string): Promise<void> => {
    await WeightService.delete(date);
    setEntries(prev => prev.filter(e => e.date !== date));
  }, []);

  const avg7d = useMemo(() => WeightService.getAvg7d(entries), [entries]);

  const todayEntry = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return entries.find(e => e.date === today) ?? null;
  }, [entries]);

  return { entries, loading, todayEntry, avg7d, add, update, remove };
}
