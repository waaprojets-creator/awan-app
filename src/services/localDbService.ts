/**
 * AWAN Local Database Service
 * Refactored to use Zustand store to unify state and avoid localStorage desync issues.
 */
import { useAppStore } from '../store/appStore';

export const LocalDbService = {
  /**
   * Sauvegarde les données et signale le changement via Zustand
   */
  save: (data: any) => {
    // on appelle la méthode updateDb pour s'assurer que c'est bien persistant
    useAppStore.getState().updateDb(data);
  },
  load: () => {
    return useAppStore.getState().db || { pois: [], logs: [], metrics: { history: [] } };
  },

  /**
   * Gestion des POI (Points d'Intérêt)
   */
  savePoi: (poi: any) => {
    const db = LocalDbService.load();
    if (!db.pois) db.pois = [];
    const index = db.pois.findIndex((p: any) => p.id === poi.id);
    if (index > -1) db.pois[index] = { ...db.pois[index], ...poi };
    else db.pois.push({ ...poi, notes: '' });
    LocalDbService.save(db);
  },

  /**
   * Purge automatique des logs (Délai 24h)
   */
  autoPurge: () => {
    const db = LocalDbService.load();
    if (!db || !db.logs) return;
    const ONEDAY = 24 * 3600 * 1000;
    const now = Date.now();
    // Only save if items were removed
    const filteredLogs = db.logs.filter((log: any) => (now - log.timestamp) < ONEDAY);
    if (filteredLogs.length !== db.logs.length) {
      db.logs = filteredLogs;
      LocalDbService.save(db);
    }
  },

  purgeLogs: () => {
    const db = LocalDbService.load();
    if (db) {
      db.logs = [];
      LocalDbService.save(db);
    }
  },

  purgeAll: () => {
    const db = LocalDbService.load();
    if (db) {
      db.logs = [];
      db.pois = [];
      db.lastPos = null;
      LocalDbService.save(db);
    }
  },

  getPois: () => {
    const db = LocalDbService.load();
    return db?.pois || [];
  },

  /**
   * Dernière position connue
   */
  saveLastPos: (pos: { lat: number, lon: number }) => {
    const db = LocalDbService.load();
    db.lastPos = pos;
    LocalDbService.save(db);
  },

  getLastPos: () => {
    const db = LocalDbService.load();
    return db?.lastPos || { lat: 46.2074, lon: 6.1559 }; // Par défaut Genève
  },

  /**
   * Tracking du temps par tâche
   */
  logTime: (taskId: string, durationMs: number) => {
    const db = LocalDbService.load();
    if (!db.logs) db.logs = [];
    db.logs.push({
      taskId,
      durationMs,
      timestamp: Date.now()
    });
    LocalDbService.save(db);
  },

  /**
   * MENSURATIONS (WGER COMPATIBLE)
   */
  loadMetrics: () => {
    const db = LocalDbService.load();
    return db?.metrics || { history: [] };
  },
  saveMetricEntry: (entry: any) => {
    const db = LocalDbService.load();
    if (!db.metrics) db.metrics = { history: [] };
    
    const index = db.metrics.history.findIndex((h: any) => h.date === entry.date);
    if (index > -1) {
       db.metrics.history[index] = { ...db.metrics.history[index], ...entry };
    } else {
       db.metrics.history.push(entry);
    }
    
    LocalDbService.save(db);
  }
};
