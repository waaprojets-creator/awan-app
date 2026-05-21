import type { WorkoutSessionLatest, RoutineExercise } from '@/data/schemas/sport/routine';

// Auto-progression: next planned weight based on RIR from last session
// Source: Helms et al. 2016 (doi:10.1519/SSC.0000000000000218) + progressive_overload knowledge

export interface ProgressionSuggestion {
  exerciseId: string;
  exerciseName: string;
  suggestedWeightKg: number;
  reason: 'increase' | 'maintain' | 'decrease' | 'deload';
  confidenceReps: number;
}

function avgRirForExercise(session: WorkoutSessionLatest, exerciseId: string): number | null {
  const ex = session.exercises.find(e => e.exerciseId === exerciseId);
  if (!ex) return null;
  const workingSets = ex.sets.filter(s => s.kind === 'working' && s.rir !== undefined);
  if (workingSets.length === 0) return null;
  const sum = workingSets.reduce((acc, s) => acc + (s.rir ?? 0), 0);
  return sum / workingSets.length;
}

function lastWeightForExercise(session: WorkoutSessionLatest, exerciseId: string): number | null {
  const ex = session.exercises.find(e => e.exerciseId === exerciseId);
  if (!ex) return null;
  const lastWorking = ex.sets.filter(s => s.kind === 'working' && s.weightKg).slice(-1)[0];
  return lastWorking?.weightKg ?? null;
}

// Detect plateau: same weight in last 3+ sessions
function isPlateaued(sessions: WorkoutSessionLatest[], exerciseId: string, window = 3): boolean {
  if (sessions.length < window) return false;
  const recent = sessions.slice(-window);
  const weights = recent.map(s => lastWeightForExercise(s, exerciseId)).filter((w): w is number => w !== null);
  if (weights.length < window) return false;
  const first = weights[0]!;
  return weights.every(w => Math.abs(w - first) < 1);
}

/**
 * Suggest progression for each exercise in a routine based on recent sessions.
 * Rules (from progressive_overload.json knowledge):
 * - RIR ≥ 2 → +2.5% (compound) or +1% (isolation)
 * - RIR ≤ 1 and reps not met → maintain or -2.5%
 * - Plateau 3+ weeks → -30% deload
 */
export function suggestProgression(
  exercises: RoutineExercise[],
  sessions: WorkoutSessionLatest[],
): ProgressionSuggestion[] {
  if (sessions.length === 0) return [];
  const lastSession = sessions[sessions.length - 1]!;

  return exercises
    .filter(ex => ex.plannedWeightKg !== undefined && ex.plannedWeightKg > 0)
    .map((ex): ProgressionSuggestion => {
      const currentWeight = ex.plannedWeightKg!;
      const lastAvgRir = avgRirForExercise(lastSession, ex.exerciseId);
      const plateaued = isPlateaued(sessions, ex.exerciseId);

      if (plateaued) {
        return {
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          suggestedWeightKg: parseFloat((currentWeight * 0.7).toFixed(2)),
          reason: 'deload',
          confidenceReps: sessions.length,
        };
      }

      if (lastAvgRir === null || lastAvgRir >= 2) {
        // Compound exercises: heavier equipment → bigger jumps
        const isCompound = ['barbell', 'dumbbell', 'machine'].some(
          eq => ex.equipment?.toLowerCase().includes(eq) ?? false,
        );
        const pct = isCompound ? 0.025 : 0.01;
        return {
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          suggestedWeightKg: parseFloat((currentWeight * (1 + pct)).toFixed(2)),
          reason: 'increase',
          confidenceReps: sessions.length,
        };
      }

      if (lastAvgRir <= 1) {
        return {
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          suggestedWeightKg: parseFloat((currentWeight * 0.975).toFixed(2)),
          reason: 'decrease',
          confidenceReps: sessions.length,
        };
      }

      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.name,
        suggestedWeightKg: currentWeight,
        reason: 'maintain',
        confidenceReps: sessions.length,
      };
    });
}
