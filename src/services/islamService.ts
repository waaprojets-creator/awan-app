import { getStorage } from '@/data/storage/storageService';
import {
  migratePrayerLog,
  PRAYER_NAMES_V2,
  FARD_PRAYERS,
  computePrayerScores,
} from '@/data/schemas/islam/prayerLog';
import { migrateQuranProgress } from '@/data/schemas/islam/quranProgress';
import { migrateQuranSession } from '@/data/schemas/islam/quranSession';
import type { PrayerLogLatest, PrayerNameV2 } from '@/data/schemas/islam/prayerLog';
import type { QuranProgressLatest } from '@/data/schemas/islam/quranProgress';
import type { QuranSessionLatest } from '@/data/schemas/islam/quranSession';

const PRAYER_LOG_PREFIX = 'islam.prayer';
const QURAN_KEY = 'islam.quran.progress';
const QURAN_SESSION_PREFIX = 'islam.quran.session';

function prayerKey(date: string): string {
  return `${PRAYER_LOG_PREFIX}.${date}`;
}

// Clé : islam.quran.session.{YYYY-MM-DD}.{ms}  (id = dateId)
function quranSessionKey(session: QuranSessionLatest): string {
  return `${QURAN_SESSION_PREFIX}.${session.id}`;
}

export const IslamService = {
  // ─── Prières ─────────────────────────────────────────────────────────────
  async getPrayerLog(date: string): Promise<PrayerLogLatest | null> {
    const storage = await getStorage();
    return storage.get(prayerKey(date), migratePrayerLog);
  },

  async savePrayerLog(log: PrayerLogLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(prayerKey(log.date), log);
  },

  /** Toggle une prière et persiste. Crée le log du jour si absent. */
  async togglePrayer(
    date: string,
    prayer: PrayerNameV2,
    timeHHMM?: string,
  ): Promise<PrayerLogLatest> {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const existing = await this.getPrayerLog(date);
    const currentPrayers = existing?.prayers ?? {};

    const prayers: Record<PrayerNameV2, boolean> = {
      ...PRAYER_NAMES_V2.reduce(
        (acc, p) => ({ ...acc, [p]: false }),
        {} as Record<PrayerNameV2, boolean>,
      ),
      ...currentPrayers,
      [prayer]: !currentPrayers[prayer],
    };

    const prayerTimes = timeHHMM
      ? { ...(existing?.prayerTimes ?? {}), [prayer]: timeHHMM }
      : existing?.prayerTimes;

    const updated: PrayerLogLatest = {
      v: 2,
      timezone: existing?.timezone ?? timezone,
      date,
      prayers,
      savedAt: Date.now(),
      ...computePrayerScores(prayers),
      ...(prayerTimes ? { prayerTimes } : {}),
    };

    await this.savePrayerLog(updated);
    return updated;
  },

  // ─── Coran : avancement global ───────────────────────────────────────────
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
      currentAyah: Math.max(1, prev.currentAyah + ayahsRead),
      totalAyahsRead: Math.max(0, prev.totalAyahsRead + ayahsRead),
      lastReadDate: date,
      updatedAt: Date.now(),
    };
    await this.saveQuranProgress(next);
    return next;
  },

  // ─── Sessions de lecture Coran ────────────────────────────────────────────

  async addQuranSession(session: QuranSessionLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(quranSessionKey(session), session);
    // Mettre à jour le progress singleton
    const progress = await this.getQuranProgress();
    if (progress) {
      await this.saveQuranProgress({
        ...progress,
        totalAyahsRead: progress.totalAyahsRead + session.ayahsRead,
        lastReadDate: session.date,
        updatedAt: Date.now(),
      });
    }
  },

  async getQuranSessionsByDate(date: string): Promise<QuranSessionLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(`${QURAN_SESSION_PREFIX}.${date}`);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateQuranSession)));
    return all
      .filter((s): s is QuranSessionLatest => s !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  async getQuranSessionsByDateRange(from: string, to: string): Promise<QuranSessionLatest[]> {
    const storage = await getStorage();
    const keys = await storage.listByPrefix(QURAN_SESSION_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateQuranSession)));
    return all
      .filter((s): s is QuranSessionLatest => s !== null && s.date >= from && s.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getPrayerLogsByDateRange(from: string, to: string): Promise<PrayerLogLatest[]> {
    const storage = await getStorage();
    const keys = await storage.listByPrefix(PRAYER_LOG_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migratePrayerLog)));
    return all
      .filter((l): l is PrayerLogLatest => l !== null && l.date >= from && l.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
  },
};
