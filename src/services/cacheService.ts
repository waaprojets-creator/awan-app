/**
 * AWAN Cache Service
 * Gère le stockage local pour économiser les ressources et accélérer l'accès aux données GPS/Trajets.
 */

const CACHE_PREFIX = 'AWAN_CACHE_';
const DEFAULT_TTL = 3600000; // 1 heure par défaut

export const CacheService = {
  /**
   * Enregistre une donnée dans le cache
   */
  set: (key: string, data: any, ttl = DEFAULT_TTL) => {
    const entry = {
      data,
      expiry: Date.now() + ttl,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  },

  /**
   * Récupère une donnée du cache si elle est encore valide
   */
  get: (key: string) => {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    try {
      const entry = JSON.parse(raw);
      if (Date.now() > entry.expiry) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return entry.data;
    } catch (e) {
      return null;
    }
  },

  /**
   * Nettoie le cache expiré
   */
  gc: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const entry = JSON.parse(raw);
            if (Date.now() > entry.expiry) {
              localStorage.removeItem(key);
            }
          } catch (e) { /* silent fail */ }
        }
      }
    });
  }
};
