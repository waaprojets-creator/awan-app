import { LocalDbService } from './localDbService';
import { ORSService } from './orsService';

/**
 * AWAN "Grand Genève" Map Service
 * Logique de recherche locale, confinement géographique et géocodage persistant.
 */

const GENEVA_CENTER = { lat: 46.2074, lon: 6.1559 };
const MAX_RADIUS_KM = 35; // Rayon de confinement

export const MapService = {
  /**
   * Vérifie si des coordonnées sont dans le périmètre du Grand Genève
   */
  isInPerimeter: (lat: number, lon: number) => {
    const dist = MapService.getDistance(lat, lon, GENEVA_CENTER.lat, GENEVA_CENTER.lon);
    return dist <= MAX_RADIUS_KM;
  },

  getDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  },

  /**
   * Géocodage avec cache local (Confidentialité)
   */
  geocode: async (address: string, apiKey?: string) => {
    // 1. Recherche dans le cache local
    const pois = LocalDbService.getPois();
    const cached = pois.find((p: any) => p.name.toLowerCase().includes(address.toLowerCase()));
    if (cached) return { lat: cached.lat, lon: cached.lon, cached: true };

    // 2. Recherche externe via ORS
    if (!apiKey) return null;

    try {
      const result = await ORSService.geocode(address, apiKey);
      if (result && MapService.isInPerimeter(result.lat, result.lon)) {
        // Enregistrement immédiat pour l'intraçabilité future
        LocalDbService.savePoi({ 
          id: Date.now().toString(), 
          name: address.toUpperCase(), 
          ...result, 
          category: 'CHANTIER',
          notes: '' 
        });
        return { ...result, cached: false };
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Filtrage des codes postaux régionaux
   */
  isRegionalZipCode: (zip: string) => {
    return zip.startsWith('12') || zip.startsWith('74') || zip.startsWith('01');
  }
};
