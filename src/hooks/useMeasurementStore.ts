import { useState, useEffect, useCallback } from 'react';
import { MeasurementService } from '@/services/measurementService';
import type { MeasurementLatest } from '@/data/schemas/anthropo/measurement';

export function useMeasurementStore() {
  const [history, setHistory] = useState<MeasurementLatest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    MeasurementService.getAll().then(entries => {
      if (active) { setHistory(entries); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  const save = useCallback(async (entry: MeasurementLatest): Promise<void> => {
    await MeasurementService.save(entry);
    setHistory(prev => {
      const idx = prev.findIndex(e => e.date === entry.date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const getByDate = useCallback(
    (date: string): MeasurementLatest | undefined => history.find(e => e.date === date),
    [history],
  );

  const remove = useCallback(async (date: string): Promise<void> => {
    await MeasurementService.delete(date);
    setHistory(prev => prev.filter(e => e.date !== date));
  }, []);

  return { history, loading, save, getByDate, remove };
}
