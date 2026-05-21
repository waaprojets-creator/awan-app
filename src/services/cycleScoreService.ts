import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';

// ─── Cycle Score 0-100 (fenêtre 4 semaines glissantes) ──────────────────────
// Sources :
//   adherence target ≥ 0.85 = bon respect plan (Helms 2018)
//   fréquence 2-5×/sem = optimal hypertrophie (Schoenfeld 2016, doi:10.1519/JSC.0000000000001272)
//   progression positive sur 3 semaines = stimulus efficace (Helms 2018, MASS Vol 2)
//   plateau ≥ 3 semaines = signal deload (Halson 2014, doi:10.1007/s40279-014-0253-z)

const WINDOW_DAYS = 28;
const DAY_MS = 86_400_000;

export interface CycleScoreBreakdown {
  adherence: number;       // 20 pts
  frequency: number;       // 20 pts
  progression: number;     // 20 pts
  plateau: number;         // 15 pts (penalty if plateau)
  recovery: number;        // 15 pts
  consistency: number;     // 10 pts (sessions not skipped)
}

export interface CycleScoreResult {
  score: number;                  // 0-100
  diagnostic: string;             // verbal
  breakdown: CycleScoreBreakdown;
  weeksObserved: number;
  sessionsCount: number;
}

export function computeCycleScore(
  sessions: WorkoutSessionLatest[],
  now: number = Date.now(),
): CycleScoreResult {
  const cutoff = now - WINDOW_DAYS * DAY_MS;
  const window = sessions.filter(s => s.startTime >= cutoff);

  if (window.length === 0) {
    return {
      score: 0,
      diagnostic: 'Aucune séance sur 4 semaines — reprise nécessaire.',
      breakdown: { adherence: 0, frequency: 0, progression: 0, plateau: 0, recovery: 0, consistency: 0 },
      weeksObserved: 0,
      sessionsCount: 0,
    };
  }

  // Group by week (ISO week from cutoff)
  const weeks: WorkoutSessionLatest[][] = [[], [], [], []];
  for (const s of window) {
    const idx = Math.min(3, Math.floor((s.startTime - cutoff) / (7 * DAY_MS)));
    weeks[idx]!.push(s);
  }

  // Adherence: average session.adherence (0-1), full 20pts at ≥0.85
  const adherenceVals = window.map(s => s.adherence ?? 1);
  const avgAdh = adherenceVals.reduce((a, v) => a + v, 0) / adherenceVals.length;
  const adherence = Math.round(20 * Math.min(1, avgAdh / 0.85));

  // Frequency: avg sessions/week — 4-5 = optimal, 2-3 = ok, <2 = low
  const sessPerWeek = window.length / 4;
  const frequency = sessPerWeek >= 4 ? 20
                  : sessPerWeek >= 3 ? 16
                  : sessPerWeek >= 2 ? 12
                  : sessPerWeek >= 1 ? 6 : 0;

  // Progression: weekly total volume trend (slope over 4 weeks)
  const weeklyVolumes = weeks.map(ws =>
    ws.reduce((acc, s) =>
      acc + s.exercises.reduce((a, ex) =>
        a + ex.sets.reduce((aa, st) =>
          st.kind === 'working' && st.weightKg && st.reps ? aa + st.weightKg * st.reps : aa, 0), 0), 0),
  );
  const nonZero = weeklyVolumes.filter(v => v > 0);
  let progression = 10; // neutral default
  if (nonZero.length >= 2) {
    const first = weeklyVolumes[0]!;
    const last = weeklyVolumes[weeklyVolumes.length - 1]!;
    if (first > 0) {
      const ratio = last / first;
      progression = ratio >= 1.05 ? 20
                  : ratio >= 1.0 ? 15
                  : ratio >= 0.95 ? 10
                  : ratio >= 0.85 ? 5 : 0;
    }
  }

  // Plateau penalty: 3 consecutive weeks with volume variation <3%
  let plateauWeeks = 0;
  for (let i = 1; i < weeklyVolumes.length; i++) {
    const prev = weeklyVolumes[i - 1]!;
    const cur = weeklyVolumes[i]!;
    if (prev > 0 && Math.abs(cur - prev) / prev < 0.03) plateauWeeks++;
    else plateauWeeks = 0;
  }
  const plateau = plateauWeeks >= 3 ? 0 : plateauWeeks === 2 ? 8 : 15;

  // Recovery: avg feeling (1-5) — full 15pts at ≥4
  const feelings = window.map(s => s.feeling).filter((f): f is number => typeof f === 'number');
  const avgFeeling = feelings.length > 0
    ? feelings.reduce((a, v) => a + v, 0) / feelings.length
    : 3;
  const recovery = Math.round(15 * Math.min(1, avgFeeling / 4));

  // Consistency: no week with zero sessions
  const emptyWeeks = weeks.filter(w => w.length === 0).length;
  const consistency = emptyWeeks === 0 ? 10
                    : emptyWeeks === 1 ? 6
                    : emptyWeeks === 2 ? 3 : 0;

  const score = Math.max(0, Math.min(100, adherence + frequency + progression + plateau + recovery + consistency));

  const diagnostic = buildDiagnostic(score, {
    adherence, frequency, progression, plateau, recovery, consistency,
  }, plateauWeeks, sessPerWeek);

  return {
    score,
    diagnostic,
    breakdown: { adherence, frequency, progression, plateau, recovery, consistency },
    weeksObserved: weeks.filter(w => w.length > 0).length,
    sessionsCount: window.length,
  };
}

function buildDiagnostic(
  score: number,
  b: CycleScoreBreakdown,
  plateauWeeks: number,
  sessPerWeek: number,
): string {
  const issues: string[] = [];
  if (b.adherence < 12) issues.push('adhérence au plan faible');
  if (sessPerWeek < 2) issues.push('fréquence sous le seuil 2×/sem');
  if (b.progression <= 5) issues.push('progression en recul');
  if (plateauWeeks >= 3) issues.push('plateau détecté (3+ sem stagnation, deload conseillé)');
  if (b.recovery < 9) issues.push('forme moyenne dégradée');
  if (b.consistency < 6) issues.push('semaines blanches');

  if (score >= 80) return 'Cycle équilibré, progression saine.';
  if (score >= 60) return issues.length > 0
    ? `Cycle satisfaisant. À surveiller : ${issues.join(', ')}.`
    : 'Cycle satisfaisant.';
  if (score >= 40) return `Sous-stimulation détectée : ${issues.join(', ')}.`;
  return `Désengagement ou surcharge — ${issues.join(', ')}. Revoir le plan.`;
}
