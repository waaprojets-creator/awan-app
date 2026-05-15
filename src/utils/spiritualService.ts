import { Coordinates, PrayerTimes, CalculationMethod, Qibla } from 'adhan';

export type PrayerTimesResult = {
  next: string;
  timeForNext: Date;
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
};

const PRAYER_FR: Record<string, string> = {
  fajr:    'FAJR',
  sunrise: 'CHOUROUK',
  dhuhr:   'DHOHR',
  asr:     'ASR',
  maghrib: 'MAGHRIB',
  isha:    'ICHAA',
  none:    'FAJR',
};

function fallbackTimes(): PrayerTimesResult {
  const d = new Date();
  const at = (h: number, m: number) => { const r = new Date(d); r.setHours(h, m, 0, 0); return r; };
  return {
    next: 'dhuhr', timeForNext: at(12, 30),
    fajr: at(5, 15), sunrise: at(6, 45), dhuhr: at(12, 30),
    asr: at(15, 45), maghrib: at(19, 0), isha: at(20, 30),
  };
}

export const SpiritualService = {
  getCachedLocation(): { lat: number; lon: number } {
    try {
      const s = localStorage.getItem('awan.user.location');
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return { lat: 48.8566, lon: 2.3522 };
  },

  getPrayerTimes(lat?: number, lon?: number): PrayerTimesResult {
    try {
      const loc = lat != null && lon != null ? { lat, lon } : this.getCachedLocation();
      const coords = new Coordinates(loc.lat, loc.lon);
      const params = CalculationMethod.MuslimWorldLeague();
      const t = new PrayerTimes(coords, new Date(), params);
      const next = t.nextPrayer() ?? 'none';
      const nextDate = t.timeForPrayer(next as any) ?? t.fajr;
      return {
        next: next === 'none' ? 'fajr' : next,
        timeForNext: nextDate,
        fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr,
        asr: t.asr, maghrib: t.maghrib, isha: t.isha,
      };
    } catch {
      return fallbackTimes();
    }
  },

  translatePrayer(p: string): string {
    return PRAYER_FR[p] ?? p.toUpperCase();
  },

  getQiblaAngle(lat?: number, lon?: number): number {
    try {
      const loc = lat != null && lon != null ? { lat, lon } : this.getCachedLocation();
      const coords = new Coordinates(loc.lat, loc.lon);
      return Qibla(coords);
    } catch {
      return 119; // Paris fallback bearing toward Mecca
    }
  },
};
