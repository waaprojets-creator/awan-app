/**
 * AWAN Time Stats Service (UsageStats Logic)
 * Analyse le temps passé sur les applications et aide à l'équilibre vie numérique.
 */

export interface AppUsage {
  packageName: string;
  appName: string;
  timeSpent: number; // en millisecondes
  category: 'productive' | 'social' | 'entertainment' | 'system';
}

export const TimeStatsService = {
  /**
   * Analyse un lot de données d'usage
   */
  processUsageData: (data: AppUsage[]) => {
    const summary = {
      total: 0,
      productive: 0,
      leisure: 0,
      topApp: null as AppUsage | null
    };

    data.forEach(app => {
      summary.total += app.timeSpent;
      if (app.category === 'productive') summary.productive += app.timeSpent;
      else summary.leisure += app.timeSpent;

      if (!summary.topApp || app.timeSpent > summary.topApp.timeSpent) {
        summary.topApp = app;
      }
    });

    return summary;
  },

  /**
   * Formate la durée en texte lisible (ex: 2h 15m)
   */
  formatDuration: (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
  }
};
