import { useState, useEffect, useCallback } from 'react';
import { MeasurementService } from '@/services/measurementService';
import type { MeasurementLatest } from '@/data/schemas/anthropo/measurement';
import { useAppStore } from '@/data/store/appStore';
import { DbFullError } from '@/data/storage/IStorage';
import { dbFullBus } from '@/utils/dbFullBus';
import { eventBus } from '@/data/events/bus';

function dispatchDbFull() { dbFullBus.emit(); }

export function useMeasurementStore() {
  const [history, setHistory] = useState<MeasurementLatest[]>([]);
  const [loading, setLoading] = useState(true);
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    MeasurementService.getAll().then(entries => {
      if (active) { setHistory(entries); setLoading(false); }
    });
    return () => { active = false; };
  }, [dataVersion]);

  const save = useCallback(async (entry: MeasurementLatest): Promise<void> => {
    try {
      await MeasurementService.save(entry);
      eventBus.emit('measurement.recorded', { measurementId: entry.id, date: entry.date });
      setHistory(prev => {
        const idx = prev.findIndex(e => e.date === entry.date);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry].sort((a, b) => a.date.localeCompare(b.date));
      });
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
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
