// Symmetry analysis: detects L/R imbalances above threshold
// Source: bilateral asymmetry literature, 5% asymmetry threshold widely used
// (Bishop et al. 2018, doi:10.1519/JSC.0000000000002578)

export interface SymmetryResult {
  muscleKey: string;
  leftCm: number;
  rightCm: number;
  diffPct: number;
  asymmetric: boolean;
}

// Compute (|L-R| / max(L,R)) * 100
export function measureSymmetry(leftCm: number, rightCm: number): number {
  const maxVal = Math.max(leftCm, rightCm);
  if (maxVal <= 0) return 0;
  return parseFloat((Math.abs(leftCm - rightCm) / maxVal * 100).toFixed(1));
}

export function analyzeSymmetry(
  measurements: Record<string, number>,
  thresholdPct = 5,
): SymmetryResult[] {
  const results: SymmetryResult[] = [];
  // Paired keys follow the pattern: <muscle>_left / <muscle>_right
  const leftKeys = Object.keys(measurements).filter(k => k.endsWith('_left'));
  for (const leftKey of leftKeys) {
    const base = leftKey.replace(/_left$/, '');
    const rightKey = `${base}_right`;
    const leftCm = measurements[leftKey] ?? 0;
    const rightCm = measurements[rightKey] ?? 0;
    if (leftCm <= 0 && rightCm <= 0) continue;
    const diffPct = measureSymmetry(leftCm, rightCm);
    results.push({
      muscleKey: base,
      leftCm,
      rightCm,
      diffPct,
      asymmetric: diffPct > thresholdPct,
    });
  }
  return results;
}

// Normalize asymmetry delta to 0-1 for BodySvg heatmap
// 0% → 0.0, 5% (threshold) → 0.5, ≥10% → 1.0
export function asymmetryToHeatmapValue(diffPct: number): number {
  return Math.min(1, diffPct / 10);
}
