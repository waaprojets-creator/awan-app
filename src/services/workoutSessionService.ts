import { suggestProgression } from './autoProgressionService';
import { sessionAdherence } from './workoutAnalysisService';
import { scoreSession } from './sessionScoreService';
import { WorkoutService } from './workoutService';
import { OneRepMaxService } from './oneRepMaxService';
import { ds, dateId } from '../utils/storage';
import type { RoutineLatest, WorkoutSessionLatest, WorkoutExerciseLog } from '../data/schemas/sport/routine';
import type { ExerciseSetLatest, SetKind } from '../data/schemas/sport/exerciseSet';
import type { ActiveSession, ActiveExercise, ActiveSet, SessionSummary } from '../screens/sport/types';

export interface BuildActiveSessionInput {
  routine: RoutineLatest;
  routineSessions: WorkoutSessionLatest[];
  bestOneRMs: Record<string, number>;
  sessionId: string;
  now: number;
  isException?: boolean;
}

export interface BuildActiveSessionResult {
  session: ActiveSession;
  prevSessionVolume: number | null;
}

export function buildActiveSession({
  routine, routineSessions, bestOneRMs, sessionId, now, isException = false,
}: BuildActiveSessionInput): BuildActiveSessionResult {
  const lastSession = routineSessions[routineSessions.length - 1] ?? null;
  const suggestions = suggestProgression(routine.exercises, routineSessions);
  const suggestionMap = new Map(suggestions.map(s => [s.exerciseId, s.suggestedWeightKg]));

  const prevSessionVolume = lastSession
    ? lastSession.exercises.flatMap(e => e.sets.filter(s => s.kind === 'working'))
        .reduce((acc, s) => acc + (s.weightKg ?? 0) * (s.reps ?? 0), 0)
    : null;

  const exercises: ActiveExercise[] = routine.exercises.map((re, idx) => {
    const lastExerciseLog = lastSession?.exercises.find(e => e.rid === re.rid);
    const lastWorkingSet = lastExerciseLog?.sets
      .filter(s => s.kind === 'working')
      .slice(-1)[0];
    const plannedWeightKg = re.plannedWeightKg ?? undefined;
    const plannedReps = re.plannedReps;
    const suggestedWeight = suggestionMap.get(re.exerciseId);
    const prefillWeight = suggestedWeight ?? lastWorkingSet?.weightKg ?? plannedWeightKg;
    const sets: ActiveSet[] = Array.from({ length: re.plannedSets }, (_, i) => ({
      kind: 'working' as SetKind,
      weightKg: prefillWeight,
      reps: lastWorkingSet?.reps ?? plannedReps,
      plannedWeightKg,
      plannedReps,
      rir: undefined,
      completed: false,
      index: i,
    }));
    return {
      rid: re.rid,
      exerciseId: re.exerciseId,
      name: re.name,
      primaryMuscle: re.primaryMuscle,
      secondaryMuscles: re.secondaryMuscles,
      equipment: re.equipment,
      order: idx,
      restSec: re.restSec,
      sets,
    };
  });

  const session: ActiveSession = {
    id: sessionId,
    routineId: routine.id,
    routineName: routine.name,
    cycleLetter: routine.cycleLetter ?? null,
    startTime: now,
    arrivedAt: now,
    warmupStartedAt: undefined,
    workoutEndedAt: undefined,
    solo: true,
    availableTimeMin: undefined,
    isException,
    exercises,
    currentExerciseIdx: 0,
    restEndAt: null,
    stage: 'arrived',
    bestOneRMs,
  };

  return { session, prevSessionVolume };
}

export interface BuildSessionFromActiveInput {
  active: ActiveSession;
  summary: SessionSummary;
  endTime: number;
  date: string;
}

export function buildSessionFromActive({
  active, summary, endTime, date,
}: BuildSessionFromActiveInput): WorkoutSessionLatest {
  const exercisesLog: WorkoutExerciseLog[] = active.exercises.map(ex => ({
    rid: ex.rid,
    exerciseId: ex.exerciseId,
    name: ex.name,
    primaryMuscle: ex.primaryMuscle,
    secondaryMuscles: ex.secondaryMuscles,
    equipment: ex.equipment,
    order: ex.order,
    sets: ex.sets
      .filter(s => s.completed)
      .map<ExerciseSetLatest>(s => ({
        v: 2 as const,
        exerciseId: ex.exerciseId,
        kind: s.kind,
        reps: s.reps,
        weightKg: s.weightKg,
        plannedWeightKg: s.plannedWeightKg,
        plannedReps: s.plannedReps,
        rir: s.rir,
        restActualSec: s.restActualSec,
        note: s.note,
        completedAt: s.completedAt,
      })),
  }));

  const sessionBase: WorkoutSessionLatest = {
    v: 3,
    id: active.id,
    routineId: active.routineId,
    name: active.routineName,
    cycleLetter: active.cycleLetter,
    date,
    startTime: active.startTime,
    endTime,
    duration: Math.floor((endTime - active.startTime) / 1000),
    warmupStartedAt: active.warmupStartedAt,
    workoutEndedAt: active.workoutEndedAt ?? endTime,
    solo: active.solo,
    availableTimeMin: active.availableTimeMin,
    feeling: summary.feeling,
    sessionRPE: summary.sessionRPE,
    rpe: summary.sessionRPE,
    recoveryScore: active.recoveryScore,
    note: summary.note,
    isException: active.isException,
    exercises: exercisesLog,
    exitedAt: summary.exitedAt,
    tonnage: exercisesLog.reduce(
      (t, ex) => t + ex.sets.reduce((s, set) => set.kind === 'working' ? s + (set.weightKg ?? 0) * (set.reps ?? 0) : s, 0),
      0,
    ),
    durationMin: Math.round((endTime - active.startTime) / 60000),
    adherence: sessionAdherence({
      v: 3, id: active.id, routineId: active.routineId, name: active.routineName,
      cycleLetter: active.cycleLetter, date, startTime: active.startTime, endTime,
      duration: 0, solo: active.solo, isException: active.isException,
      exercises: exercisesLog, tonnage: 0, durationMin: 0,
    }),
  };

  return { ...sessionBase, scoreSeance: scoreSession(sessionBase) };
}

export function shouldAdvanceWeek(p: { startDate: string; mesoWeek: number }, now: Date): boolean {
  const weekBoundary = new Date(p.startDate);
  weekBoundary.setDate(weekBoundary.getDate() + p.mesoWeek * 7);
  return now >= weekBoundary;
}

export const WorkoutSessionService = {
  async prepareWorkout(
    routine: RoutineLatest,
    opts?: { isException?: boolean },
  ): Promise<BuildActiveSessionResult> {
    const allSessions = await WorkoutService.getAllSessions();
    const routineSessions = allSessions
      .filter(s => s.routineId === routine.id && !s.isException)
      .sort((a, b) => a.startTime - b.startTime);
    const bestOneRMs = await OneRepMaxService.getRecords();
    const now = Date.now();
    return buildActiveSession({
      routine, routineSessions, bestOneRMs,
      sessionId: dateId(ds(new Date(now))),
      now,
      isException: opts?.isException ?? false,
    });
  },
};
