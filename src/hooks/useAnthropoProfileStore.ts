import { useState, useEffect, useCallback } from 'react';
import { AnthropoProfileService } from '@/services/anthropoProfileService';
import type { AnthropoProfileLatest } from '@/data/schemas/anthropo/userProfile';
import { useAppStore } from '@/data/store/appStore';
import { DbFullError } from '@/data/storage/IStorage';
import { dbFullBus } from '@/utils/dbFullBus';

function dispatchDbFull() { dbFullBus.emit(); }

export function useAnthropoProfileStore() {
  const [profiles, setProfiles] = useState<AnthropoProfileLatest[]>([]);
  const [loading, setLoading] = useState(true);

  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    AnthropoProfileService.getAll().then(all => {
      if (active) { setProfiles(all); setLoading(false); }
    });
    return () => { active = false; };
  }, [dataVersion]);

  const latest = profiles[0] ?? null;

  const save = useCallback(async (entry: AnthropoProfileLatest): Promise<void> => {
    try {
      await AnthropoProfileService.save(entry);
      setProfiles(prev => {
        const idx = prev.findIndex(e => e.date === entry.date);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next.sort((a, b) => b.date.localeCompare(a.date));
        }
        return [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date));
      });
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, []);

  const remove = useCallback(async (date: string): Promise<void> => {
    await AnthropoProfileService.delete(date);
    setProfiles(prev => prev.filter(e => e.date !== date));
  }, []);

  return { profiles, latest, loading, save, remove };
}
