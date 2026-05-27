import { getStorage } from '@/data/storage/storageService';

// Silently generated — stored in DB, not notified. Consulted freely.

export interface DayNutritionSummary {
  date: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  fiberG: number;
}

export interface WeeklyNutritionReport {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  days: DayNutritionSummary[];
  avgKcal: number;
  avgP: number;
  avgC: number;
  avgF: number;
  avgFiberG: number;
  // Adherence fractions 0-1, null when no profile
  kcalAdherence: number | null;
  proteinAdherence: number | null;
}

interface NutritionTargets {
  targetKcal: number;
  targetP: number;
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  }).reverse();
}

export async function buildWeeklyNutritionReport(
  targets: NutritionTargets | null,
): Promise<WeeklyNutritionReport> {
  const storage = await getStorage();
  const dates = last7Days();

  const days: DayNutritionSummary[] = await Promise.all(
    dates.map(async date => {
      const [kcal, p, c, f, fiberG] = await Promise.all([
        storage.aggregate('nutrition.meal', 'kcal', 'SUM', { date }),
        storage.aggregate('nutrition.meal', 'p', 'SUM', { date }),
        storage.aggregate('nutrition.meal', 'c', 'SUM', { date }),
        storage.aggregate('nutrition.meal', 'f', 'SUM', { date }),
        storage.aggregate('nutrition.meal', 'fiberG', 'SUM', { date }),
      ]);
      return { date, kcal, p, c, f, fiberG };
    }),
  );

  const loggedDays = days.filter(d => d.kcal > 0);
  const n = loggedDays.length || 1;

  const avgKcal = Math.round(loggedDays.reduce((s, d) => s + d.kcal, 0) / n);
  const avgP = Math.round(loggedDays.reduce((s, d) => s + d.p, 0) / n);
  const avgC = Math.round(loggedDays.reduce((s, d) => s + d.c, 0) / n);
  const avgF = Math.round(loggedDays.reduce((s, d) => s + d.f, 0) / n);
  const avgFiberG = Math.round(loggedDays.reduce((s, d) => s + d.fiberG, 0) / n);

  return {
    generatedAt: new Date().toISOString(),
    periodStart: dates[0]!,
    periodEnd: dates[dates.length - 1]!,
    days,
    avgKcal,
    avgP,
    avgC,
    avgF,
    avgFiberG,
    kcalAdherence: targets ? Math.round((avgKcal / targets.targetKcal) * 100) / 100 : null,
    proteinAdherence: targets ? Math.round((avgP / targets.targetP) * 100) / 100 : null,
  };
}

export function reportDiagnostic(report: WeeklyNutritionReport): string {
  const lines: string[] = [];
  const ka = report.kcalAdherence;
  const pa = report.proteinAdherence;
  if (ka !== null) {
    if (ka < 0.85) lines.push('Apport calorique insuffisant (<85% cible)');
    else if (ka > 1.15) lines.push('Surplus calorique élevé (>115% cible)');
    else lines.push('Apport calorique équilibré');
  }
  if (pa !== null) {
    if (pa < 0.8) lines.push('Protéines insuffisantes (<80% cible)');
    else lines.push('Protéines atteintes');
  }
  if (report.avgFiberG < 20) lines.push('Fibres insuffisantes (<20g/j recommandés)');
  const loggedCount = report.days.filter(d => d.kcal > 0).length;
  if (loggedCount < 5) lines.push(`Seulement ${loggedCount}/7 jours loggés`);
  return lines.join(' · ') || 'Semaine standard';
}
