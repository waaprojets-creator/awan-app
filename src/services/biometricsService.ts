// Stub — sera remplacé par le module Mensuration (Sprint 4+)
export const BiometricsService = {
  getLatest: (): Record<string, unknown> | null => null,
  getLogs: (): unknown[] => [],
  sync: (): Promise<{ history: Array<Record<string, unknown>> }> =>
    Promise.resolve({ history: [] }),
  jacksonPollock3Men: (_chest: number, _abdomen: number, _thigh: number, _age: number): number => 0,
  jacksonPollock3Women: (_triceps: number, _suprailiac: number, _thigh: number, _age: number): number => 0,
};
