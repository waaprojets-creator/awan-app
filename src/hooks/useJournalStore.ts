import { useState, useEffect, useCallback } from 'react';
import { JournalService } from '@/services/journalService';
import type { JournalEntryLatest } from '@/data/schemas/journal/journalEntry';

export function useJournalStore(date?: string) {
  const [entries, setEntries] = useState<JournalEntryLatest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetch = date ? JournalService.getByDate(date) : JournalService.getAll();
    fetch.then(es => {
      if (active) { setEntries(es); setLoading(false); }
    });
    return () => { active = false; };
  }, [date]);

  const save = useCallback(async (entry: JournalEntryLatest): Promise<void> => {
    await JournalService.save(entry);
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return date
        ? [...prev, entry].sort((a, b) => a.timestamp - b.timestamp)
        : [entry, ...prev];
    });
  }, [date]);

  const remove = useCallback(async (id: string): Promise<void> => {
    await JournalService.delete(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return { entries, loading, save, remove };
}
