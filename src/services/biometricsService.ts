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

  // US Navy BF% formula
  // Men : BF% = 495 / (1.0324 − 0.19077·log10(waist−neck) + 0.15456·log10(height)) − 450
  // Women: BF% = 495 / (1.29579 − 0.35004·log10(waist+hip−neck) + 0.22100·log10(height)) − 450
  navyBFPct({ heightCm, waistCm, neckCm, hipCm, sex }: {
    heightCm: number;
    waistCm: number;
    neckCm: number;
    hipCm?: number;
    sex: 'male' | 'female';
  }): number {
    if (sex === 'male') {
      const diff = waistCm - neckCm;
      if (diff <= 0) return NaN;
      return parseFloat((495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm)) - 450).toFixed(1));
    }
    if (!hipCm) return NaN;
    const sum = waistCm + hipCm - neckCm;
    if (sum <= 0) return NaN;
    return parseFloat((495 / (1.29579 - 0.35004 * Math.log10(sum) + 0.22100 * Math.log10(heightCm)) - 450).toFixed(1));
  },
};
