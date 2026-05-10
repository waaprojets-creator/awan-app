export interface BiometricEntry {
  date: string;
  weight: number;
  bpm_rest: number;
  body_fat_pct: number;
  measurements: Record<string, number>;
  skinfolds: Record<string, number>;
}

export interface BiometricHistory {
  history: BiometricEntry[];
}

// Siri & Durnin body fat % from body density
function densityToBf(density: number): number {
  return Math.max(0, (495 / density) - 450);
}

export const BiometricsService = {
  getLatest: (): BiometricEntry | null => null,
  getLogs: (): BiometricEntry[] => [],

  sync: (): Promise<BiometricHistory> =>
    Promise.resolve({ history: [] }),

  // Jackson-Pollock 3-site (men): chest, abdomen, thigh (mm), age (years)
  jacksonPollock3Men(chest: number, abdomen: number, thigh: number, age: number): number {
    const s = chest + abdomen + thigh;
    const density = 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * age;
    return parseFloat(densityToBf(density).toFixed(1));
  },

  // Jackson-Pollock 3-site (women): triceps, suprailiac, thigh (mm), age (years)
  jacksonPollock3Women(triceps: number, suprailiac: number, thigh: number, age: number): number {
    const s = triceps + suprailiac + thigh;
    const density = 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * age;
    return parseFloat(densityToBf(density).toFixed(1));
  },
};
