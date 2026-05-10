import { CacheService } from './cacheService';

/**
 * AWAN OpenRouteService Integration
 * Utilisé pour les prévisions de transport dynamiques et le calcul d'itinéraires optimisés.
 */

const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions';

export interface RouteStats {
  distance: number; // en mètres
  duration: number; // en secondes
  geometry: string; // polyline
}

export const ORSService = {
  /**
   * Calcule le trajet entre plusieurs points ou deux points
   */
  getRoute: async (points: [number, number][], apiKey: string, profile = 'driving-car'): Promise<RouteStats | null> => {
    if (!apiKey || points.length < 2) {
      console.warn('ORS API Key manquante ou points insuffisants.');
      return null;
    }

    const cacheKey = `route_${profile}_${apiKey.substring(0, 5)}_${points.map(p => p.join(',')).join('|')}`;
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${ORS_BASE_URL}/${profile}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify({
          coordinates: points
        })
      });

      if (!response.ok) throw new Error('Erreur API ORS');

      const data = await response.json();
      const route = data.routes[0];
      
      const stats: RouteStats = {
        distance: route.summary.distance,
        duration: route.summary.duration,
        geometry: route.geometry
      };

      // Cache pour 4 heures
      CacheService.set(cacheKey, stats, 14400000);
      
      return stats;
    } catch (error) {
      console.error('Erreur ORSService:', error);
      return null;
    }
  },

  /**
   * Géocode une adresse via ORS
   */
  geocode: async (text: string, apiKey: string) => {
    if (!apiKey) return { features: [] };
    try {
      const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(text)}&size=5`;
      const resp = await fetch(url);
      if (!resp.ok) return { features: [] };
      const data = await resp.json();
      return data;
    } catch (e) {
      return { features: [] };
    }
  },

  /**
   * Estime le temps de trajet avec une marge de sécurité
   */
  getTTE: async (startLat: number, startLon: number, endLat: number, endLon: number, apiKey: string) => {
    const route = await ORSService.getRoute([[startLon, startLat], [endLon, endLat]], apiKey);
    if (!route) return null;
    
    // Ajout d'une marge de sécurité de 15% pour le trafic imprévu
    return Math.ceil((route.duration * 1.15) / 60); 
  }
};
