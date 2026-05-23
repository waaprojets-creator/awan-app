import { useState, useEffect, useCallback } from 'react';
import { IslamService } from '@/services/islamService';
import { uid } from '@/utils/storage';
import type { QuranSessionLatest, QuranWirdSlot } from '@/data/schemas/islam/quranSession';

export function useQuranSessionStore(date: string) {
  const [sessions, setSessions] = useState<QuranSessionLatest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    IslamService.getQuranSessions(date).then(s => {
      if (active) { setSessions(s); setLoading(false); }
    });
    return () => { active = false; };
  }, [date]);

  const add = useCallback(async (slot: QuranWirdSlot): Promise<void> => {
    const { sessions: next } = await IslamService.addQuranSession(date, slot, uid());
    setSessions(next);
  }, [date]);

  const totalAyahs = sessions?.sessions.reduce((acc, s) => acc + s.ayahsRead, 0) ?? 0;
  const count      = sessions?.sessions.length ?? 0;

  return { sessions: sessions?.sessions ?? [], loading, add, totalAyahs, count };
}
