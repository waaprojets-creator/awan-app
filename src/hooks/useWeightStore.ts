import { useState, useEffect, useCallback, useMemo } from 'react';
import { WeightService } from '@/services/weightService';
import type { WeightEntryLatest } from '@/data/schemas/body/weightEntry';
import { DbFullError } from '@/data/storage/IStorage';

function dispatchDbFull() { window.dispatchEvent(new CustomEvent('awan:db-full')); }

export function useWeightStore() {
  const [entries, setEntries] = useState<WeightEntryLatest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    WeightService.getAll().then(all => {
      if (active) { setEntries(all); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  const add = useCallback(async (entry: WeightEntryLatest): Promise<void> => {
    try {
      await WeightService.save(entry);
      setEntries(prev => [entry, ...prev.filter(e => e.id !== entry.id)]
        .sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, []);

  const update = useCallback(async (entry: WeightEntryLatest): Promise<void> => {
    try {
      await WeightService.save(entry);
      setEntries(prev =>
        prev.map(e => e.id === entry.id ? entry : e)
          .sort((a, b) => b.date.localeCompare(a.date)),
      );
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await WeightService.delete(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const avg7d = useMemo(() => WeightService.getAvg7d(entries), [entries]);

  const todayEntry = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return entries.find(e => e.date === today) ?? null;
  }, [entries]);

  return { entries, loading, todayEntry, avg7d, add, update, remove };
}
