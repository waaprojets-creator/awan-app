import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportDiagnostic } from '@/services/weeklyNutritionReport';
import type { WeeklyNutritionReport } from '@/services/weeklyNutritionReport';

function makeReport(overrides?: Partial<WeeklyNutritionReport>): WeeklyNutritionReport {
  return {
    generatedAt: '2026-05-21T10:00:00Z',
    periodStart: '2026-05-14',
    periodEnd: '2026-05-20',
    days: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-05-${14 + i}`,
      kcal: 2200,
      p: 160,
      c: 260,
      f: 70,
      fiberG: 28,
    })),
    avgKcal: 2200,
    avgP: 160,
    avgC: 260,
    avgF: 70,
    avgFiberG: 28,
    kcalAdherence: 1.0,
    proteinAdherence: 1.0,
    ...overrides,
  };
}

describe('reportDiagnostic', () => {
  it('returns balanced message when adherence is in range', () => {
    const result = reportDiagnostic(makeReport());
    expect(result).toContain('équilibré');
    expect(result).toContain('Protéines atteintes');
  });

  it('flags low caloric intake', () => {
    const result = reportDiagnostic(makeReport({ kcalAdherence: 0.7, avgKcal: 1540 }));
    expect(result).toContain('insuffisant');
  });

  it('flags high caloric surplus', () => {
    const result = reportDiagnostic(makeReport({ kcalAdherence: 1.2, avgKcal: 2640 }));
    expect(result).toContain('Surplus');
  });

  it('flags insufficient protein', () => {
    const result = reportDiagnostic(makeReport({ proteinAdherence: 0.6, avgP: 96 }));
    expect(result).toContain('Protéines insuffisantes');
  });

  it('flags low fiber', () => {
    const result = reportDiagnostic(makeReport({ avgFiberG: 12 }));
    expect(result).toContain('Fibres insuffisantes');
  });

  it('flags incomplete logging week', () => {
    const result = reportDiagnostic(makeReport({
      days: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-05-${14 + i}`,
        kcal: i < 3 ? 2200 : 0,
        p: i < 3 ? 160 : 0,
        c: i < 3 ? 260 : 0,
        f: i < 3 ? 70 : 0,
        fiberG: i < 3 ? 28 : 0,
      })),
    }));
    expect(result).toContain('3/7');
  });

  it('returns fallback string when nothing is flagged', () => {
    const result = reportDiagnostic(makeReport({ kcalAdherence: null, proteinAdherence: null }));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
