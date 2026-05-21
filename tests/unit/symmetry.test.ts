import { describe, it, expect } from 'vitest';
import {
  measureSymmetry,
  analyzeSymmetry,
  asymmetryToHeatmapValue,
} from '../../src/services/symmetryService';

describe('measureSymmetry', () => {
  it('returns 0% when both sides are equal', () => {
    expect(measureSymmetry(35, 35)).toBe(0);
  });

  it('returns 0% when both sides are zero', () => {
    expect(measureSymmetry(0, 0)).toBe(0);
  });

  it('10cm left, 9cm right → ~10% asymmetry', () => {
    // |10 - 9| / max(10, 9) * 100 = 1/10 * 100 = 10%
    const result = measureSymmetry(10, 9);
    expect(result).toBeCloseTo(10, 0);
  });

  it('equal non-zero values → 0%', () => {
    expect(measureSymmetry(40, 40)).toBe(0);
  });

  it('returns a positive number regardless of which side is larger', () => {
    const leftBigger = measureSymmetry(12, 10);
    const rightBigger = measureSymmetry(10, 12);
    expect(leftBigger).toBeGreaterThan(0);
    expect(rightBigger).toBeGreaterThan(0);
    expect(leftBigger).toBe(rightBigger);
  });
});

describe('analyzeSymmetry', () => {
  it('≥5% diff → asymmetric: true', () => {
    // 10cm vs 9cm = 10% → exceeds default 5% threshold
    const results = analyzeSymmetry({ arm_left: 10, arm_right: 9 });
    expect(results).toHaveLength(1);
    expect(results[0]!.asymmetric).toBe(true);
    expect(results[0]!.muscleKey).toBe('arm');
  });

  it('<5% diff → asymmetric: false', () => {
    // 40cm vs 39.5cm ≈ 1.3% → below threshold
    const results = analyzeSymmetry({ arm_left: 40, arm_right: 39.5 });
    expect(results).toHaveLength(1);
    expect(results[0]!.asymmetric).toBe(false);
  });

  it('exactly equal values → asymmetric: false', () => {
    const results = analyzeSymmetry({ thigh_left: 55, thigh_right: 55 });
    expect(results).toHaveLength(1);
    expect(results[0]!.diffPct).toBe(0);
    expect(results[0]!.asymmetric).toBe(false);
  });

  it('includes diffPct, leftCm, rightCm in each result', () => {
    const results = analyzeSymmetry({ arm_left: 36, arm_right: 34 });
    expect(results).toHaveLength(1);
    expect(results[0]!.leftCm).toBe(36);
    expect(results[0]!.rightCm).toBe(34);
    expect(results[0]!.diffPct).toBeGreaterThan(0);
  });

  it('handles multiple muscle pairs', () => {
    const results = analyzeSymmetry({
      arm_left: 35,  arm_right: 35,
      thigh_left: 55, thigh_right: 50,
    });
    expect(results).toHaveLength(2);
  });

  it('skips pairs where both values are zero', () => {
    const results = analyzeSymmetry({ arm_left: 0, arm_right: 0 });
    expect(results).toHaveLength(0);
  });

  it('custom threshold is respected', () => {
    // 5% diff: with threshold=3 → asymmetric, with threshold=10 → symmetric
    const measurements = { calf_left: 38, calf_right: 36 };
    const strict = analyzeSymmetry(measurements, 3);
    const relaxed = analyzeSymmetry(measurements, 10);
    expect(strict[0]!.asymmetric).toBe(true);
    expect(relaxed[0]!.asymmetric).toBe(false);
  });
});

describe('asymmetryToHeatmapValue', () => {
  it('0% asymmetry → 0.0', () => {
    expect(asymmetryToHeatmapValue(0)).toBe(0);
  });

  it('5% asymmetry → 0.5', () => {
    expect(asymmetryToHeatmapValue(5)).toBe(0.5);
  });

  it('10% asymmetry → 1.0', () => {
    expect(asymmetryToHeatmapValue(10)).toBe(1.0);
  });

  it('values above 10% are clamped to 1.0', () => {
    expect(asymmetryToHeatmapValue(20)).toBe(1.0);
  });

  it('values between 0 and 10 are scaled linearly', () => {
    expect(asymmetryToHeatmapValue(2.5)).toBeCloseTo(0.25, 5);
  });
});
