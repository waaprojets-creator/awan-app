import { LocalDbService } from './localDbService';

/**
 * AWAN BIOMETRICS ENGINE (WGER INSPIRED)
 * Logicielle de calcul de masse grasse et suivi anthropométrique local.
 */
export const BiometricsService = {
  /**
   * Calcul du Body Fat % (Méthode Siri)
   * Formula: (495 / BD) - 450
   */
  calculateBF: (density: number) => {
    if (density <= 0) return 0;
    return (495 / density) - 450;
  },

  /**
   * Jackson-Pollock 3 sites (Homme)
   * Sites: Chest, Abdomen, Thigh
   */
  jacksonPollock3Men: (chest: number, abdomen: number, thigh: number, age: number) => {
    const sum = chest + abdomen + thigh;
    const density = 1.10938 - (0.0008267 * sum) + (0.0000016 * Math.pow(sum, 2)) - (0.0002574 * age);
    return BiometricsService.calculateBF(density);
  },

  /**
   * Jackson-Pollock 3 sites (Femme)
   * Sites: Triceps, Suprailiac, Thigh
   */
  jacksonPollock3Women: (triceps: number, suprailiac: number, thigh: number, age: number) => {
    const sum = triceps + suprailiac + thigh;
    const density = 1.0994921 - (0.0009929 * sum) + (0.0000023 * Math.pow(sum, 2)) - (0.0001392 * age);
    return BiometricsService.calculateBF(density);
  },

  /**
   * Jackson-Pollock 7 sites
   * sum = Chest + Axilla + Triceps + Subscapular + Abdomen + Suprailiac + Thigh
   */
  jacksonPollock7Men: (sum: number, age: number) => {
    const density = 1.112 - (0.00043499 * sum) + (0.00000055 * Math.pow(sum, 2)) - (0.00028826 * age);
    return BiometricsService.calculateBF(density);
  },

  saveMetrics: async (data: any) => {
    const db = LocalDbService.load();
    const history = db.biometrics || [];
    const entry = {
      date: new Date().toISOString().split('T')[0],
      ...data,
      id: Date.now().toString()
    };
    
    // Remplacer si même date, sinon ajouter
    const newHistory = [...history.filter((h: any) => h.date !== entry.date), entry];
    const metrics = { ...db.metrics, history: newHistory };
    await LocalDbService.save({ ...db, metrics });

    // Sync to metrics.json if reachable
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics)
      });
    } catch (e) {
      console.warn('Sync metrics.json failed - using local only');
    }
    
    return entry;
  },

  sync: async () => {
    try {
      const resp = await fetch('/api/metrics');
      if (resp.ok) {
        const data = await resp.json();
        const db = LocalDbService.load();
        await LocalDbService.save({ ...db, metrics: data });
        return data;
      }
    } catch (e) {}
    return LocalDbService.loadMetrics();
  },

  getLatestMetrics: () => {
    const db = LocalDbService.load();
    const history = db.metrics?.history || [];
    if (history.length === 0) return null;
    return history.sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
  }
};
