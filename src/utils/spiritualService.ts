// Stub — sera remplacé par le module Islam (Sprint islamique)

/** Retourne un objet Date pour aujourd'hui à l'heure et minute indiquées. */
function todayAt(h: number, m: number): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

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

export const SpiritualService = {
  getPrayerTimes: (_lat?: number, _lon?: number): PrayerTimesResult => ({
    next: 'dhuhr',
    timeForNext: todayAt(12, 30),
    fajr:    todayAt(5,  15),
    sunrise: todayAt(6,  45),
    dhuhr:   todayAt(12, 30),
    asr:     todayAt(15, 45),
    maghrib: todayAt(19, 0),
    isha:    todayAt(20, 30),
  }),
  translatePrayer: (p: string): string => p,
  getQiblaAngle: (_lat?: number, _lon?: number): number => 0,
  generateZenSummary: (_entries?: unknown[], _kcal?: number, _tdee?: number): string =>
    'Données insuffisantes pour analyse.',
};
