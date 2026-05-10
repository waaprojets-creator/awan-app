import { getStorage } from '@/data/storage/storageService';
import { migratePrayerLog, PRAYER_NAMES } from '@/data/schemas/islam/prayerLog';
import { migrateQuranProgress } from '@/data/schemas/islam/quranProgress';
import type { PrayerLogLatest, PrayerName } from '@/data/schemas/islam/prayerLog';
import type { QuranProgressLatest } from '@/data/schemas/islam/quranProgress';

const PRAYER_LOG_PREFIX = 'islam.prayer';
const QURAN_KEY = 'islam.quran.progress';

function prayerKey(date: string): string {
  return `${PRAYER_LOG_PREFIX}.${date}`;
}

export const IslamService = {
  async getPrayerLog(date: string): Promise<PrayerLogLatest | null> {
    const storage = await getStorage();
    return storage.get(prayerKey(date), migratePrayerLog);
  },

  async savePrayerLog(log: PrayerLogLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(prayerKey(log.date), log);
  },

  /** Toggle une prière et persiste. Crée le log du jour si absent. */
  async togglePrayer(date: string, prayer: PrayerName, id: string): Promise<PrayerLogLatest> {
    const existing = await this.getPrayerLog(date);
    const current = existing?.prayers ?? {};
    const updated: PrayerLogLatest = {
      v: 1,
      id: existing?.id ?? id,
      date,
      prayers: { ...PRAYER_NAMES.reduce((acc, p) => ({ ...acc, [p]: false }), {} as Record<PrayerName, boolean>), ...current, [prayer]: !current[prayer] },
      savedAt: Date.now(),
    };
    await this.savePrayerLog(updated);
    return updated;
  },

  async getQuranProgress(): Promise<QuranProgressLatest | null> {
    const storage = await getStorage();
    return storage.get(QURAN_KEY, migrateQuranProgress);
  },

  async saveQuranProgress(progress: QuranProgressLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(QURAN_KEY, progress);
  },

  /** Avance la lecture par N ayahs et met à jour la date. */
  async advanceReading(ayahsRead: number, id: string, date: string): Promise<QuranProgressLatest> {
    const existing = await this.getQuranProgress();
    const prev = existing ?? {
      v: 1 as const,
      id,
      currentSurah: 1,
      currentAyah: 1,
      dailyAyahTarget: 10,
      lastReadDate: date,
      totalAyahsRead: 0,
      updatedAt: Date.now(),
    };
    const next: QuranProgressLatest = {
      ...prev,
      currentAyah: prev.currentAyah + ayahsRead,
      totalAyahsRead: prev.totalAyahsRead + ayahsRead,
      lastReadDate: date,
      updatedAt: Date.now(),
    };
    await this.saveQuranProgress(next);
    return next;
  },
};
