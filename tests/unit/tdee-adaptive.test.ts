import { describe, it, expect } from 'vitest';
import {
  estimateAdaptiveTDEE,
  type WeightEntry,
  type IntakeEntry,
} from '../../src/services/tdeeAdaptiveService';

function makeWeightHistory(days: number, startKg: number, dailyDeltaKg = 0): WeightEntry[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(2026, 0, 1 + i);
    return {
      date: date.toISOString().split('T')[0]!,
      weightKg: parseFloat((startKg + i * dailyDeltaKg).toFixed(3)),
    };
  });
}

function makeIntakeHistory(days: number, kcal: number): IntakeEntry[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(2026, 0, 1 + i);
    return {
      date: date.toISOString().split('T')[0]!,
      kcal,
    };
  });
}

describe('estimateAdaptiveTDEE', () => {
  it('returns null when fewer than 7 days of data', () => {
    const result = estimateAdaptiveTDEE(
      makeWeightHistory(5, 80),
      makeIntakeHistory(5, 2000),
      2000,
    );
    expect(result).toBeNull();
  });

  it('returns null with exactly 6 days', () => {
    const result = estimateAdaptiveTDEE(
      makeWeightHistory(6, 80),
      makeIntakeHistory(6, 2000),
      2000,
    );
    expect(result).toBeNull();
  });

  it('returns a result with confidence=low for exactly 7 days', () => {
    const result = estimateAdaptiveTDEE(
      makeWeightHistory(7, 80),
      makeIntakeHistory(7, 2000),
      2000,
    );
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('low');
    expect(result!.observationDays).toBe(7);
  });

  it('returns confidence=high for 14 days of data', () => {
    const result = estimateAdaptiveTDEE(
      makeWeightHistory(14, 80),
      makeIntakeHistory(14, 2000),
      2000,
    );
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('high');
    expect(result!.observationDays).toBe(14);
  });

  it('increasing weight trend → estimated TDEE < intake (eating above maintenance)', () => {
    // Gaining ~100g/day while eating 2500kcal → TDEE must be below 2500
    const result = estimateAdaptiveTDEE(
      makeWeightHistory(14, 80, 0.1),  // gaining 100g/day
      makeIntakeHistory(14, 2500),
      2300,
    );
    expect(result).not.toBeNull();
    expect(result!.estimatedTDEE).toBeLessThan(2500);
  });

  it('stable weight → estimated TDEE ≈ intake', () => {
    // No weight change → TDEE should equal average intake
    const result = estimateAdaptiveTDEE(
      makeWeightHistory(14, 80, 0),    // no change
      makeIntakeHistory(14, 2200),
      2200,
    );
    expect(result).not.toBeNull();
    // With zero slope, TDEE = avgIntake
    expect(result!.estimatedTDEE).toBeCloseTo(2200, -1);
  });

  it('result is clamped within ±40% of baseTDEE', () => {
    const baseTDEE = 2000;
    // Extreme weight loss scenario that would produce unrealistic TDEE
    const result = estimateAdaptiveTDEE(
      makeWeightHistory(14, 80, -0.5),  // losing 500g/day — extreme
      makeIntakeHistory(14, 1200),
      baseTDEE,
    );
    expect(result).not.toBeNull();
    expect(result!.estimatedTDEE).toBeGreaterThanOrEqual(baseTDEE * 0.6);
    expect(result!.estimatedTDEE).toBeLessThanOrEqual(baseTDEE * 1.4);
  });

  it('result contains expected fields', () => {
    const result = estimateAdaptiveTDEE(
      makeWeightHistory(7, 80),
      makeIntakeHistory(7, 2000),
      2000,
    );
    expect(result).not.toBeNull();
    expect(typeof result!.estimatedTDEE).toBe('number');
    expect(typeof result!.avgIntakeKcal).toBe('number');
    expect(typeof result!.weightTrendGPerDay).toBe('number');
    expect(typeof result!.observationDays).toBe('number');
  });
});
