// @ts-nocheck
export const SpiritualService = {
  getPrayerTimes: () => ({ next: 'Dhuhr', timeForNext: new Date(), times: {} }),
  translatePrayer: (p: string) => p,
};
