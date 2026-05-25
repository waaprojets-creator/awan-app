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

export interface BFPctRange {
  low: number;
  high: number;
  methods: string[];
}

// Siri equation: BF% from body density
function densityToBf(density: number): number {
  return Math.max(0, (495 / density) - 450);
}

export const BiometricsService = {
  getLatest: (): BiometricEntry | null => null,
  getLogs: (): BiometricEntry[] => [],

  sync: (): Promise<BiometricHistory> =>
    Promise.resolve({ history: [] }),

  // ─── Jackson-Pollock 3-site ───────────────────────────────────────────────
  // Source: Jackson & Pollock, 1978 (doi:10.1079/bjn19780078)

  jacksonPollock3Men(chest: number, abdomen: number, thigh: number, age: number): number {
    const s = chest + abdomen + thigh;
    const density = 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * age;
    return parseFloat(densityToBf(density).toFixed(1));
  },

  jacksonPollock3Women(triceps: number, suprailiac: number, thigh: number, age: number): number {
    const s = triceps + suprailiac + thigh;
    const density = 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * age;
    return parseFloat(densityToBf(density).toFixed(1));
  },

  // ─── Jackson-Pollock 7-site ───────────────────────────────────────────────
  // Sites (men): chest, midaxilla, triceps, subscapular, abdominal, suprailiac, thigh
  // Sites (women): chest, midaxilla, triceps, subscapular, abdominal, suprailiac, thigh (same)
  // Source: Jackson & Pollock, 1978

  jacksonPollock7(
    chest: number,
    midaxilla: number,
    triceps: number,
    subscapular: number,
    abdominal: number,
    suprailiac: number,
    thigh: number,
    age: number,
    sex: 'male' | 'female',
  ): number {
    const s = chest + midaxilla + triceps + subscapular + abdominal + suprailiac + thigh;
    let density: number;
    if (sex === 'male') {
      density = 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * age;
    } else {
      density = 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * age;
    }
    return parseFloat(densityToBf(density).toFixed(1));
  },

  // ─── Durnin-Womersley 4-site ──────────────────────────────────────────────
  // Sites: biceps, triceps, subscapular, suprailiac
  // Age-stratified log10 regression equations
  // Source: Durnin & Womersley, 1974 (doi:10.1079/bjn19740060)

  durninWomersley4(
    biceps: number,
    triceps: number,
    subscapular: number,
    suprailiac: number,
    age: number,
    sex: 'male' | 'female',
  ): number {
    const s = biceps + triceps + subscapular + suprailiac;
    const logS = Math.log10(s);
    let density: number;

    if (sex === 'male') {
      if (age < 17)       density = 1.1533 - 0.0643 * logS;
      else if (age < 20)  density = 1.1620 - 0.0630 * logS;
      else if (age < 30)  density = 1.1631 - 0.0632 * logS;
      else if (age < 40)  density = 1.1422 - 0.0544 * logS;
      else if (age < 50)  density = 1.1620 - 0.0700 * logS;
      else                density = 1.1715 - 0.0779 * logS;
    } else {
      if (age < 17)       density = 1.1369 - 0.0598 * logS;
      else if (age < 20)  density = 1.1549 - 0.0678 * logS;
      else if (age < 30)  density = 1.1599 - 0.0717 * logS;
      else if (age < 40)  density = 1.1423 - 0.0632 * logS;
      else if (age < 50)  density = 1.1333 - 0.0612 * logS;
      else                density = 1.1339 - 0.0645 * logS;
    }
    return parseFloat(densityToBf(density).toFixed(1));
  },

  // ─── US Navy BF% formula ─────────────────────────────────────────────────
  // Source: Hodgdon & Beckett, 1984

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

  // ─── BF% confidence range from multiple methods ──────────────────────────
  // Returns low/high bounds across all available methods

  bfPctRange(values: { method: string; value: number }[]): BFPctRange {
    const valid = values.filter(v => !isNaN(v.value) && isFinite(v.value));
    if (valid.length === 0) return { low: 0, high: 0, methods: [] };
    const nums = valid.map(v => v.value);
    return {
      low: parseFloat(Math.min(...nums).toFixed(1)),
      high: parseFloat(Math.max(...nums).toFixed(1)),
      methods: valid.map(v => v.method),
    };
  },

  // ─── 13-site personal protocol ───────────────────────────────────────────
  // D = C - M × log10(S13), %G = (495/D) - 450 (Siri)
  // M derived from Durnin-Womersley 1974 rescaled to 13-site sum range
  // (M13 = M4 × ratio where ratio = log10(S4_mean) / log10(S13_mean) ≈ 0.786)

  skinfolds13(s13: number, age: number, sex: 'male' | 'female'): number {
    if (s13 <= 0) return NaN;
    const logS = Math.log10(s13);
    let density: number;
    if (sex === 'male') {
      if (age < 17)       density = 1.1533 - 0.0505 * logS;
      else if (age < 20)  density = 1.1620 - 0.0495 * logS;
      else if (age < 30)  density = 1.1631 - 0.0497 * logS;
      else if (age < 40)  density = 1.1422 - 0.0428 * logS;
      else if (age < 50)  density = 1.1620 - 0.0550 * logS;
      else                density = 1.1715 - 0.0612 * logS;
    } else {
      if (age < 17)       density = 1.1369 - 0.0470 * logS;
      else if (age < 20)  density = 1.1549 - 0.0533 * logS;
      else if (age < 30)  density = 1.1599 - 0.0564 * logS;
      else if (age < 40)  density = 1.1423 - 0.0497 * logS;
      else if (age < 50)  density = 1.1333 - 0.0481 * logS;
      else                density = 1.1339 - 0.0507 * logS;
    }
    return parseFloat(densityToBf(density).toFixed(1));
  },

  // ─── IMC ──────────────────────────────────────────────────────────────────

  imc(weightKg: number, heightCm: number): number {
    if (heightCm <= 0 || weightKg <= 0) return 0;
    const h = heightCm / 100;
    return parseFloat((weightKg / (h * h)).toFixed(1));
  },

  // ─── FFMI normalisé ───────────────────────────────────────────────────────
  // Formula: FFMI = (lbm / h²) + 6.1 × (1.80 - h)  [men]
  //                  (lbm / h²) + 6.1 × 0.81 × (1.80 - h)  [women, ~Kouri adj.]
  // Source: Kouri et al. 1995 (doi:10.1097/00042752-199510000-00009)

  ffmiNormalized(weightKg: number, heightCm: number, bodyFatPct: number, sex: 'male' | 'female'): number {
    if (heightCm <= 0 || weightKg <= 0) return 0;
    const h = heightCm / 100;
    const lbm = weightKg * (1 - bodyFatPct / 100);
    const rawFfmi = lbm / (h * h);
    const correction = sex === 'male'
      ? 6.1 * (1.80 - h)
      : 6.1 * 0.81 * (1.80 - h);
    return parseFloat((rawFfmi + correction).toFixed(2));
  },

  // ─── WHtR ─────────────────────────────────────────────────────────────────

  whtr(waistCm: number, heightCm: number): number {
    if (heightCm <= 0) return 0;
    return parseFloat((waistCm / heightCm).toFixed(3));
  },
};
