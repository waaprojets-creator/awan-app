import { useState, useEffect, useCallback } from 'react';
import { IslamService } from '@/services/islamService';
import { dateId } from '@/utils/storage';
import type { QuranSessionLatest } from '@/data/schemas/islam/quranSession';

interface WirdSlot { timeHHMM: string; ayahsRead: number }

export function useQuranSessionStore(date: string) {
  const [rawSessions, setRawSessions] = useState<QuranSessionLatest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    IslamService.getQuranSessionsByDate(date).then(s => {
      if (active) { setRawSessions(s); setLoading(false); }
    });
    return () => { active = false; };
  }, [date]);

  const add = useCallback(async (slot: WirdSlot): Promise<void> => {
    const session: QuranSessionLatest = {
      v: 1,
      id: dateId(date),
      date,
      ayahsRead: slot.ayahsRead,
      surahStart: 1,
      ayahStart: 1,
      timestamp: Date.now(),
      sessions: [{ timeHHMM: slot.timeHHMM, ayahsRead: slot.ayahsRead }],
    };
    await IslamService.addQuranSession(session);
    setRawSessions(prev => [...prev, session].sort((a, b) => a.timestamp - b.timestamp));
  }, [date]);

  const sessions = rawSessions.map(s => ({
    timeHHMM: s.sessions?.[0]?.timeHHMM ?? new Date(s.timestamp).toTimeString().slice(0, 5),
    ayahsRead: s.ayahsRead,
  }));

  const totalAyahs = sessions.reduce((acc, s) => acc + s.ayahsRead, 0);
  const count = sessions.length;

  return { sessions, loading, add, totalAyahs, count };
}
