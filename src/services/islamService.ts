import { getStorage } from '@/data/storage/storageService';
import { migratePrayerLog, PRAYER_NAMES } from '@/data/schemas/islam/prayerLog';
import { migrateQuranProgress } from '@/data/schemas/islam/quranProgress';
import { migrateQuranSession } from '@/data/schemas/islam/quranSession';
import type { PrayerLogLatest, PrayerName } from '@/data/schemas/islam/prayerLog';
import type { QuranProgressLatest } from '@/data/schemas/islam/quranProgress';
import type { QuranSessionLatest, QuranWirdSlot } from '@/data/schemas/islam/quranSession';

const PRAYER_LOG_PREFIX     = 'islam.prayer';
const QURAN_KEY             = 'islam.quran.progress';
const QURAN_SESSIONS_PREFIX = 'islam.quran.sessions';

function prayerKey(date: string): string {
  return `${PRAYER_LOG_PREFIX}.${date}`;
}
function quranSessionsKey(date: string): string {
  return `${QURAN_SESSIONS_PREFIX}.${date}`;
}

function emptyPrayers(): Record<PrayerName, boolean> {
  return PRAYER_NAMES.reduce(
    (acc, p) => ({ ...acc, [p]: false }),
    {} as Record<PrayerName, boolean>,
  );
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

  /**
   * Toggle une prière et persiste. Crée le log du jour si absent.
   * `timeHHMM` = heure réelle saisie (optionnelle). Quand on dé-coche, l'heure est effacée.
   */
  async togglePrayer(
    date: string,
    prayer: PrayerName,
    id: string,
    timeHHMM?: string | null,
  ): Promise<PrayerLogLatest> {
    const existing = await this.getPrayerLog(date);
    const current = existing?.prayers ?? {};
    const nextDone = !current[prayer];
    const updatedTimes: Record<string, string | null> = { ...(existing?.prayerTimes ?? {}) };
    if (nextDone && timeHHMM != null) {
      updatedTimes[prayer] = timeHHMM;
    } else if (!nextDone) {
      updatedTimes[prayer] = null;
    }
    const updated: PrayerLogLatest = {
      v: 2,
      id: existing?.id ?? id,
      date,
      prayers: { ...emptyPrayers(), ...current, [prayer]: nextDone },
      prayerTimes: updatedTimes as Record<PrayerName, string | null>,
      savedAt: Date.now(),
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

  // ─── Coran : sessions fragmentées par date (Wird) ────────────────────────
  async getQuranSessions(date: string): Promise<QuranSessionLatest | null> {
    const storage = await getStorage();
    return storage.get(quranSessionsKey(date), migrateQuranSession);
  },

  async saveQuranSessions(sessions: QuranSessionLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(quranSessionsKey(sessions.date), sessions);
  },

  /**
   * Ajoute une session Wird à la date + avance le compteur global.
   */
  async addQuranSession(
    date: string,
    slot: QuranWirdSlot,
    id: string,
  ): Promise<{ sessions: QuranSessionLatest; progress: QuranProgressLatest }> {
    const existing = await this.getQuranSessions(date);
    const next: QuranSessionLatest = existing
      ? {
          ...existing,
          sessions: [...existing.sessions, slot].sort((a, b) =>
            a.timeHHMM.localeCompare(b.timeHHMM),
          ),
          updatedAt: Date.now(),
        }
      : {
          v: 1,
          id,
          date,
          sessions: [slot],
          updatedAt: Date.now(),
        };
    await this.saveQuranSessions(next);
    const progress = await this.advanceReading(slot.ayahsRead, id, date);
    return { sessions: next, progress };
  },
};
