import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';

// ─── 1RM estimation ───────────────────────────────────────────────────────────
// Three validated formulas, weighted average for best signal.
// Source: Brzycki 1993, Epley 1985, O'Conner 1989

export function oneRmEstimate(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  // W2: Brzycki error > 10% beyond 12 reps — discard as noise
  if (reps > 12) return 0;
  // Brzycki: w / (1.0278 - 0.0278×reps)
  const brzycki = weightKg / (1.0278 - 0.0278 * reps);
  // Epley: w × (1 + reps/30)
  const epley = weightKg * (1 + reps / 30);
  // O'Conner: w × (1 + 0.025×reps)
  const oconner = weightKg * (1 + 0.025 * reps);
  // Weighted average (Brzycki slightly more accurate at higher reps)
  return parseFloat(((brzycki * 0.4 + epley * 0.35 + oconner * 0.25)).toFixed(1));
}

// ─── Session density ──────────────────────────────────────────────────────────
// density = total working volume (kg·reps) / active minutes
// active = workoutEndedAt - warmupStartedAt - total rest time

export function sessionDensity(session: WorkoutSessionLatest): number | null {
  const start = session.warmupStartedAt ?? session.startTime;
  const end = session.workoutEndedAt ?? session.endTime;
  if (!end || end <= start) return null;

  let totalRestSec = 0;
  let workingVolume = 0;

  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (s.kind === 'working') {
        if (s.restActualSec) totalRestSec += s.restActualSec;
        if (s.weightKg && s.reps) workingVolume += s.weightKg * s.reps;
      }
    }
  }

  const activeMin = ((end - start) / 1000 - totalRestSec) / 60;
  if (activeMin <= 0) return null;
  return parseFloat((workingVolume / activeMin).toFixed(1));
}

// ─── 1RM per exercise from session ───────────────────────────────────────────

export function bestOneRmFromSession(
  session: WorkoutSessionLatest,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ex of session.exercises) {
    let best = 0;
    for (const s of ex.sets) {
      if (s.kind !== 'working' || !s.weightKg || !s.reps) continue;
      const est = oneRmEstimate(s.weightKg, s.reps);
      if (est > best) best = est;
    }
    if (best > 0) result[ex.exerciseId] = best;
  }
  return result;
}

// ─── 1RM trend per exercise ───────────────────────────────────────────────────
// Returns per-exercise arrays of {date, oneRm} points for the given window.
// Only sets with reps ≤ 12 are used (Brzycki reliability guard).

export function oneRmTrendPerExercise(
  sessions: WorkoutSessionLatest[],
  windowDays = 90,
): Record<string, Array<{ date: string; oneRm: number }>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutStr = cutoff.toISOString().slice(0, 10);

  const trend: Record<string, Array<{ date: string; oneRm: number }>> = {};
  for (const session of sessions) {
    if (session.date < cutStr) continue;
    const rms = bestOneRmFromSession(session);
    for (const [exId, rm] of Object.entries(rms)) {
      if (!trend[exId]) trend[exId] = [];
      trend[exId].push({ date: session.date, oneRm: rm });
    }
  }
  // Sort each series chronologically
  for (const key of Object.keys(trend)) {
    trend[key].sort((a, b) => a.date.localeCompare(b.date));
  }
  return trend;
}

// ─── Session adherence (actual vs planned) ───────────────────────────────────
// Returns 0-1 ratio: 1.0 = perfect adherence, <1 = under-planned

export function sessionAdherence(session: WorkoutSessionLatest): number {
  let plannedVol = 0;
  let actualVol = 0;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (s.kind !== 'working') continue;
      // plannedWeightKg / plannedReps come from ExerciseSetV2
      const pw = 'plannedWeightKg' in s ? (s.plannedWeightKg ?? 0) : 0;
      const pr = 'plannedReps' in s ? (s.plannedReps ?? 0) : 0;
      if (pw > 0 && pr > 0) plannedVol += pw * pr;
      if (s.weightKg && s.reps) actualVol += s.weightKg * s.reps;
    }
  }
  if (plannedVol === 0) return 1;
  return Math.min(1, actualVol / plannedVol);
}
