// Stub — sera remplacé par SqliteStorage + modules (Sprint 4+)
export const LocalDbService = {
  getPois: (): Array<{ name: string; category: string; lat: number; lon: number }> => [],
  getTasks: (): unknown[] => [],
  getWorkouts: (): unknown[] => [],
  getMeasurements: (): unknown[] => [],
  saveMetricEntry: (_entry: unknown, _extra?: unknown): void => {},
  logTime: (_taskId: string, _durationMs: number): void => {},
};
