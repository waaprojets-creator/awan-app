import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';
import { getStorage } from '@/data/storage/storageService';

// ─── ACWR ─────────────────────────────────────────────────────────────────────
// Source: Gabbett 2016, doi:10.1136/bjsports-2015-095788
// ACWR = (avg RPE 7j) / (avg RPE 28j), using sessionRPE. Fallback = 7.

export function computeACWR(
  sessions: WorkoutSessionLatest[],
  today: Date = new Date(),
): number | null {
  const todayStr = today.toISOString().slice(0, 10);
  const dayDiff = (dateStr: string) =>
    Math.floor(
      (new Date(todayStr).getTime() - new Date(dateStr).getTime()) / 86400000,
    );

  const recent7 = sessions.filter(s => { const d = dayDiff(s.date); return d >= 0 && d < 7; });
  const recent28 = sessions.filter(s => { const d = dayDiff(s.date); return d >= 0 && d < 28; });

  if (recent7.length === 0 || recent28.length < 4) return null;

  // rpe (V3+) preferred; fallback to sessionRPE (V1/V2) for migrated data
  const rpeOf = (s: WorkoutSessionLatest) => s.rpe ?? s.sessionRPE ?? 7;
  const avg7 = recent7.reduce((acc, s) => acc + rpeOf(s), 0) / 7;
  const avg28 = recent28.reduce((acc, s) => acc + rpeOf(s), 0) / 28;

  if (avg28 === 0) return null;
  return parseFloat((avg7 / avg28).toFixed(2));
}

// ─── ACWR rolling 28-point series ────────────────────────────────────────────

export function computeACWRSeries(
  sessions: WorkoutSessionLatest[],
): Array<{ date: string; acwr: number | null }> {
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return { date: d.toISOString().slice(0, 10), acwr: computeACWR(sessions, d) };
  });
}

// ─── Weekly tonnage ───────────────────────────────────────────────────────────

export function computeWeeklyTonnage(
  sessions: WorkoutSessionLatest[],
  isoWeekOffset = 0,
): number {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day - 1) + isoWeekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monStr = monday.toISOString().slice(0, 10);
  const sunStr = sunday.toISOString().slice(0, 10);

  let tonnage = 0;
  for (const session of sessions) {
    if (session.date < monStr || session.date > sunStr) continue;
    // V3+: tonnage pre-computed at save time; V1/V2: iterate sets as fallback
    if (typeof session.tonnage === 'number') {
      tonnage += session.tonnage;
    } else {
      for (const ex of session.exercises) {
        for (const s of ex.sets) {
          if (s.kind === 'working' && s.weightKg && s.reps) {
            tonnage += s.weightKg * s.reps;
          }
        }
      }
    }
  }
  return Math.round(tonnage);
}

// ─── EAT ─────────────────────────────────────────────────────────────────────
// Source: Ainsworth 2011 Compendium, doi:10.1249/MSS.0b013e31821ece12
// MET 5.5 for resistance training (moderate effort)
// EAT (kcal) = MET × weightKg × (durationMin / 60)

export function computeEAT(session: WorkoutSessionLatest, weightKg: number): number {
  const start = session.warmupStartedAt ?? session.startTime;
  const end = session.workoutEndedAt ?? session.endTime;
  if (!end || end <= start || weightKg <= 0) return 0;
  const durationMin = (end - start) / 60000;
  return Math.round((durationMin * 5.5 * weightKg) / 60);
}

// ─── Flux density phase ───────────────────────────────────────────────────────

export type FluxPhase = 'surplus' | 'maintenance' | 'deficit';

export function computeFluxDensity(
  weeklyKcalIntake: number,
  weeklyKcalExpenditure: number,
): FluxPhase {
  const delta = weeklyKcalIntake - weeklyKcalExpenditure;
  if (delta > 1400) return 'surplus';   // > +200 kcal/day
  if (delta < -1400) return 'deficit';  // < -200 kcal/day
  return 'maintenance';
}

// ─── 8-week macro aggregation for FluxDensité ─────────────────────────────────

export interface WeekMacros {
  label: string; // "S-7", "S-6" … "S0"
  weekStart: string;
  pKcal: number;
  cKcal: number;
  fKcal: number;
  totalKcal: number;
}

export async function buildFluxData(weekCount = 8): Promise<WeekMacros[]> {
  const storage = await getStorage();
  const results: WeekMacros[] = [];

  for (let offset = -(weekCount - 1); offset <= 0; offset++) {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1) + offset * 7);
    monday.setHours(0, 0, 0, 0);

    const dates: string[] = [];
    for (let d = 0; d < 7; d++) {
      const dd = new Date(monday);
      dd.setDate(monday.getDate() + d);
      dates.push(dd.toISOString().slice(0, 10));
    }

    let pSum = 0; let cSum = 0; let fSum = 0;
    for (const date of dates) {
      const [p, c, f] = await Promise.all([
        storage.aggregate('nutrition.meal', 'p', 'SUM', { date }),
        storage.aggregate('nutrition.meal', 'c', 'SUM', { date }),
        storage.aggregate('nutrition.meal', 'f', 'SUM', { date }),
      ]);
      pSum += p; cSum += c; fSum += f;
    }

    results.push({
      label: offset === 0 ? 'S0' : `S${offset}`,
      weekStart: dates[0]!,
      pKcal: Math.round(pSum * 4),
      cKcal: Math.round(cSum * 4),
      fKcal: Math.round(fSum * 9),
      totalKcal: Math.round(pSum * 4 + cSum * 4 + fSum * 9),
    });
  }
  return results;
}
