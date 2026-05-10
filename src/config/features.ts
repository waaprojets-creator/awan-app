export const FEATURES = {
  coach: {
    enabled: true,
    modules: { sport: true, nutrition: true, anthropo: true },
  },
  planning: { enabled: true, autoOptimize: false },
  activity: { enabled: false, source: null as 'native' | 'health_connect' | null },
  encryption: { enabled: false },
  modules: {
    sport: true,
    anthropo: true,
    nutrition: true,
    mental: false,
    islam: true,
    trajet: true,
    planning: true,
    todo: true,
  },
} as const;
