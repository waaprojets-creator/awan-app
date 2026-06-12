import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../../src/data/storage/MemoryStorage';
import { _setStorageForTest } from '../../src/data/storage/storageService';
import { IslamService } from '../../src/services/islamService';
import { JournalService } from '../../src/services/journalService';
import type { QuranProgressLatest } from '../../src/data/schemas/islam/quranProgress';
import type { JournalEntryLatest } from '../../src/data/schemas/journal/journalEntry';

const DATE = '2026-05-10';
const UUID1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID2 = '550e8400-e29b-41d4-a716-446655440002';
const UUID3 = '550e8400-e29b-41d4-a716-446655440003';

const makeEntry = (id: string, date: string, content = 'Test', ts = Date.now()): JournalEntryLatest => ({
  v: 1,
  id,
  date,
  content,
  mood: 3,
  module: 'sport',
  tags: ['sport'],
  timestamp: ts,
});

describe('IslamService — prayer log', () => {
  beforeEach(() => {
    _setStorageForTest(new MemoryStorage());
  });

  it('getPrayerLog retourne null si aucune donnée', async () => {
    const log = await IslamService.getPrayerLog(DATE);
    expect(log).toBeNull();
  });

  it('togglePrayer crée un log et coche la prière', async () => {
    const log = await IslamService.togglePrayer(DATE, 'sobh');
    expect(log.prayers.sobh).toBe(true);
    expect(log.prayers.dhuhr).toBe(false);
    expect(log.date).toBe(DATE);
  });

  it('togglePrayer décoche une prière déjà cochée', async () => {
    await IslamService.togglePrayer(DATE, 'sobh');
    const log = await IslamService.togglePrayer(DATE, 'sobh');
    expect(log.prayers.sobh).toBe(false);
  });

  it('plusieurs prières indépendantes', async () => {
    await IslamService.togglePrayer(DATE, 'sobh');
    await IslamService.togglePrayer(DATE, 'dhuhr');
    const log = await IslamService.getPrayerLog(DATE);
    expect(log?.prayers.sobh).toBe(true);
    expect(log?.prayers.dhuhr).toBe(true);
    expect(log?.prayers.asr).toBe(false);
  });

  it('toggle ne touche pas aux prières des autres jours', async () => {
    await IslamService.togglePrayer(DATE, 'sobh');
    await IslamService.togglePrayer('2026-05-09', 'isha');
    const log = await IslamService.getPrayerLog(DATE);
    expect(log?.prayers.isha).toBe(false);
  });
});

describe('IslamService — quran progress', () => {
  beforeEach(() => {
    _setStorageForTest(new MemoryStorage());
  });

  it('getQuranProgress retourne null au départ', async () => {
    const p = await IslamService.getQuranProgress();
    expect(p).toBeNull();
  });

  it('advanceReading initialise et incrémente', async () => {
    const p = await IslamService.advanceReading(5, UUID1, DATE);
    expect(p.totalAyahsRead).toBe(5);
    expect(p.currentAyah).toBe(6);
    expect(p.lastReadDate).toBe(DATE);
  });

  it('advanceReading accumule les appels successifs', async () => {
    await IslamService.advanceReading(3, UUID1, DATE);
    const p = await IslamService.advanceReading(7, UUID1, DATE);
    expect(p.totalAyahsRead).toBe(10);
    expect(p.currentAyah).toBe(11);
  });

  it('saveQuranProgress et getQuranProgress fonctionnent', async () => {
    const progress: QuranProgressLatest = {
      v: 1,
      id: UUID1,
      currentSurah: 2,
      currentAyah: 42,
      dailyAyahTarget: 10,
      lastReadDate: DATE,
      totalAyahsRead: 200,
      updatedAt: Date.now(),
    };
    await IslamService.saveQuranProgress(progress);
    const loaded = await IslamService.getQuranProgress();
    expect(loaded?.currentSurah).toBe(2);
    expect(loaded?.currentAyah).toBe(42);
    expect(loaded?.totalAyahsRead).toBe(200);
  });
});

describe('JournalService', () => {
  beforeEach(() => {
    _setStorageForTest(new MemoryStorage());
  });

  it('getAll retourne tableau vide au départ', async () => {
    const entries = await JournalService.getAll();
    expect(entries).toHaveLength(0);
  });

  it('save et getByDate fonctionnent', async () => {
    const e = makeEntry(`${DATE}.1`, DATE);
    await JournalService.save(e);
    const result = await JournalService.getByDate(DATE);
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe('Test');
  });

  it('getByDate filtre par date', async () => {
    await JournalService.save(makeEntry(`${DATE}.1`, DATE, "Aujourd'hui"));
    await JournalService.save(makeEntry('2026-05-09.2', '2026-05-09', 'Hier'));
    const today = await JournalService.getByDate(DATE);
    expect(today).toHaveLength(1);
    expect(today[0]?.content).toBe("Aujourd'hui");
  });

  it('getAll retourne toutes les entrées triées par timestamp décroissant', async () => {
    const e1 = makeEntry(UUID1, DATE, 'First', 1000);
    const e2 = makeEntry(UUID2, DATE, 'Second', 2000);
    await JournalService.save(e1);
    await JournalService.save(e2);
    const all = await JournalService.getAll();
    expect(all[0]?.content).toBe('Second');
    expect(all[1]?.content).toBe('First');
  });

  it('delete supprime une entrée', async () => {
    const e = makeEntry(`${DATE}.1`, DATE);
    await JournalService.save(e);
    await JournalService.delete(`${DATE}.1`);
    const result = await JournalService.getByDate(DATE);
    expect(result).toHaveLength(0);
  });

  it('search filtre par contenu', () => {
    const entries: JournalEntryLatest[] = [
      makeEntry(UUID1, DATE, 'Séance de musculation intense'),
      makeEntry(UUID2, DATE, 'Méditation du matin'),
    ];
    const found = JournalService.search(entries, 'musculation');
    expect(found).toHaveLength(1);
    expect(found[0]?.content).toContain('musculation');
  });

  it('search filtre par tag', () => {
    const entries: JournalEntryLatest[] = [
      { ...makeEntry(UUID1, DATE), tags: ['islam', 'fajr'] },
      { ...makeEntry(UUID2, DATE), tags: ['sport'] },
    ];
    const found = JournalService.search(entries, 'fajr');
    expect(found).toHaveLength(1);
    expect(found[0]?.tags).toContain('fajr');
  });

  it('search insensible à la casse', () => {
    const entries: JournalEntryLatest[] = [
      makeEntry(UUID1, DATE, 'Alhamdulillah pour ce jour'),
      makeEntry(UUID2, DATE, 'Session sport'),
    ];
    const found = JournalService.search(entries, 'ALHAMDULILLAH');
    expect(found).toHaveLength(1);
  });
});
