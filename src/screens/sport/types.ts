import type { SetKind } from '../../data/schemas/sport/exerciseSet';
import type { CycleLetter, RoutineExercise } from '../../data/schemas/sport/routine';

export interface RoutineDraft {
  existingId?: string | undefined;
  name: string;
  cycleLetter: CycleLetter | null;
  defaultRestSec: number;
  exercises: RoutineExercise[];
  savedAt?: number;
}

export interface ActiveSet {
  kind: SetKind;
  weightKg?: number | undefined;
  reps?: number | undefined;
  plannedWeightKg?: number | undefined;
  plannedReps?: number | undefined;
  rir?: number | undefined;
  restActualSec?: number | undefined;
  note?: string | undefined;
  completed: boolean;
  completedAt?: number | undefined;
  index: number;
  isPR?: boolean | undefined;
  setStartedAt?: number | undefined;
}

export interface ActiveExercise {
  rid: string;
  exerciseId: string;
  name: string;
  primaryMuscle?: string | undefined;
  secondaryMuscles?: string[] | undefined;
  equipment?: string | undefined;
  order: number;
  restSec: number;
  sets: ActiveSet[];
}

export interface ActiveSession {
  id: string;
  routineId: string;
  routineName: string;
  cycleLetter: CycleLetter | null;
  startTime: number;
  arrivedAt: number;
  warmupStartedAt?: number | undefined;
  workoutEndedAt?: number | undefined;
  solo: boolean;
  availableTimeMin?: number | undefined;
  isException: boolean;
  recoveryScore?: number | undefined;
  exercises: ActiveExercise[];
  currentExerciseIdx: number;
  restEndAt: number | null;
  stage: 'arrived' | 'workout' | 'done';
  bestOneRMs: Record<string, number>;
}

export interface SessionSummary {
  feeling?: number | undefined;
  sessionRPE?: number | undefined;
  note?: string | undefined;
  exitedAt?: number | undefined;
}
