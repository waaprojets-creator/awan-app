import { getStorage } from '@/data/storage/storageService';
import { migrateJournalEntry } from '@/data/schemas/journal/journalEntry';
import type { JournalEntryLatest } from '@/data/schemas/journal/journalEntry';

const JOURNAL_PREFIX = 'journal.entry';

export const JournalService = {
  async getByDate(date: string): Promise<JournalEntryLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(JOURNAL_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateJournalEntry)));
    return all
      .filter((e): e is JournalEntryLatest => e !== null && e.date === date)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  async getAll(): Promise<JournalEntryLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(JOURNAL_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateJournalEntry)));
    return all
      .filter((e): e is JournalEntryLatest => e !== null)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  async save(entry: JournalEntryLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(`${JOURNAL_PREFIX}.${entry.id}`, entry);
  },

  async delete(id: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(`${JOURNAL_PREFIX}.${id}`);
  },

  search(entries: JournalEntryLatest[], query: string): JournalEntryLatest[] {
    const q = query.toLowerCase();
    return entries.filter(
      e => e.content.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q)),
    );
  },
};
