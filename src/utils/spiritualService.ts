// Stub — sera remplacé par le module Islam (Sprint islamique)
export const SpiritualService = {
  getPrayerTimes: (_lat?: number, _lon?: number) => ({
    next: 'Dhuhr',
    timeForNext: new Date(),
    times: {} as Record<string, string>,
  }),
  translatePrayer: (p: string): string => p,
  getQiblaAngle: (_lat?: number, _lon?: number): number => 0,
  generateZenSummary: (_entries?: unknown[], _kcal?: number, _tdee?: number): string =>
    'Données insuffisantes pour analyse.',
};
