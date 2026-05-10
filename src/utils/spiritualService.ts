import { Coordinates, CalculationMethod, PrayerTimes, SunnahTimes, Qibla, HighLatitudeRule } from 'adhan';
import { LocalDbService } from '../services/localDbService';

/**
 * AWAN Spiritual & Logic Service
 * Centralise les calculs religieux basés sur la position de l'onglet Trajet.
 */
export const SpiritualService = {
  /**
   * Récupère les horaires de prière basés sur la dernière position connue
   */
  getPrayerTimes: () => {
    const lastPos = LocalDbService.getLastPos() || { lat: 46.2044, lon: 6.1432 }; // Défaut Genève
    const coords = new Coordinates(lastPos.lat, lastPos.lon);
    
    // Paramétrage : Monde Musulman par défaut ou personnalisé
    const params = CalculationMethod.MuslimWorldLeague();
    params.highLatitudeRule = HighLatitudeRule.recommended(coords);
    
    const date = new Date();
    const prayerTimes = new PrayerTimes(coords, date, params);
    
    return {
      fajr: prayerTimes.fajr,
      sunrise: prayerTimes.sunrise,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha,
      current: prayerTimes.currentPrayer(),
      next: prayerTimes.nextPrayer(),
      timeForNext: prayerTimes.timeForPrayer(prayerTimes.nextPrayer())
    };
  },

  /**
   * Calcule l'angle de la Qibla
   */
  getQiblaAngle: () => {
    const lastPos = LocalDbService.getLastPos() || { lat: 46.2044, lon: 6.1432 };
    const coords = new Coordinates(lastPos.lat, lastPos.lon);
    return Qibla(coords);
  },

  /**
   * Traduit le nom de la prière pour l'UI
   */
  translatePrayer: (p: string) => {
    const map: Record<string, string> = {
      fajr: 'FAJR',
      sunrise: 'CHOUROUQ',
      dhuhr: 'DHUHR',
      asr: 'ASR',
      maghrib: 'MAGHRIB',
      isha: 'ISHA',
      none: 'ATTENTE'
    };
    return map[p] || p.toUpperCase();
  }
};
