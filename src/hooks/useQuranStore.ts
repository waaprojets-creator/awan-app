import { useState, useEffect, useCallback } from 'react';
import { IslamService } from '@/services/islamService';
import { uid, ds } from '@/utils/storage';
import type { QuranProgressLatest } from '@/data/schemas/islam/quranProgress';
import type { QuranSessionLatest } from '@/data/schemas/islam/quranSession';

export function useQuranStore() {
  const [progress, setProgress] = useState<QuranProgressLatest | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<QuranSessionLatest[]>([]);

  const today = ds(new Date());

  useEffect(() => {
    let active = true;
    Promise.all([
      IslamService.getQuranProgress(),
      IslamService.getQuranSessionsByDate(today),
    ]).then(([p, s]) => {
      if (active) { setProgress(p); setSessions(s); setLoading(false); }
    });
    return () => { active = false; };
  }, [today]);

  const advance = useCallback(async (ayahsRead: number): Promise<void> => {
    const updated = await IslamService.advanceReading(ayahsRead, uid(), today);
    setProgress(updated);
  }, [today]);

  const addSession = useCallback(async (ayahsRead: number, surahStart: number, ayahStart: number, timeHHMM: string): Promise<void> => {
    const [hh, mm] = timeHHMM.split(':').map(Number);
    const ts = new Date();
    ts.setHours(hh ?? ts.getHours(), mm ?? ts.getMinutes(), 0, 0);
    const session: QuranSessionLatest = {
      v: 1,
      id: uid(),
      date: today,
      ayahsRead,
      surahStart,
      ayahStart,
      timestamp: ts.getTime(),
    };
    await IslamService.addQuranSession(session);
    setSessions(prev => [...prev, session].sort((a, b) => a.timestamp - b.timestamp));
    // Also advance the reading counter
    const updated = await IslamService.advanceReading(ayahsRead, uid(), today);
    setProgress(updated);
  }, [today]);

  const setTarget = useCallback(async (target: number): Promise<void> => {
    const existing = progress ?? {
      v: 1 as const,
      id: uid(),
      currentSurah: 1,
      currentAyah: 1,
      dailyAyahTarget: target,
      lastReadDate: today,
      totalAyahsRead: 0,
      updatedAt: Date.now(),
    };
    const updated: QuranProgressLatest = { ...existing, dailyAyahTarget: target, updatedAt: Date.now() };
    await IslamService.saveQuranProgress(updated);
    setProgress(updated);
  }, [progress, today]);

  const setSurah = useCallback(async (surah: number, ayah: number): Promise<void> => {
    const existing = progress ?? {
      v: 1 as const,
      id: uid(),
      currentSurah: surah,
      currentAyah: ayah,
      dailyAyahTarget: 10,
      lastReadDate: today,
      totalAyahsRead: 0,
      updatedAt: Date.now(),
    };
    const updated: QuranProgressLatest = { ...existing, currentSurah: surah, currentAyah: ayah, updatedAt: Date.now() };
    await IslamService.saveQuranProgress(updated);
    setProgress(updated);
  }, [progress, today]);

  return { progress, sessions, loading, advance, addSession, setTarget, setSurah };
}
