// Stub — sera remplacé par le module Nutrition (Sprint 4+)
export const NutritionService = {
  calculateDailyTotal: (_entries?: unknown[]): { kcal: number; p: number; c: number; f: number } =>
    ({ kcal: 0, p: 0, c: 0, f: 0 }),
  calculateBMR: (_weight?: number, _height?: number, _age?: number, _gender?: string): number => 0,
  calculateTDEE: (_bmr?: number, _activity?: string): number => 0,
  calculateTargetMacros: (_tdee?: number, _goal?: string, _weight?: number): { kcal: number; p: number; c: number; f: number } =>
    ({ kcal: 2000, p: 150, c: 200, f: 70 }),
};
