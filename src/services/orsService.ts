// Stub — sera remplacé par le module OpenRouteService (Sprint 5+)
export const ORSService = {
  getRoute: async (_coords?: unknown, _apiKey?: string, _mode?: string): Promise<null> => null,
  geocode: async (_query?: string, _apiKey?: string): Promise<{ features: unknown[] }> => ({ features: [] }),
};
