/**
 * TREK Algorithm Core for AWAN
 * Algorithmes d'optimisation de trajets et de calculs temporels.
 */

export interface Location {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const TrekAlgorithms = {
  /**
   * Algorithme du Plus Proche Voisin (Nearest Neighbor) pour optimiser une route.
   * Simple et extrêmement léger pour mobile.
   */
  optimizeRoute: (start: Location, points: Location[]): Location[] => {
    let unvisited = [...points];
    let route: Location[] = [];
    let current = start;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = TrekAlgorithms.getDistance(current.lat, current.lon, unvisited[i].lat, unvisited[i].lon);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }

      current = unvisited[nearestIdx];
      route.push(current);
      unvisited.splice(nearestIdx, 1);
    }

    return route;
  },

  /**
   * Calcul de distance à vol d'oiseau (Haversine)
   */
  getDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Rayon de la Terre en km
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
   * Calcul du "Time to Leave" (Heure de départ maximale)
   * @param eventTime Heure du rendez-vous (Date object)
   * @param travelTimeMinutes Temps de trajet estimé par ORS
   * @param safetyMargin Minutage de sécurité supplémentaire (ex: 5 min)
   */
  calculateTimeToLeave: (eventTime: Date, travelTimeMinutes: number, safetyMargin = 5) => {
    const ttl = new Date(eventTime.getTime());
    ttl.setMinutes(ttl.getMinutes() - (travelTimeMinutes + safetyMargin));
    return ttl;
  },

  /**
   * Analyse des performances : Prévu vs Réel
   */
  analyzeEfficiency: (plannedMinutes: number, realMinutes: number) => {
    if (plannedMinutes === 0) return 100;
    const ratio = (realMinutes / plannedMinutes) * 100;
    return Math.max(0, 100 - (ratio - 100)); // Plus le score est proche de 100, plus on est efficace
  }
};
