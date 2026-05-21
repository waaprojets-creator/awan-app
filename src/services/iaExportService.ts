import type { WorkoutSessionLatest, RoutineLatest } from '@/data/schemas/sport/routine';
import { WorkoutService } from './workoutService';
import { suggestProgression } from './autoProgressionService';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// Compiled scientific prompt template embedded for offline-first use
const IA_PROMPT_TEMPLATE = `Tu es un entraîneur de force et hypertrophie de niveau elite (certification NSCA-CSCS).
Analyse les données d'entraînement AWAN ci-dessous et fournis :
1. Bilan volumes hebdomadaires (MEV/MAV/MRV par groupe musculaire)
2. Détection de plateaux et recommandations de déload
3. Analyse de la progression (RIR moyen, charges, PR)
4. Recommandations de charge pour les 4 prochaines semaines
5. Points de vigilance (sur/sous-stimulation, déséquilibres)

Base tes recommandations sur les sources : Schoenfeld 2017 (volume-hypertrophie), Helms 2016-2018 (progression), Israetel RP Volume Bible 2020.

DONNÉES AWAN SPORT :
`;

export interface IAExportPayload {
  exportedAt: string;
  periodDays: number;
  routines: RoutineLatest[];
  sessions: WorkoutSessionLatest[];
  progressionSuggestions: Array<{
    exerciseName: string;
    suggestedWeightKg: number;
    reason: string;
    confidenceReps: number;
  }>;
  volumeByMuscle: Record<string, number>;
  prHistory: Array<{
    exerciseName: string;
    exerciseId: string;
    bestWeightKg: number;
    bestReps: number;
    estimatedOneRM: number;
    sessionDate: string;
  }>;
  averageRirPerExercise: Record<string, number>;
  plateauedExercises: string[];
}

function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export async function buildIAExport(
  routines: RoutineLatest[],
): Promise<{ json: string; promptWithData: string }> {
  const allSessions = await WorkoutService.getAllSessions();
  const cutoff = Date.now() - NINETY_DAYS_MS;
  const recentSessions = allSessions
    .filter(s => s.startTime >= cutoff)
    .sort((a, b) => a.startTime - b.startTime);

  // Weekly volume over last full week
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const volumeByMuscle = WorkoutService.getWeeklyVolumeByMuscle(recentSessions, weekStart);

  // PR history: best weight × reps per exercise
  const prMap = new Map<string, { exerciseName: string; weightKg: number; reps: number; sessionDate: string }>();
  for (const session of recentSessions) {
    for (const ex of session.exercises) {
      for (const s of ex.sets) {
        if (s.kind !== 'working' || !s.weightKg || !s.reps) continue;
        const prev = prMap.get(ex.exerciseId);
        const orm = epley1RM(s.weightKg, s.reps);
        const prevOrm = prev ? epley1RM(prev.weightKg, prev.reps) : 0;
        if (orm > prevOrm) {
          prMap.set(ex.exerciseId, { exerciseName: ex.name, weightKg: s.weightKg, reps: s.reps, sessionDate: session.date });
        }
      }
    }
  }
  const prHistory = Array.from(prMap.entries()).map(([exerciseId, pr]) => ({
    exerciseId,
    exerciseName: pr.exerciseName,
    bestWeightKg: pr.weightKg,
    bestReps: pr.reps,
    estimatedOneRM: epley1RM(pr.weightKg, pr.reps),
    sessionDate: pr.sessionDate,
  }));

  // Average RIR per exercise
  const rirAccum: Record<string, { sum: number; count: number }> = {};
  for (const session of recentSessions) {
    for (const ex of session.exercises) {
      for (const s of ex.sets) {
        if (s.kind !== 'working' || s.rir === undefined) continue;
        rirAccum[ex.name] ??= { sum: 0, count: 0 };
        rirAccum[ex.name]!.sum += s.rir;
        rirAccum[ex.name]!.count += 1;
      }
    }
  }
  const averageRirPerExercise: Record<string, number> = {};
  for (const [name, { sum, count }] of Object.entries(rirAccum)) {
    averageRirPerExercise[name] = Math.round((sum / count) * 10) / 10;
  }

  // Progression suggestions for all routines
  const allExercises = routines.flatMap(r => r.exercises);
  const uniqueExercises = Array.from(new Map(allExercises.map(e => [e.exerciseId, e])).values());
  const suggestions = suggestProgression(uniqueExercises, recentSessions);
  const plateauedExercises = suggestions.filter(s => s.reason === 'deload').map(s => s.exerciseName);

  const payload: IAExportPayload = {
    exportedAt: new Date().toISOString(),
    periodDays: 90,
    routines,
    sessions: recentSessions,
    progressionSuggestions: suggestions.map(s => ({
      exerciseName: s.exerciseName,
      suggestedWeightKg: s.suggestedWeightKg,
      reason: s.reason,
      confidenceReps: s.confidenceReps,
    })),
    volumeByMuscle,
    prHistory,
    averageRirPerExercise,
    plateauedExercises,
  };

  const json = JSON.stringify(payload, null, 2);
  const promptWithData = IA_PROMPT_TEMPLATE + json;

  return { json, promptWithData };
}
