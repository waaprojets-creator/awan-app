import type { WorkoutSessionLatest } from '@/data/schemas/sport/routine';
import { sessionAdherence } from './workoutAnalysisService';

// Session score 0-100
// Dimensions:
//   volumeVsPlan  : 30 pts (adherence to planned volume)
//   intensityRPE  : 25 pts (RPE in optimal range 6-8)
//   prFlag        : 10 pts (any PR set this session — heuristic: weight > historical avg)
//   feelingNorm   : 20 pts (feeling 1-5 normalized)
//   completeness  : 15 pts (% exercises with at least 1 completed working set)

export function scoreSession(session: WorkoutSessionLatest): number {
  // Volume adherence
  const adh = sessionAdherence(session);
  const volumeScore = Math.round(adh * 30);

  // Intensity from RPE (optimal = 6-8)
  const rpe = session.sessionRPE ?? 0;
  let intensityScore = 0;
  if (rpe > 0) {
    if (rpe >= 6 && rpe <= 8) intensityScore = 25;
    else if (rpe === 5 || rpe === 9) intensityScore = 18;
    else if (rpe === 4 || rpe === 10) intensityScore = 10;
    else intensityScore = 5;
  } else {
    intensityScore = 15; // unknown RPE — neutral
  }

  // Feeling (1-5 → 0-20 pts)
  const feeling = session.feeling ?? 3;
  const feelingScore = Math.round(((feeling - 1) / 4) * 20);

  // Completeness: pct of exercises with ≥1 completed working set
  const totalEx = session.exercises.length;
  const completedEx = session.exercises.filter(
    ex => ex.sets.some(s => s.kind === 'working' && s.completedAt),
  ).length;
  const completeness = totalEx > 0 ? completedEx / totalEx : 1;
  const completenessScore = Math.round(completeness * 15);

  // PR heuristic: if any set beat plannedWeightKg
  let prScore = 0;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (s.kind !== 'working') continue;
      const pw = 'plannedWeightKg' in s ? (s.plannedWeightKg ?? 0) : 0;
      if (pw > 0 && (s.weightKg ?? 0) > pw * 1.025) {
        prScore = 10;
        break;
      }
    }
    if (prScore > 0) break;
  }

  const total = volumeScore + intensityScore + feelingScore + completenessScore + prScore;
  return Math.max(0, Math.min(100, total));
}
