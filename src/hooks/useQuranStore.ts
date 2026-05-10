import { useState, useEffect, useCallback } from 'react';
import { IslamService } from '@/services/islamService';
import { uid, ds } from '@/utils/storage';
import type { QuranProgressLatest } from '@/data/schemas/islam/quranProgress';

export function useQuranStore() {
  const [progress, setProgress] = useState<QuranProgressLatest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    IslamService.getQuranProgress().then(p => {
      if (active) { setProgress(p); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  const advance = useCallback(async (ayahsRead: number): Promise<void> => {
    const updated = await IslamService.advanceReading(ayahsRead, uid(), ds(new Date()));
    setProgress(updated);
  }, []);

  const setTarget = useCallback(async (target: number): Promise<void> => {
    const existing = progress ?? {
      v: 1 as const,
      id: uid(),
      currentSurah: 1,
      currentAyah: 1,
      dailyAyahTarget: target,
      lastReadDate: ds(new Date()),
      totalAyahsRead: 0,
      updatedAt: Date.now(),
    };
    const updated: QuranProgressLatest = { ...existing, dailyAyahTarget: target, updatedAt: Date.now() };
    await IslamService.saveQuranProgress(updated);
    setProgress(updated);
  }, [progress]);

  const setSurah = useCallback(async (surah: number, ayah: number): Promise<void> => {
    const existing = progress ?? {
      v: 1 as const,
      id: uid(),
      currentSurah: surah,
      currentAyah: ayah,
      dailyAyahTarget: 10,
      lastReadDate: ds(new Date()),
      totalAyahsRead: 0,
      updatedAt: Date.now(),
    };
    const updated: QuranProgressLatest = { ...existing, currentSurah: surah, currentAyah: ayah, updatedAt: Date.now() };
    await IslamService.saveQuranProgress(updated);
    setProgress(updated);
  }, [progress]);

  return { progress, loading, advance, setTarget, setSurah };
}
