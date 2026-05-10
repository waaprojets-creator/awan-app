/**
 * AWAN "Intraçable" GPS Logic
 * Calculs de trajets 100% locaux sans dépendance cloud.
 */

export interface CongestionZone {
  id: string;
  lat: number;
  lon: number;
  radius: number; // en km
  multiplier: number;
}

export type TransportMode = 'car' | 'moto' | 'bike' | 'walk' | 'transit';

export const JIT_DEFAULT_FACTOR = 30; // 30x la durée du trajet

export const GENEVA_CENTER = { lat: 46.2044, lon: 6.1432 };
export const MAX_RADIUS_KM = 30;

export const GPSLogicService = {
  /**
   * Vérifie si une position est dans le périmètre du Grand Genève
   */
  isInPerimeter: (lat: number, lon: number) => {
    const dist = GPSLogicService.getDistance(lat, lon, GENEVA_CENTER.lat, GENEVA_CENTER.lon);
    return dist <= MAX_RADIUS_KM;
  },

  /**
   * Priorise les codes postaux locaux (12xx pour GE, 74xxx pour FR)
   */
  isLocalPostalCode: (code: string) => {
    return code.startsWith('12') || code.startsWith('74');
  },
  /**
   * Calcul de distance Haversine (km)
   */
  getDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  /**
   * Applique les coefficients de congestion temporels
   */
  getTemporalMultiplier: (date: Date, mode: TransportMode) => {
    // Seuls Voiture et Moto sont sensibles au trafic
    if (mode !== 'car' && mode !== 'moto') return 1.0;

    const hours = date.getHours();
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;

    // Heures de pointe (8h-9h et 17h-18h)
    if (!isWeekend && ((hours >= 8 && hours < 9) || (hours >= 17 && hours < 18))) {
      return 1.6;
    }

    // Nuit ou Weekend
    if (hours >= 22 || hours < 6 || isWeekend) {
      return 1.0;
    }

    return 1.2; // Standard journée
  },

  /**
   * Calcule le temps de trajet estimé (Minutes)
   * @param distance Distance en km
   * @param mode TransportMode
   */
  estimateTravelTime: (distance: number, date: Date, mode: TransportMode = 'car') => {
    let speed = 35;
    let prep = 0;
    switch (mode) {
      case 'car': speed = 40; break;
      case 'moto': speed = 50; break;
      case 'bike': speed = 18; prep = 5; break;
      case 'walk': speed = 5; prep = 5; break;
      case 'transit': speed = 25; break;
    }
    return Math.ceil((distance / speed) * 60 * GPSLogicService.getTemporalMultiplier(date, mode)) + prep;
  },

  /**
   * Vérifie si un point est dans une zone de bouchons définie par l'utilisateur
   */
  isPointInCongestion: (lat: number, lon: number, zones: CongestionZone[]) => {
    return zones.some(zone => {
      const dist = GPSLogicService.getDistance(lat, lon, zone.lat, zone.lon);
      return dist <= zone.radius;
    });
  },

  /**
   * Logique JIT: Détermine si on doit utiliser l'API ou l'estimation Locale
   */
  shouldUseAPI: (departureTime: Date, estimatedDurationMin: number, factor: number) => {
    const thresholdMs = estimatedDurationMin * 60 * 1000 * factor;
    return (departureTime.getTime() - Date.now()) < thresholdMs;
  }
};
