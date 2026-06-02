import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ScrollView, TextInput as RNTextInput, Modal, FlatList as RNFlatList } from 'react-native';

const TextInput = RNTextInput as React.ComponentType<any>;
const FlatList = RNFlatList as React.ComponentType<any>;
import { motion } from 'motion/react';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import {
 MUSCLES,
 searchExercises,
 loadExerciseCatalog,
 type ExerciseEntry,
} from '../utils/sportData';
import { uid, ds } from '../utils/storage';
import {
 Play,
 Plus,
 Trash2,
 Clock,
 CheckCircle2,
 ChevronLeft,
 Dumbbell,
 History,
 Info,
 Target,
 X,
 Search,
 Minus,
 Timer,
 Flame,
} from 'lucide-react';
import { PageWrapper, StaggerList, StaggerItem } from '../components/Animated';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { sessionsThisWeek } from '../hooks/useAwanScore';
import { WorkoutService } from '../services/workoutService';
import { VOLUME_LANDMARKS } from '../constants/volumeLandmarks';
import { PeriodizationService } from '../services/periodizationService';
import {
 DEFAULT_PLANNED_SETS,
 DEFAULT_PLANNED_REPS,
 DEFAULT_REST_SEC,
 type RoutineExercise,
 type RoutineLatest,
 type WorkoutExerciseLog,
 type WorkoutSessionLatest,
 type CycleLetter,
} from '../data/schemas/sport/routine';
import type { ExerciseSetLatest, SetKind } from '../data/schemas/sport/exerciseSet';
import { scoreSession } from '../services/sessionScoreService';
import { sessionAdherence, sessionDensity, bestOneRmFromSession } from '../services/workoutAnalysisService';
import { computeCycleScore } from '../services/cycleScoreService';
import { suggestProgression } from '../services/autoProgressionService';
import { BodySvg } from '../components/BodySvg';
import type { MuscleId } from '../components/BodySvg';
import { buildIAExport } from '../services/iaExportService';
import { Download } from 'lucide-react';
import { WorkoutListView } from '../modules/sport/components/WorkoutListView';
import { RoutineGeneratorView } from '../modules/sport/components/RoutineGeneratorView';
import { cacheForRoutine } from '../services/mediaCacheService';
import { L } from '../constants/labels';

type ViewMode = 'list' | 'create' | 'edit' | 'active' | 'history' | 'finish' | 'recovery' | 'workouts' | 'generate';

const CYCLE_LETTERS: (CycleLetter | null)[] = [null, 'A', 'B', 'C', 'D'];

const SET_KIND_LABEL: Record<SetKind, string> = {
 warmup: 'ÉCHAUF.',
 working: 'WORKING',
 drop: 'DROP',
 failure: 'FAILURE',
};

const SET_KIND_COLOR: Record<SetKind, string> = {
 warmup: 'text-awan-tx-mute',
 working: 'text-awan-gold',
 drop: 'text-orange-400',
 failure: 'text-red-400',
};

const ACTIVE_SESSION_KEY = 'awan.sport.activeSession';
const BEST_ONERMS_KEY = 'awan.sport.bestOneRMs';
const ROUTINE_DRAFT_KEY = 'awan.sport.routineDraft';

interface RoutineDraft {
 existingId?: string | undefined;
 name: string;
 cycleLetter: CycleLetter | null;
 defaultRestSec: number;
 exercises: RoutineExercise[];
 savedAt: number;
}

function formatTime(s: number) {
 const mins = Math.floor(s / 60);
 const secs = s % 60;
 return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function computeOneRM(weightKg: number, reps: number): number {
 if (reps <= 0 || weightKg <= 0) return 0;
 return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

function loadBestOneRMs(): Record<string, number> {
 try { return JSON.parse(localStorage.getItem(BEST_ONERMS_KEY) ?? '{}'); } catch { return {}; }
}

async function notifyRestEnd() {
 try {
 const { LocalNotifications } = await import('@capacitor/local-notifications');
 const perm = await LocalNotifications.checkPermissions();
 if (perm.display !== 'granted') {
 await LocalNotifications.requestPermissions();
 }
 await LocalNotifications.schedule({
 notifications: [{
 id: 9001,
 title: 'AWAN SPORT',
 body: 'Repos terminé — Série suivante !',
 schedule: { at: new Date() },
 }],
 });
 } catch {
 try {
 const ctx = new AudioContext();
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();
 osc.connect(gain); gain.connect(ctx.destination);
 osc.frequency.setValueAtTime(880, ctx.currentTime);
 gain.gain.setValueAtTime(0.3, ctx.currentTime);
 gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
 osc.start(); osc.stop(ctx.currentTime + 0.4);
 } catch { /* silent */ }
 }
}

// Maps exercise-catalog muscle names to BodySvg MuscleIds. Bilateral muscles split to L/R.
const MUSCLE_TO_SVG: Partial<Record<string, MuscleId[]>> = {
  chest:      ['chest'],
  back:       ['lats', 'back_lower', 'traps'],
  shoulders:  ['front_delts', 'side_delts', 'rear_delts'],
  biceps:     ['biceps_left', 'biceps_right'],
  triceps:    ['triceps_left', 'triceps_right'],
  forearms:   ['forearms_left', 'forearms_right'],
  quads:      ['quads_left', 'quads_right'],
  hamstrings: ['hamstrings_left', 'hamstrings_right'],
  calves:     ['calves_left', 'calves_right'],
  glutes:     ['glutes'],
  abs:        ['abs'],
  obliques:   ['obliques'],
  traps:      ['traps'],
  lats:       ['lats'],
};
const MUSCLE_MRV: Record<string, number> = {
  chest: 22, back: 25, shoulders: 26, biceps: 26, triceps: 22,
  quads: 20, hamstrings: 20, calves: 20, glutes: 16, abs: 25,
};

function volumeToMuscleValues(vol: Record<string, number>): Partial<Record<MuscleId, number>> {
  const result: Partial<Record<MuscleId, number>> = {};
  for (const [muscle, sets] of Object.entries(vol)) {
    const ids = MUSCLE_TO_SVG[muscle.toLowerCase()];
    if (!ids) continue;
    const normalized = Math.min(1, sets / (MUSCLE_MRV[muscle.toLowerCase()] ?? 20));
    for (const id of ids) {
      result[id] = Math.max(result[id] ?? 0, normalized);
    }
  }
  return result;
}

function CycleScoreSection({ sessions }: { sessions: WorkoutSessionLatest[] }) {
  const result = useMemo(() => computeCycleScore(sessions), [sessions]);
  if (result.sessionsCount === 0) return null;
  const status = result.score >= 80 ? 'ok' : result.score >= 60 ? 'warn' : 'error';
  const statusVar = `var(--color-awan-status-${status})`;
  return (
    <div className="mb-6">
      <span className="awan-label text-awan-tx-mute mb-3 block">NOTE CYCLE — 4 SEMAINES</span>
      <Card className="p-5 bg-white/5">
        <div className="flex flex-row items-baseline gap-3 mb-3">
          <span className="text-4xl font-mono font-bold" style={{ color: statusVar }}>{result.score}</span>
          <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest">/ 100</span>
          <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest ml-auto">{result.sessionsCount} séances · {result.weeksObserved}/4 sem</span>
        </div>
        <span className="text-awan-md font-bold text-awan-tx block leading-relaxed">{result.diagnostic}</span>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <BreakdownChip label="ADH." value={result.breakdown.adherence} max={20} />
          <BreakdownChip label="FRÉQ." value={result.breakdown.frequency} max={20} />
          <BreakdownChip label="PROG." value={result.breakdown.progression} max={20} />
          <BreakdownChip label="PLATE." value={result.breakdown.plateau} max={15} />
          <BreakdownChip label="RÉCUP." value={result.breakdown.recovery} max={15} />
          <BreakdownChip label="CONST." value={result.breakdown.consistency} max={10} />
        </div>
      </Card>
    </div>
  );
}

function BreakdownChip({ label, value, max }: { label: string; value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  const color = ratio >= 0.8 ? 'var(--color-awan-status-ok)'
              : ratio >= 0.5 ? 'var(--color-awan-status-warn)'
              : 'var(--color-awan-status-error)';
  return (
    <div className="bg-white/5 px-2 py-1.5 flex flex-col items-center">
      <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">{label}</span>
      <span className="text-awan-md font-mono font-bold" style={{ color }}>{value}/{max}</span>
    </div>
  );
}

function VolumeHeatmapSection({ sessions }: { sessions: WorkoutSessionLatest[] }) {
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const vol = WorkoutService.getWeeklyVolumeByMuscle(sessions, weekStart);
  if (Object.values(vol).every(v => v === 0)) return null;
  const muscleValues = volumeToMuscleValues(vol);
  return (
    <div className="mb-6">
      <span className="awan-label text-awan-tx-mute mb-3 block">HEATMAP MUSCULAIRE — SEMAINE</span>
      <BodySvg mode="heatmap" muscleValues={muscleValues as Record<MuscleId, number>} />
    </div>
  );
}

function VolumeWeekSection({ sessions }: { sessions: WorkoutSessionLatest[] }) {
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const vol = WorkoutService.getWeeklyVolumeByMuscle(sessions, weekStart);
  const entries = Object.entries(VOLUME_LANDMARKS).filter(([k]) => (vol[k] ?? 0) > 0 || true).slice(0, 6);
  if (entries.every(([k]) => (vol[k] ?? 0) === 0)) return null;
  return (
    <div className="mb-6">
      <span className="awan-label text-awan-tx-mute mb-3 block">VOLUME SEMAINE</span>
      <div className="flex flex-col gap-2">
        {entries.map(([muscle, lm]) => {
          const sets = vol[muscle] ?? 0;
          if (sets === 0) return null;
          const pct = Math.min(100, (sets / lm.mrv) * 100);
          const barColor = sets < lm.mev ? 'var(--color-awan-status-error)' : sets <= lm.mav[1] ? 'var(--color-awan-status-ok)' : sets >= lm.mrv * 0.8 ? 'var(--color-awan-status-warn)' : 'var(--color-awan-status-ok)';
          return (
            <div key={muscle} className="flex flex-row items-center gap-3">
              <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest w-20 shrink-0">{lm.label}</span>
              <div className="flex-1 h-[3px] bg-white/5 relative">
                <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
              <span className="text-awan-md font-bold font-mono" style={{ color: barColor, minWidth: 32, textAlign: 'right' }}>{sets}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SportScreen() {
 useAppState() as any;
 const { addEntry, moveEntry, getEntriesByDate } = useDaily();
 const workoutStore = useWorkoutStore();

 const [view, setView] = useState<ViewMode>('list');
 const [editingRoutine, setEditingRoutine] = useState<RoutineLatest | null>(null);
 const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
 const [pendingRoutine, setPendingRoutine] = useState<{ routine: RoutineLatest; opts?: { isException?: boolean } } | null>(null);
 const [recoveryScore, setRecoveryScore] = useState<number | null>(null);
 const [resumeModal, setResumeModal] = useState<ActiveSession | null>(null);
 const [draftResumeModal, setDraftResumeModal] = useState<RoutineDraft | null>(null);
 const [draftToResume, setDraftToResume] = useState<RoutineDraft | null>(null);
 const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
 const [timer, setTimer] = useState(0);
 const timerRef = useRef<any>(null);
 const prevSessionVolumeRef = useRef<number | null>(null);

 const today = ds(new Date());

 // Catalogue chargé à la demande (B.3) — pas au mount

 useEffect(() => {
 try {
 const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
 if (saved) setResumeModal(JSON.parse(saved) as ActiveSession);
 } catch { /* ignore */ }
 try {
 const savedDraft = localStorage.getItem(ROUTINE_DRAFT_KEY);
 if (savedDraft) setDraftResumeModal(JSON.parse(savedDraft) as RoutineDraft);
 } catch { /* ignore */ }
 }, []);

 useEffect(() => {
 if (!activeSession) { localStorage.removeItem(ACTIVE_SESSION_KEY); return; }
 const save = () => { try { localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeSession)); } catch { /* ignore */ } };
 save();
 const id = setInterval(save, 30_000);
 return () => clearInterval(id);
 }, [activeSession]);

 useEffect(() => {
 if (activeSession) {
 timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
 } else {
 clearInterval(timerRef.current);
 setTimer(0);
 }
 return () => clearInterval(timerRef.current);
 }, [activeSession]);

 const nextRoutine = useMemo(() => {
 if (workoutStore.loading) return null;
 const cycled = workoutStore.routines.filter(r => r.cycleLetter);
 if (cycled.length === 0) return workoutStore.routines[0] ?? null;
 const lastReal = workoutStore.sessions
 .filter(s => !s.isException && s.cycleLetter)
 .sort((a, b) => b.startTime - a.startTime)[0];
 const order: CycleLetter[] = ['A', 'B', 'C', 'D'];
 const available = Array.from(new Set(cycled.map(r => r.cycleLetter).filter(Boolean) as CycleLetter[]))
 .sort((a, b) => order.indexOf(a) - order.indexOf(b));
 if (!lastReal?.cycleLetter) return cycled[0] ?? null;
 const curIdx = order.indexOf(lastReal.cycleLetter);
 const next = available.find(l => order.indexOf(l) > curIdx) ?? available[0];
 return cycled.find(r => r.cycleLetter === next) ?? cycled[0] ?? null;
 }, [workoutStore.routines, workoutStore.sessions, workoutStore.loading]);

 const saveRoutine = useCallback((r: RoutineLatest) => {
 workoutStore.saveRoutine(r);
 try { localStorage.removeItem(ROUTINE_DRAFT_KEY); } catch { /* ignore */ }
 setEditingRoutine(null);
 setView('list');
 }, [workoutStore]);

 const cancelRoutineEdit = useCallback(() => {
 try { localStorage.removeItem(ROUTINE_DRAFT_KEY); } catch { /* ignore */ }
 setDraftToResume(null);
 setEditingRoutine(null);
 setView('list');
 }, []);

 const startWorkout = useCallback(async (routine: RoutineLatest, opts?: { isException?: boolean }) => {
 const allSessions = await WorkoutService.getAllSessions();
 const routineSessions = allSessions
   .filter(s => s.routineId === routine.id && !s.isException)
   .sort((a, b) => a.startTime - b.startTime);
 const lastSession = routineSessions[routineSessions.length - 1] ?? null;
 // S7: auto-progression suggestions
 const suggestions = suggestProgression(routine.exercises, routineSessions);
 const suggestionMap = new Map(suggestions.map(s => [s.exerciseId, s.suggestedWeightKg]));
 // Stocker le volume de la session précédente pour le delta post-séance
 if (lastSession) {
 const prevVol = lastSession.exercises.flatMap(e => e.sets.filter(s => s.kind === 'working'))
 .reduce((acc, s) => acc + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
 prevSessionVolumeRef.current = prevVol;
 } else {
 prevSessionVolumeRef.current = null;
 }
 const now = Date.now();
 const exercises: ActiveExercise[] = routine.exercises.map((re, idx) => {
 const lastExerciseLog = lastSession?.exercises.find(e => e.rid === re.rid);
 const lastWorkingSet = lastExerciseLog?.sets
 .filter(s => s.kind === 'working')
 .slice(-1)[0];
 const plannedWeightKg = re.plannedWeightKg ?? undefined;
 const plannedReps = re.plannedReps;
 // S7: suggested weight overrides last actual; last actual overrides planned
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
 setActiveSession({
 id: uid(),
 routineId: routine.id,
 routineName: routine.name,
 cycleLetter: routine.cycleLetter ?? null,
 startTime: now,
 arrivedAt: now,
 warmupStartedAt: undefined,
 workoutEndedAt: undefined,
 solo: true,
 availableTimeMin: undefined,
 isException: opts?.isException ?? false,
 exercises,
 currentExerciseIdx: 0,
 restEndAt: null,
 stage: 'arrived',
 bestOneRMs: loadBestOneRMs(),
 });
 setView('active');
 }, []);

 const handleSessionUpdate = useCallback((updater: (s: ActiveSession) => ActiveSession) => {
 setActiveSession(prev => (prev ? updater(prev) : prev));
 }, []);

 const handleFinishWorkout = useCallback((summary: SessionSummary) => {
 if (!activeSession) return;
 const endTime = Date.now();
 const exercisesLog: WorkoutExerciseLog[] = activeSession.exercises.map(ex => ({
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
 v: 2,
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
 id: activeSession.id,
 routineId: activeSession.routineId,
 name: activeSession.routineName,
 cycleLetter: activeSession.cycleLetter,
 date: ds(new Date()),
 startTime: activeSession.startTime,
 endTime,
 duration: Math.floor((endTime - activeSession.startTime) / 1000),
 warmupStartedAt: activeSession.warmupStartedAt,
 workoutEndedAt: activeSession.workoutEndedAt ?? endTime,
 solo: activeSession.solo,
 availableTimeMin: activeSession.availableTimeMin,
 feeling: summary.feeling,
 sessionRPE: summary.sessionRPE,
 rpe: summary.sessionRPE,
 recoveryScore: activeSession.recoveryScore,
 note: summary.note,
 isException: activeSession.isException,
 exercises: exercisesLog,
 exitedAt: summary.exitedAt,
 tonnage: exercisesLog.reduce((t, ex) => t + ex.sets.reduce((s, set) => set.kind === 'working' ? s + (set.weightKg ?? 0) * (set.reps ?? 0) : s, 0), 0),
 durationMin: Math.round((endTime - activeSession.startTime) / 60000),
 adherence: sessionAdherence({ v: 3, id: activeSession.id, routineId: activeSession.routineId, name: activeSession.routineName, cycleLetter: activeSession.cycleLetter, date: ds(new Date()), startTime: activeSession.startTime, endTime, duration: 0, solo: activeSession.solo, isException: activeSession.isException, exercises: exercisesLog, tonnage: 0, durationMin: 0 }),
 };
 const session: WorkoutSessionLatest = {
 ...sessionBase,
 scoreSeance: scoreSession(sessionBase),
 };

 workoutStore.saveSession(session);

 // Advance meso week if current date is past the next week boundary
 (() => {
   const p = PeriodizationService.getOrInit();
   const weekBoundary = new Date(p.startDate);
   weekBoundary.setDate(weekBoundary.getDate() + p.mesoWeek * 7);
   if (new Date() >= weekBoundary) {
     PeriodizationService.advanceWeek();
   }
 })();

 const workingCount = exercisesLog.reduce(
 (acc, ex) => acc + ex.sets.filter(s => s.kind === 'working').length,
 0,
 );

 addEntry(ds(new Date()), {
 id: uid(),
 timestamp: Date.now(),
 module: 'sport',
 rawText: `Séance: ${session.name} (${Math.floor(session.duration / 60)} min)`,
 tokens: [
 { label: 'Routine', value: session.name, icon: 'dumbbell' },
 { label: 'Durée', value: `${Math.floor(session.duration / 60)} min`, icon: 'clock' },
 { label: 'Sets working', value: String(workingCount), icon: 'hash' },
 ],
 });

 localStorage.removeItem(ACTIVE_SESSION_KEY);
 setActiveSession(null);
 setView('list');
 }, [activeSession, workoutStore, addEntry]);

 const deleteRoutine = useCallback((r: RoutineLatest) => {
 setConfirmDeleteId(r.id);
 }, []);

 const handleRoutineStart = useCallback((r: RoutineLatest) => {
 setPendingRoutine({ routine: r }); setRecoveryScore(null); setView('recovery');
 }, []);
 const handleRoutineEdit = useCallback((r: RoutineLatest) => {
 setEditingRoutine(r); setView('edit');
 }, []);
 const handleRoutineDeleteExecute = useCallback((id: string) => {
 workoutStore.deleteRoutine(id); setConfirmDeleteId(null);
 }, [workoutStore]);
 const handleRoutineDeleteCancel = useCallback(() => setConfirmDeleteId(null), []);

 if (view === 'recovery' && pendingRoutine) {
 return (
   <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
     <div className="px-6 pt-4 pb-2">
       <ScreenHeader tag="SPORT · RÉCUPÉRATION" title={pendingRoutine.routine.name} />
     </div>
     <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
       <div className="w-full">
         <span className="block text-center text-awan-sm font-black text-awan-tx-mute tracking-widest uppercase mb-6">
           SCORE DE RÉCUPÉRATION DU JOUR
         </span>
         <div className="flex flex-row flex-wrap justify-center gap-3">
           {[1,2,3,4,5,6,7,8,9,10].map(n => (
             <button
               key={n}
               onClick={() => setRecoveryScore(n)}
               style={{
                 width: 44, height: 44,
                 fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                 background: recoveryScore === n ? 'var(--color-awan-gold)' : 'var(--color-awan-surface)',
                 color: recoveryScore === n ? '#000' : 'var(--color-awan-tx)',
                 border: recoveryScore === n ? 'none' : '1px solid rgba(128,128,128,0.25)',
                 cursor: 'pointer',
               }}
             >
               {n}
             </button>
           ))}
         </div>
         <div className="flex flex-row justify-between mt-4 px-2">
           <span className="text-awan-sm text-awan-tx-mute font-bold uppercase tracking-widest">épuisé</span>
           <span className="text-awan-sm text-awan-tx-mute font-bold uppercase tracking-widest">parfait</span>
         </div>
       </div>
       <div className="flex flex-col gap-3 w-full">
         <Touch
           onPress={async () => {
             if (!pendingRoutine) return;
             await startWorkout(pendingRoutine.routine, pendingRoutine.opts);
             setPendingRoutine(null);
             // Store recovery score to be saved in session via handleSessionUpdate
             if (recoveryScore !== null) {
               handleSessionUpdate(s => ({ ...s, recoveryScore }));
             }
           }}
           className="bg-awan-gold p-4 items-center"
         >
           <span className="text-awan-lg font-black text-black uppercase tracking-widest">
             {recoveryScore !== null ? `DÉMARRER — RÉCUP ${recoveryScore}/10` : 'DÉMARRER SANS NOTER'}
           </span>
         </Touch>
         <Touch onPress={() => { setPendingRoutine(null); setView('list'); }} className="p-4 items-center" style={{ border: '1px solid rgba(128,128,128,0.25)' }}>
           <span className="text-awan-md font-bold text-awan-tx-mute uppercase tracking-widest">ANNULER</span>
         </Touch>
       </div>
     </div>
   </PageWrapper>
 );
 }

 if (view === 'create' || view === 'edit') {
 return (
 <RoutineEditor
 existing={view === 'edit' ? editingRoutine : null}
 initialDraft={draftToResume}
 onSave={saveRoutine}
 onCancel={cancelRoutineEdit}
 />
 );
 }

 if (view === 'active' && activeSession) {
 return (
 <ActiveWorkout
 session={activeSession}
 timer={timer}
 onUpdate={handleSessionUpdate}
 onFinishRequest={() => setView('finish')}
 onAbort={() => {
 localStorage.removeItem(ACTIVE_SESSION_KEY);
 setActiveSession(null);
 setView('list');
 }}
 />
 );
 }

 if (view === 'finish' && activeSession) {
 return (
 <FinishWorkout
 session={activeSession}
 prevVolume={prevSessionVolumeRef.current}
 onSave={handleFinishWorkout}
 onCancel={() => setView('active')}
 />
 );
 }

 if (view === 'history') {
 return <WorkoutHistory logs={workoutStore.sessions} onBack={() => setView('list')} />;
 }

 if (view === 'workouts') {
 return (
 <WorkoutListView
 routines={workoutStore.routines}
 sessions={workoutStore.sessions}
 onBack={() => setView('list')}
 onGenerate={() => setView('generate')}
 onStart={(r) => { setPendingRoutine({ routine: r }); setRecoveryScore(null); setView('recovery'); }}
 onDelete={(id) => workoutStore.deleteRoutine(id)}
 onAdopt={(r) => workoutStore.saveRoutine({ ...r, source: 'user' })}
 />
 );
 }

 if (view === 'generate') {
 return (
 <RoutineGeneratorView
 onBack={() => setView('workouts')}
 onSave={async (routines) => {
 await Promise.all(routines.map(r => workoutStore.saveRoutine(r)));
 // Pre-warm image cache silently after saving
 const ids = routines.flatMap(r => r.exercises.map(e => e.exerciseId));
 cacheForRoutine(ids).catch(() => {});
 setView('workouts');
 }}
 />
 );
 }

 return (
 <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
 {resumeModal && (
 <Modal visible={true} transparent animationType="fade">
 <div className="flex-1 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
 <div className="w-full bg-awan-surface rounded-t-3xl border-t border-white/10 p-6 pb-10">
 <span className="awan-label text-awan-gold mb-2 block">SÉANCE EN COURS</span>
 <span className="text-lg font-bold text-awan-tx uppercase mb-1 block">{resumeModal.routineName}</span>
 <span className="text-awan-md font-bold text-awan-tx-mute uppercase tracking-widest mb-6 block">
 Démarrée à {new Date(resumeModal.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
 </span>
 <div className="flex flex-row gap-3">
 <Touch
 className="flex-1 h-14 bg-awan-gold flex items-center justify-center"
 onPress={() => { setActiveSession(resumeModal); setResumeModal(null); setView('active'); }}
 >
 <span className="awan-label text-black font-black">REPRENDRE</span>
 </Touch>
 <Touch
 className="flex-1 h-14 bg-white/5 border border-white/10 flex items-center justify-center"
 onPress={() => { localStorage.removeItem(ACTIVE_SESSION_KEY); setResumeModal(null); }}
 >
 <span className="awan-label text-awan-tx-mute">ABANDONNER</span>
 </Touch>
 </div>
 </div>
 </div>
 </Modal>
 )}
 {!resumeModal && draftResumeModal && (
 <Modal visible={true} transparent animationType="fade">
 <div className="flex-1 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
 <div className="w-full bg-awan-surface rounded-t-3xl border-t border-white/10 p-6 pb-10">
 <span className="awan-label text-awan-gold mb-2 block">ROUTINE EN COURS D'ÉDITION</span>
 <span className="text-lg font-bold text-awan-tx uppercase mb-1 block">
 {draftResumeModal.name.trim() || 'SANS NOM'}
 </span>
 <span className="text-awan-md font-bold text-awan-tx-mute uppercase tracking-widest mb-6 block">
 {draftResumeModal.exercises.length} EXERCICES · Sauvegardé à {new Date(draftResumeModal.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
 </span>
 <div className="flex flex-row gap-3">
 <Touch
 className="flex-1 h-14 bg-awan-gold flex items-center justify-center"
 onPress={() => {
 const draft = draftResumeModal;
 setDraftToResume(draft);
 setDraftResumeModal(null);
 const existing = draft.existingId
 ? workoutStore.routines.find(r => r.id === draft.existingId) ?? null
 : null;
 setEditingRoutine(existing);
 setView(existing ? 'edit' : 'create');
 }}
 >
 <span className="awan-label text-black font-black">REPRENDRE</span>
 </Touch>
 <Touch
 className="flex-1 h-14 bg-white/5 border border-white/10 flex items-center justify-center"
 onPress={() => { try { localStorage.removeItem(ROUTINE_DRAFT_KEY); } catch { /* ignore */ } setDraftResumeModal(null); }}
 >
 <span className="awan-label text-awan-tx-mute">ABANDONNER</span>
 </Touch>
 </div>
 </div>
 </div>
 </Modal>
 )}
 <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
 <div className="px-6 pt-4 pb-6">
 <ScreenHeader tag="BODY · SPORT" title="SPORT" />
 {(() => {
   const p = PeriodizationService.getOrInit();
   return (
     <div className="mb-4 px-1">
       <span className="text-awan-sm font-black text-awan-tx-mute tracking-widest uppercase">
         PHASE {p.phase} · SEMAINE {p.mesoWeek} · {PeriodizationService.getPhaseLabel(p.phase)}
       </span>
     </div>
   );
 })()}

 <div className="grid grid-cols-2 gap-3 mb-6">
 {(() => {
 const cnt = sessionsThisWeek(workoutStore.sessions as any);
 const pct = Math.min(100, cnt * 25);
 return (
 <>
 <InstrumentCard
 label="FLUX"
 value={`${pct}`}
 unit="%"
 status={pct >= 75 ? 'ok' : pct >= 40 ? 'warn' : 'error'}
 progress={pct}
 index={1}
 />
 <InstrumentCard
 label="SÉANCES"
 value={cnt}
 unit="/sem"
 status={cnt > 0 ? 'ok' : 'mute'}
 index={2}
 />
 </>
 );
 })()}
 </div>

 <VolumeWeekSection sessions={workoutStore.sessions as WorkoutSessionLatest[]} />
 <CycleScoreSection sessions={workoutStore.sessions as WorkoutSessionLatest[]} />
 <VolumeHeatmapSection sessions={workoutStore.sessions as WorkoutSessionLatest[]} />

 {nextRoutine && (
 <Card className="p-6 bg-awan-gold/5 border-awan-gold/20 mb-6" onPress={() => { setPendingRoutine({ routine: nextRoutine }); setRecoveryScore(null); setView('recovery'); }}>
 <div className="flex flex-row items-center justify-between">
 <div className="flex-1">
 <span className="awan-label text-awan-gold mb-1 block">PROCHAINE SÉANCE</span>
 <Heading level={3} className="mb-1">{nextRoutine.name}</Heading>
 <div className="flex flex-row items-center gap-3 mt-2">
 {nextRoutine.cycleLetter && (
 <div className="bg-awan-gold/15 px-2 py-0.5 rounded border border-awan-gold/30">
 <span className="text-awan-sm font-black text-awan-gold tracking-widest">CYCLE {nextRoutine.cycleLetter}</span>
 </div>
 )}
 <span className="text-awan-md font-bold text-awan-tx-mute uppercase tracking-widest">
 {nextRoutine.exercises.length} EXERCICES
 </span>
 </div>
 </div>
 <div className="w-14 h-14 bg-awan-gold flex items-center justify-center shadow-xl shadow-awan-gold/30">
 <Play size={24} color="black" strokeWidth={3} />
 </div>
 </div>
 </Card>
 )}

 <div className="mb-3 flex flex-row gap-3">
 <Touch
 className="flex-1 h-14 bg-awan-gold flex items-center justify-center"
 onPress={() => { setEditingRoutine(null); setView('create'); }}
 >
 <div className="flex flex-row items-center gap-2">
 <Plus size={18} color="black" strokeWidth={3} />
 <span className="awan-label text-black font-black">NOUVELLE ROUTINE</span>
 </div>
 </Touch>
 <Touch
 className="px-5 h-14 bg-white/5 flex items-center justify-center border border-white/10"
 onPress={() => setView('history')}
 >
 <History size={18} className="text-awan-tx-mute" />
 </Touch>
 </div>
 <Touch
 className="mb-3 h-12 bg-white/5 flex items-center justify-center border border-white/10"
 onPress={() => setView('workouts')}
 >
 <span className="awan-label text-awan-tx-mute">{L.sport.myRoutines} →</span>
 </Touch>
 <Touch
 className="mb-6 h-12 bg-white/5 flex items-center justify-center border border-white/10 flex-row gap-2"
 onPress={async () => {
   const { json, promptWithData } = await buildIAExport(workoutStore.routines);
   try { await navigator.clipboard.writeText(promptWithData); } catch { /* ignore */ }
   const blob = new Blob([json], { type: 'application/json' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url; a.download = `awan-sport-ia-${ds(new Date())}.json`; a.click();
   URL.revokeObjectURL(url);
 }}
 >
 <Download size={14} className="text-awan-tx-mute" />
 <span className="awan-label text-awan-tx-mute">EXPORT ANALYSE IA</span>
 </Touch>

 <div className="mb-20">
 <Heading level={4} mono subtitle="Protocoles Enregistrés">ROUTINES</Heading>
 {workoutStore.routines.length === 0 ? (
 <Card className="py-16 items-center bg-white/5 border-white/10 border-dashed">
 <Dumbbell size={48} className="text-white/10 mb-6" />
 <span className="awan-label mb-2">AUCUNE ROUTINE</span>
 </Card>
 ) : (
 <StaggerList>
 {workoutStore.routines.map(r => (
 <StaggerItem key={r.id} className="mb-4">
 <RoutineCard
 routine={r}
 isConfirmingDelete={confirmDeleteId === r.id}
 onStart={handleRoutineStart}
 onEdit={handleRoutineEdit}
 onDeleteExecute={handleRoutineDeleteExecute}
 onDeleteCancel={handleRoutineDeleteCancel}
 onDeleteRequest={deleteRoutine}
 />
 </StaggerItem>
 ))}
 </StaggerList>
 )}
 </div>
 </div>
 </ScrollView>
 </PageWrapper>
 );
}

// ─── Types pour state local actif ───────────────────────────────────────────

interface ActiveSet {
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

interface ActiveExercise {
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

interface ActiveSession {
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

interface SessionSummary {
 feeling?: number | undefined;
 sessionRPE?: number | undefined;
 note?: string | undefined;
 exitedAt?: number | undefined;
}

// ─── Routine Editor ──────────────────────────────────────────────────────────

function RoutineEditor({
 existing,
 initialDraft,
 onSave,
 onCancel,
}: {
 existing: RoutineLatest | null;
 initialDraft?: RoutineDraft | null | undefined;
 onSave: (r: RoutineLatest) => void;
 onCancel: () => void;
}) {
 const useDraft = !!initialDraft;
 const [name, setName] = useState(useDraft ? initialDraft!.name : (existing?.name ?? ''));
 const [cycleLetter, setCycleLetter] = useState<CycleLetter | null>(
 useDraft ? initialDraft!.cycleLetter : (existing?.cycleLetter ?? null),
 );
 const [defaultRestSec, setDefaultRestSec] = useState(
 useDraft ? initialDraft!.defaultRestSec : (existing?.defaultRestSec ?? DEFAULT_REST_SEC),
 );
 const [exercises, setExercises] = useState<RoutineExercise[]>(
 useDraft ? initialDraft!.exercises : (existing?.exercises ?? []),
 );
 const [isPicking, setIsPicking] = useState(false);
 const [viewingEx, setViewingEx] = useState<ExerciseEntry | null>(null);
 const [saveError, setSaveError] = useState('');

 // S1.2 — Persistance debouncée du draft de routine
 useEffect(() => {
 const handle = setTimeout(() => {
 const draft: RoutineDraft = {
 existingId: existing?.id,
 name,
 cycleLetter,
 defaultRestSec,
 exercises,
 savedAt: Date.now(),
 };
 try { localStorage.setItem(ROUTINE_DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota */ }
 }, 1000);
 return () => clearTimeout(handle);
 }, [name, cycleLetter, defaultRestSec, exercises, existing]);

 const addExercise = useCallback((ex: ExerciseEntry) => {
 setExercises(prev => [
 ...prev,
 {
 rid: uid(),
 exerciseId: ex.id,
 name: ex.n,
 primaryMuscle: ex.pm[0],
 secondaryMuscles: ex.sm,
 equipment: ex.eq,
 plannedSets: DEFAULT_PLANNED_SETS,
 plannedReps: DEFAULT_PLANNED_REPS,
 plannedWeightKg: undefined,
 restSec: defaultRestSec,
 order: prev.length,
 },
 ]);
 setIsPicking(false);
 }, [defaultRestSec]);

 const updateExercise = useCallback((idx: number, patch: Partial<RoutineExercise>) => {
 setExercises(prev => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
 }, []);

 const removeExercise = useCallback((idx: number) => {
 setExercises(prev => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, order: i })));
 }, []);

 const handleSave = useCallback(() => {
 const trimmed = name.trim();
 if (!trimmed) { setSaveError('Donne un nom à la routine'); return; }
 if (exercises.length === 0) { setSaveError('Ajoute au moins un exercice'); return; }
 setSaveError('');
 const routine: RoutineLatest = {
 v: 1,
 id: existing?.id ?? uid(),
 name: trimmed,
 cycleLetter,
 exercises,
 defaultRestSec,
 createdAt: existing?.createdAt ?? Date.now(),
 };
 onSave(routine);
 }, [name, cycleLetter, exercises, defaultRestSec, existing, onSave]);

 return (
 <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }} className="bg-awan-bg">
 <div style={{ flexShrink: 0 }} className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
 <div className="flex flex-row items-center gap-4">
 <Touch onPress={onCancel} className="w-10 h-10 bg-white/5 flex items-center justify-center">
 <ChevronLeft size={20} className="text-awan-tx-mute" />
 </Touch>
 <Heading level={2} className="mb-0 flex-1" subtitle={existing ? 'Modification' : 'Nouvelle routine'}>PROTOCOLE</Heading>
 <Touch onPress={handleSave} className="w-10 h-10 bg-awan-gold flex items-center justify-center shadow-lg shadow-awan-gold/20">
 <CheckCircle2 size={20} color="black" strokeWidth={3} />
 </Touch>
 </div>
 </div>

 <ScrollView contentContainerStyle={{ paddingBottom: 140, padding: 24 }} style={{ flex: 1, minHeight: 0 }}>
 <div className="mb-6">
 <span className="awan-label mb-3 block">NOM</span>
 <TextInput
 className="bg-white/5 border border-white/5 p-5 text-awan-tx font-bold text-base"
 value={name}
 onChangeText={(v: string) => { setName(v); if (saveError) setSaveError(''); }}
 placeholder="Push, Pull, Legs..."
 placeholderTextColor="#3a3a3a"
 />
 {saveError ? (
   <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-awan-status-error)', letterSpacing: '0.15em', marginTop: 6, display: 'block' }}>
     ⚠ {saveError.toUpperCase()}
   </span>
 ) : null}
 </div>

 <div className="mb-6">
 <span className="awan-label mb-3 block">CYCLE A/B/C/D</span>
 <div className="flex flex-row gap-2">
 {CYCLE_LETTERS.map(l => (
 <Touch
 key={l ?? 'none'}
 onPress={() => setCycleLetter(l)}
 className={`flex-1 h-12 border flex items-center justify-center ${
 cycleLetter === l ? 'bg-awan-gold border-awan-gold' : 'bg-white/5 border-white/5'
 }`}
 >
 <span className={`text-sm font-black ${cycleLetter === l ? 'text-black' : 'text-awan-tx-mute'}`}>
 {l ?? '—'}
 </span>
 </Touch>
 ))}
 </div>
 </div>

 <div className="mb-6">
 <span className="awan-label mb-3 block">REPOS PAR DÉFAUT (sec)</span>
 <div className="flex flex-row items-center gap-3">
 <Touch onPress={() => setDefaultRestSec(Math.max(0, defaultRestSec - 15))} className="w-12 h-12 bg-white/5 flex items-center justify-center">
 <Minus size={16} className="text-awan-tx-mute" />
 </Touch>
 <div className="flex-1 bg-awan-surface h-12 flex items-center justify-center">
 <span className="text-awan-gold font-mono font-bold text-lg">{defaultRestSec}s</span>
 </div>
 <Touch onPress={() => setDefaultRestSec(defaultRestSec + 15)} className="w-12 h-12 bg-white/5 flex items-center justify-center">
 <Plus size={16} className="text-awan-tx-mute" />
 </Touch>
 </div>
 </div>

 <div className="mb-6">
 <Heading level={4} mono subtitle={`${exercises.length} indexé(s)`}>EXERCICES</Heading>
 {exercises.length === 0 && (
 <div className="py-12 border-2 border-dashed border-white/5 items-center">
 <span className="text-awan-md font-bold text-awan-tx-mute uppercase tracking-[0.2em] italic">Aucun exercice</span>
 </div>
 )}
 <StaggerList>
 {exercises.map((ex, idx) => (
 <StaggerItem key={ex.rid} className="mb-3">
 <Card className="p-4 bg-white/5" variant="flat">
 <div className="flex flex-row items-start justify-between mb-3">
 <div className="flex-1">
 <span className="text-sm font-bold text-awan-tx uppercase tracking-tight block">{ex.name}</span>
 <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-widest">
 {MUSCLES[ex.primaryMuscle ?? '']} • {ex.equipment}
 </span>
 </div>
 <div className="flex flex-row items-center gap-2">
 <Touch onPress={() => {
 const full = searchExercises('').find(e => e.id === ex.exerciseId);
 if (full) setViewingEx(full);
 }} className="w-8 h-8 bg-white/5 flex items-center justify-center border border-white/10">
 <Info size={14} className="text-awan-tx-mute" />
 </Touch>
 <Touch onPress={() => removeExercise(idx)}>
 <Trash2 size={16} className="text-awan-status-error/40" />
 </Touch>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-2">
 <NumField
 label="SETS"
 value={ex.plannedSets}
 onChange={v => updateExercise(idx, { plannedSets: v })}
 step={1}
 min={1}
 />
 <NumField
 label="REPS"
 value={ex.plannedReps}
 onChange={v => updateExercise(idx, { plannedReps: v })}
 step={1}
 min={1}
 />
 <NumField
 label="REPOS (s)"
 value={ex.restSec}
 onChange={v => updateExercise(idx, { restSec: v })}
 step={15}
 min={0}
 />
 </div>
 </Card>
 </StaggerItem>
 ))}
 </StaggerList>
 <Touch
 className="mt-4 h-14 bg-white/5 border border-dashed border-awan-gold/40 flex items-center justify-center"
 onPress={() => { void loadExerciseCatalog().then(() => setIsPicking(true)); }}
 >
 <div className="flex flex-row items-center gap-3">
 <Plus size={18} className="text-awan-gold" />
 <span className="awan-label text-awan-gold">AJOUTER UN EXERCICE</span>
 </div>
 </Touch>
 </div>
 </ScrollView>

 <ExercisePicker
 visible={isPicking}
 onClose={() => setIsPicking(false)}
 onPick={addExercise}
 onViewDetail={setViewingEx}
 />
 <ExerciseDetail exercise={viewingEx} onClose={() => setViewingEx(null)} />
 </div>
 );
}

function NumField({
 label,
 value,
 onChange,
 step,
 min,
}: {
 label: string;
 value: number;
 onChange: (v: number) => void;
 step: number;
 min: number;
}) {
 return (
 <div>
 <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-widest mb-1 block">{label}</span>
 <div className="flex flex-row items-center gap-1">
 <Touch onPress={() => onChange(Math.max(min, value - step))} className="w-8 h-10 bg-awan-surface flex items-center justify-center">
 <Minus size={12} className="text-awan-tx-mute" />
 </Touch>
 <div className="flex-1 bg-awan-surface h-10 flex items-center justify-center">
 <span className="text-awan-tx font-mono font-bold text-sm">{value}</span>
 </div>
 <Touch onPress={() => onChange(value + step)} className="w-8 h-10 bg-awan-surface flex items-center justify-center">
 <Plus size={12} className="text-awan-tx-mute" />
 </Touch>
 </div>
 </div>
 );
}

// ─── Exercise Picker ────────────────────────────────────────────────────────

// ─── Routine card (memoized to prevent re-renders on unrelated state changes) ─

interface RoutineCardProps {
  routine: RoutineLatest;
  isConfirmingDelete: boolean;
  onStart: (r: RoutineLatest) => void;
  onEdit: (r: RoutineLatest) => void;
  onDeleteExecute: (id: string) => void;
  onDeleteCancel: () => void;
  onDeleteRequest: (r: RoutineLatest) => void;
}

const RoutineCard = React.memo(function RoutineCard({
  routine: r, isConfirmingDelete, onStart, onEdit, onDeleteExecute, onDeleteCancel, onDeleteRequest,
}: RoutineCardProps) {
  return (
    <Card className="p-6 bg-awan-surface" onPress={() => onStart(r)}>
      <div className="flex flex-row justify-between items-center mb-2">
        <span className="text-lg font-bold text-awan-tx uppercase tracking-tight flex-1">{r.name}</span>
        <div className="flex flex-row gap-2">
          <Touch onPress={(e: any) => { e.stopPropagation(); onEdit(r); }}>
            <Info size={16} className="text-awan-tx-mute" />
          </Touch>
          {isConfirmingDelete ? (
            <div className="flex flex-row items-center gap-2">
              <Touch onPress={(e: any) => { e.stopPropagation(); onDeleteExecute(r.id); }}>
                <span style={{ color: 'var(--color-awan-status-error)', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em' }}>SUPPR</span>
              </Touch>
              <Touch onPress={(e: any) => { e.stopPropagation(); onDeleteCancel(); }}>
                <X size={14} className="text-awan-tx-mute" />
              </Touch>
            </div>
          ) : (
            <Touch onPress={(e: any) => { e.stopPropagation(); onDeleteRequest(r); }}>
              <Trash2 size={16} className="text-white/20" />
            </Touch>
          )}
        </div>
      </div>
      <div className="flex flex-row items-center gap-3">
        {r.cycleLetter && (
          <div className="bg-awan-gold/10 px-2 py-0.5 rounded border border-awan-gold/20">
            <span className="text-awan-sm font-black text-awan-gold tracking-widest">CYCLE {r.cycleLetter}</span>
          </div>
        )}
        <div className="bg-white/5 px-2 py-0.5 rounded">
          <span className="text-awan-sm font-black text-awan-tx-mute tracking-widest">{r.exercises.length} EX</span>
        </div>
      </div>
      <div className="absolute right-6 bottom-6 w-10 h-10 bg-awan-gold/20 flex items-center justify-center border border-awan-gold/20">
        <Play size={18} className="text-awan-gold" strokeWidth={3} />
      </div>
    </Card>
  );
});

const MuscleFilterButton = React.memo(function MuscleFilterButton({
  muscleId,
  label,
  isActive,
  onPress,
}: { muscleId: string; label: string; isActive: boolean; onPress: (id: string) => void }) {
  return (
    <Touch
      onPress={() => onPress(muscleId)}
      className={`px-4 py-2 border transition-all ${isActive ? 'bg-awan-gold/20 border-awan-gold' : 'bg-white/5 border-white/5'}`}
    >
      <span className={`text-awan-md font-black uppercase tracking-widest ${isActive ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
        {label}
      </span>
    </Touch>
  );
});

function ExercisePicker({
 visible,
 onClose,
 onPick,
 onViewDetail,
}: {
 visible: boolean;
 onClose: () => void;
 onPick: (ex: ExerciseEntry) => void;
 onViewDetail?: (ex: ExerciseEntry) => void;
}) {
 const [search, setSearch] = useState('');
 const [filterMuscle, setFilterMuscle] = useState<string | null>(null);
 const handleMusclePress = useCallback((id: string) => setFilterMuscle(id), []);

 const results = useMemo(() => {
 if (!visible) return [];
 return searchExercises(search, filterMuscle ?? undefined).slice(0, 200);
 }, [search, filterMuscle, visible]);

 return (
 <Modal visible={visible} animationType="slide" transparent>
 <div className="flex-1 bg-awan-bg">
 <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
 <div className="flex flex-row items-center justify-between mb-6">
 <Heading level={2} className="mb-0" subtitle="Free Exercise DB">CATALOGUE</Heading>
 <Touch onPress={() => { onClose(); setSearch(''); setFilterMuscle(null); }} className="w-10 h-10 bg-white/5 flex items-center justify-center">
 <X size={20} className="text-awan-tx-mute" />
 </Touch>
 </div>

 <Card className="p-0 border-white/5 bg-white/5 overflow-hidden mb-4">
 <div className="flex flex-row items-center px-4 py-1">
 <Search size={16} className="text-awan-tx-mute mr-3" />
 <TextInput
 className="flex-1 h-12 text-sm font-bold text-awan-tx outline-none bg-transparent"
 placeholder="Rechercher..."
 placeholderTextColor="rgba(255,255,255,0.2)"
 value={search}
 onChangeText={setSearch}
 />
 </div>
 </Card>

 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
 <Touch
 onPress={() => setFilterMuscle(null)}
 className={`px-4 py-2 border transition-all ${
 !filterMuscle ? 'bg-awan-gold/20 border-awan-gold' : 'bg-white/5 border-white/5'
 }`}
 >
 <span className={`text-awan-md font-black uppercase tracking-widest ${!filterMuscle ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>Tous</span>
 </Touch>
 {Object.entries(MUSCLES).map(([id, label]) => (
 <MuscleFilterButton
   key={id}
   muscleId={id}
   label={label}
   isActive={filterMuscle === id}
   onPress={handleMusclePress}
 />
 ))}
 </ScrollView>
 </div>

 <FlatList
 data={results}
 keyExtractor={(item: ExerciseEntry) => item.id}
 className="flex-1"
 contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
 renderItem={({ item: ex }: { item: ExerciseEntry }) => (
 <Card className="flex-row items-center gap-3 py-4 px-5 bg-white/5 mb-3" variant="flat" onPress={() => onPick(ex)}>
 <div className="flex-1">
 <span className="text-base font-bold text-awan-tx uppercase tracking-tight block">{ex.n}</span>
 <span className="text-awan-md font-bold text-awan-tx-mute uppercase tracking-widest">
 {MUSCLES[ex.pm[0] ?? '']} • {ex.eq}
 </span>
 </div>
 {onViewDetail && (
 <Touch
 onPress={(e: any) => { e.stopPropagation?.(); onViewDetail(ex); }}
 className="w-9 h-9 bg-white/5 flex items-center justify-center border border-white/10"
 >
 <Info size={16} className="text-awan-tx-mute" />
 </Touch>
 )}
 <div className="w-9 h-9 bg-awan-gold/20 flex items-center justify-center border border-awan-gold/30">
 <Plus size={18} className="text-awan-gold" />
 </div>
 </Card>
 )}
 />
 </div>
 </Modal>
 );
}

// ─── Exercise Detail Modal ──────────────────────────────────────────────────

function ExerciseDetail({
 exercise,
 onClose,
}: {
 exercise: ExerciseEntry | null;
 onClose: () => void;
}) {
 if (!exercise) return null;
 const musclePrimary = exercise.pm.map(m => MUSCLES[m] ?? m).join(', ');
 const muscleSecondary = exercise.sm?.map((m: string) => MUSCLES[m] ?? m).join(', ');
 const levelMap: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert' };
 const forceMap: Record<string, string> = { pull: 'Tiré', push: 'Poussé', static: 'Statique' };
 const catMap: Record<string, string> = { strength: 'Force', stretching: 'Étirement', cardio: 'Cardio', plyometrics: 'Pliométrie', powerlifting: 'Force max', strongman: 'Homme fort', olympic_weightlifting: 'Haltérophilie' };

 return (
 <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
 <div
 className="flex-1 flex justify-center items-end"
 style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
 onClick={onClose}
 >
 <motion.div
 initial={{ opacity: 0, y: 40 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.25, ease: 'easeOut' }}
 className="w-full bg-awan-surface rounded-t-3xl border-t border-white/10 overflow-hidden"
 style={{ maxHeight: '75vh' }}
 onClick={(e: any) => e.stopPropagation()}
 >
 {/* Handle */}
 <div className="flex justify-center pt-3 pb-1">
 <div className="w-10 h-1 bg-white/20 " />
 </div>

 {/* Header */}
 <div className="px-6 pb-4 border-b border-white/5 flex flex-row items-start justify-between">
 <div className="flex-1 pr-4">
 <span className="awan-label text-awan-gold mb-1 block">{musclePrimary.toUpperCase()}</span>
 <span className="text-xl font-bold text-awan-tx uppercase tracking-tight">{exercise.n}</span>
 </div>
 <Touch onPress={onClose} className="w-9 h-9 bg-white/5 flex items-center justify-center mt-1">
 <X size={18} className="text-awan-tx-mute" />
 </Touch>
 </div>

 <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
 {/* Badges */}
 <div className="flex flex-row flex-wrap gap-2 mb-6">
 {exercise.eq && (
 <div className="bg-white/5 border border-white/10 px-3 py-1.5 ">
 <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest">{exercise.eq}</span>
 </div>
 )}
 {exercise.lvl && (
 <div className="bg-white/5 border border-white/10 px-3 py-1.5 ">
 <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest">{levelMap[exercise.lvl] ?? exercise.lvl}</span>
 </div>
 )}
 {exercise.cat && (
 <div className="bg-awan-gold/10 border border-awan-gold/20 px-3 py-1.5 ">
 <span className="text-awan-md font-black text-awan-gold uppercase tracking-widest">{catMap[exercise.cat] ?? exercise.cat}</span>
 </div>
 )}
 {exercise.force && (
 <div className="bg-white/5 border border-white/10 px-3 py-1.5 ">
 <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest">{forceMap[exercise.force] ?? exercise.force}</span>
 </div>
 )}
 </div>

 {/* Muscles secondaires */}
 {muscleSecondary && (
 <div className="mb-5">
 <span className="awan-label mb-2 block">MUSCLES SECONDAIRES</span>
 <span className="text-sm font-bold text-awan-tx">{muscleSecondary}</span>
 </div>
 )}
 </ScrollView>
 </motion.div>
 </div>
 </Modal>
 );
}

// ─── Rest Ring + Chrono Overlay ─────────────────────────────────────────────

function RestRing({ remaining, total }: { remaining: number; total: number }) {
 const r = 14;
 const circ = 2 * Math.PI * r;
 const pct = total > 0 ? remaining / total : 0;
 return (
 <svg width={36} height={36} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
 <circle cx={18} cy={18} r={r} fill="none" stroke="var(--color-awan-border-soft)" strokeWidth={2.5} />
 <circle
 cx={18} cy={18} r={r} fill="none"
 stroke="var(--color-awan-status-warn)"
 strokeWidth={2.5}
 strokeDasharray={`${circ * pct} ${circ}`}
 strokeLinecap="round"
 />
 </svg>
 );
}

function ChronoOverlay({
 timer,
 restRemaining,
 restTotal,
 routineName,
}: {
 timer: number;
 restRemaining: number;
 restTotal: number;
 routineName: string;
}) {
 const isResting = restRemaining > 0;
 return (
 <div
 style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80, backdropFilter: 'blur(12px)' }}
 className="bg-awan-bg/90 border-b border-awan-gold/10"
 >
 <div className="flex flex-row items-center px-5 py-2 gap-4">
 <div className="flex flex-row items-center gap-2 flex-1">
 <Clock size={11} className="text-awan-tx-mute" />
 <span className="text-sm font-mono font-bold text-awan-gold tracking-widest tabular-nums">{formatTime(timer)}</span>
 </div>
 {isResting && (
 <div className="flex flex-row items-center gap-2">
 <RestRing remaining={restRemaining} total={restTotal} />
 <span className="text-sm font-mono font-bold tracking-widest tabular-nums" style={{ color: 'var(--color-awan-status-warn)' }}>
 {formatTime(restRemaining)}
 </span>
 </div>
 )}
 <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest max-w-[100px] truncate">{routineName}</span>
 </div>
 </div>
 );
}

// ─── Active Workout ─────────────────────────────────────────────────────────

function ActiveWorkout({
 session,
 timer,
 onUpdate,
 onFinishRequest,
 onAbort,
}: {
 session: ActiveSession;
 timer: number;
 onUpdate: (updater: (s: ActiveSession) => ActiveSession) => void;
 onFinishRequest: () => void;
 onAbort: () => void;
}) {
 const [restRemaining, setRestRemaining] = useState(0);
 const prevRestRef = useRef<number>(0);
 const [substituteTarget, setSubstituteTarget] = useState<{ exIdx: number; muscle: string } | null>(null);
 const [confirmAbandon, setConfirmAbandon] = useState(false);

 useEffect(() => {
 if (prevRestRef.current > 0 && restRemaining === 0) notifyRestEnd();
 prevRestRef.current = restRemaining;
 }, [restRemaining]);

 useEffect(() => {
 if (!session.restEndAt) { setRestRemaining(0); return; }
 const id = setInterval(() => {
 const remaining = Math.max(0, Math.floor((session.restEndAt! - Date.now()) / 1000));
 setRestRemaining(remaining);
 if (remaining === 0) {
 onUpdate(s => ({ ...s, restEndAt: null }));
 clearInterval(id);
 }
 }, 250);
 return () => clearInterval(id);
 }, [session.restEndAt, onUpdate]);

 const startWorkoutPhase = useCallback(() => {
 onUpdate(s => ({ ...s, warmupStartedAt: Date.now(), stage: 'workout' }));
 }, [onUpdate]);

 const updateSet = useCallback((exIdx: number, setIdx: number, patch: Partial<ActiveSet>) => {
 onUpdate(s => {
 const exercises = s.exercises.map((ex, i) => {
 if (i !== exIdx) return ex;
 return {
 ...ex,
 sets: ex.sets.map((set, j) => (j !== setIdx ? set : { ...set, ...patch })),
 };
 });
 return { ...s, exercises };
 });
 }, [onUpdate]);

 const completeSet = useCallback((exIdx: number, setIdx: number) => {
 onUpdate(s => {
 const ex = s.exercises[exIdx];
 if (!ex) return s;
 const set = ex.sets[setIdx];
 if (!set || set.completed) return s;

 let isPR = false;
 let newBestOneRMs = s.bestOneRMs;
 if (set.kind === 'working' && set.weightKg && set.reps) {
 const oneRM = computeOneRM(set.weightKg, set.reps);
 const currentBest = s.bestOneRMs[ex.exerciseId] ?? 0;
 if (oneRM > currentBest) {
 isPR = true;
 newBestOneRMs = { ...s.bestOneRMs, [ex.exerciseId]: oneRM };
 try {
 const stored = loadBestOneRMs();
 stored[ex.exerciseId] = oneRM;
 localStorage.setItem(BEST_ONERMS_KEY, JSON.stringify(stored));
 } catch { /* ignore */ }
 }
 }

 const exercises = s.exercises.map((e, i) =>
 i !== exIdx
 ? e
 : { ...e, sets: e.sets.map((st, j) => j !== setIdx ? st : { ...st, completed: true, completedAt: Date.now(), isPR }) },
 );
 const restEndAt = Date.now() + ex.restSec * 1000;
 return { ...s, exercises, restEndAt, bestOneRMs: newBestOneRMs };
 });
 }, [onUpdate]);

 const addSet = useCallback((exIdx: number) => {
 onUpdate(s => {
 const exercises = s.exercises.map((ex, i) => {
 if (i !== exIdx) return ex;
 const last = ex.sets[ex.sets.length - 1];
 return {
 ...ex,
 sets: [
 ...ex.sets,
 {
 kind: 'working' as SetKind,
 weightKg: last?.weightKg,
 reps: last?.reps,
 rir: undefined,
 completed: false,
 index: ex.sets.length,
 },
 ],
 };
 });
 return { ...s, exercises };
 });
 }, [onUpdate]);

 const skipRest = useCallback(() => {
 onUpdate(s => ({ ...s, restEndAt: null }));
 }, [onUpdate]);

 const substituteExercise = useCallback((exIdx: number, newEx: ExerciseEntry) => {
   onUpdate(s => {
     const orig = s.exercises[exIdx];
     if (!orig) return s;
     const updated: ActiveExercise = {
       ...orig,
       exerciseId: newEx.id,
       name: newEx.n,
       primaryMuscle: newEx.pm[0] ?? orig.primaryMuscle,
       equipment: newEx.eq,
       sets: orig.sets.map(set => ({ ...set, completed: false, completedAt: undefined })),
     };
     return { ...s, exercises: s.exercises.map((e, i) => i === exIdx ? updated : e) };
   });
   setSubstituteTarget(null);
 }, [onUpdate]);

 if (session.stage === 'arrived') {
 return (
 <PreWorkout
 session={session}
 onUpdate={onUpdate}
 onStart={startWorkoutPhase}
 onAbort={onAbort}
 />
 );
 }

 return (
 <div className="flex-1 bg-awan-bg">
 <ChronoOverlay
 timer={timer}
 restRemaining={restRemaining}
 restTotal={session.exercises[session.currentExerciseIdx]?.restSec ?? 90}
 routineName={session.routineName}
 />
 <div style={{ paddingTop: 44 }} className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/10">
 <div className="flex flex-row justify-between items-center mb-6">
 <div className="flex-1">
 <span className="awan-label text-awan-gold mb-1 block">SÉANCE EN COURS</span>
 <Heading level={2} className="mb-0 uppercase">{session.routineName}</Heading>
 </div>
 <Touch onPress={onFinishRequest} className="bg-awan-gold px-5 py-3 ">
 <span className="awan-label text-black font-black">TERMINER</span>
 </Touch>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <Card className="flex-row items-center justify-center py-3 bg-awan-surface border-awan-gold/20">
 <Clock size={16} className="text-awan-gold mr-2" />
 <span className="text-xl font-mono font-bold text-awan-gold tracking-widest tabular-nums">{formatTime(timer)}</span>
 </Card>
 <Card className={`flex-row items-center justify-center gap-2 py-3 bg-awan-surface ${restRemaining > 0 ? 'border-awan-status-warn/30' : 'border-white/5'}`}>
 {restRemaining > 0
 ? <RestRing remaining={restRemaining} total={session.exercises[session.currentExerciseIdx]?.restSec ?? 90} />
 : <Timer size={16} className="text-awan-tx-mute" />
 }
 <span className={`text-xl font-mono font-bold tracking-widest tabular-nums ${restRemaining > 0 ? 'text-awan-status-warn' : 'text-awan-tx-mute'}`}>
 {formatTime(restRemaining)}
 </span>
 {restRemaining > 0 && (
 <Touch onPress={skipRest} className="ml-1 px-2 py-1 bg-white/10 rounded">
 <span className="text-awan-sm font-black text-awan-tx tracking-widest">PASSER</span>
 </Touch>
 )}
 </Card>
 </div>
 </div>

 <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 16, paddingVertical: 16, maxWidth: '100%' }} style={{ flex: 1, width: '100%', maxWidth: '100%' }}>
 {session.exercises.map((ex, exIdx) => (
 <Card key={ex.rid} className="mb-6 p-3 border-white/10 bg-white/5">
 <div className="mb-4">
 <div className="flex flex-row items-start justify-between">
 <span className="text-base font-bold text-awan-tx uppercase tracking-tight flex-1">{ex.name}</span>
 {ex.sets.every(s => !s.completed) && (
 <Touch
 onPress={async () => {
   await loadExerciseCatalog();
   setSubstituteTarget({ exIdx, muscle: ex.primaryMuscle ?? '' });
 }}
 className="px-2 py-1 bg-white/5 border border-white/5 ml-2"
 >
 <span className="text-awan-xxs font-black text-awan-tx-mute tracking-widest uppercase">REMPLACER</span>
 </Touch>
 )}
 </div>
 <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-widest">
 {MUSCLES[ex.primaryMuscle ?? '']} • {ex.equipment} • repos {ex.restSec}s
 </span>
 </div>

 <div className="flex flex-row mb-3 px-1 gap-1">
 <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest w-6 text-center">N°</span>
 <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest w-14 text-center">TYPE</span>
 <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest flex-1 text-center">KG</span>
 <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest flex-1 text-center">REPS</span>
 <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest w-8 text-center">RIR</span>
 <span className="w-8" />
 </div>

 {ex.sets.map((set, setIdx) => (
 <SetRow
 key={setIdx}
 set={set}
 index={setIdx}
 onChange={patch => updateSet(exIdx, setIdx, patch)}
 onComplete={() => completeSet(exIdx, setIdx)}
 />
 ))}

 <Touch
 className="mt-3 h-10 bg-white/5 border border-white/5 flex items-center justify-center"
 onPress={() => addSet(exIdx)}
 >
 <div className="flex flex-row items-center gap-2">
 <Plus size={12} className="text-awan-tx-mute" strokeWidth={3} />
 <span className="text-awan-sm font-black text-awan-tx-mute tracking-widest">AJOUTER UN SET</span>
 </div>
 </Touch>
 </Card>
 ))}

 {confirmAbandon ? (
 <div className="mt-6 py-4 flex flex-row items-center justify-center gap-4">
 <span style={{ color: 'var(--color-awan-tx-mute)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em' }}>QUITTER SANS SAUVEGARDER ?</span>
 <Touch onPress={onAbort}>
 <span style={{ color: 'var(--color-awan-status-error)', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em' }}>OUI</span>
 </Touch>
 <Touch onPress={() => setConfirmAbandon(false)}>
 <span style={{ color: 'var(--color-awan-tx-mute)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>NON</span>
 </Touch>
 </div>
 ) : (
 <Touch
 className="mt-6 py-4 items-center"
 onPress={() => setConfirmAbandon(true)}
 >
 <span className="text-awan-md font-black text-awan-status-error uppercase tracking-[0.3em] opacity-50">ANNULER LA SÉANCE</span>
 </Touch>
 )}
 </ScrollView>

 {/* S3: Substitution modal */}
 {substituteTarget && (
 <Modal visible={true} transparent animationType="slide">
 <div className="flex-1 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
 <div className="w-full bg-awan-surface border-t border-white/10 rounded-t-3xl" style={{ maxHeight: '70vh' }}>
 <div className="px-6 pt-4 pb-3 border-b border-white/5 flex flex-row justify-between items-center">
 <span className="awan-label text-awan-gold">REMPLACER PAR...</span>
 <Touch onPress={() => setSubstituteTarget(null)} className="w-8 h-8 bg-white/5 flex items-center justify-center">
 <X size={14} className="text-awan-tx-mute" />
 </Touch>
 </div>
 <ScrollView style={{ flex: 1, maxHeight: 400 } as any} contentContainerStyle={{ padding: 16 }}>
 {searchExercises(substituteTarget.muscle).filter(ex => ex.pm[0] === substituteTarget.muscle || ex.pm.includes(substituteTarget.muscle)).slice(0, 20).map(ex => (
 <Touch
 key={ex.id}
 onPress={() => substituteExercise(substituteTarget.exIdx, ex)}
 className="mb-2 px-4 py-3 bg-white/5 border border-white/5 flex flex-row justify-between items-center"
 >
 <div className="flex-1">
 <span className="text-sm font-bold text-awan-tx uppercase tracking-tight block">{ex.n}</span>
 <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">{ex.eq}</span>
 </div>
 <span className="text-awan-xs font-black text-awan-gold uppercase tracking-widest ml-2">{MUSCLES[ex.pm[0] ?? ''] ?? ex.pm[0]}</span>
 </Touch>
 ))}
 </ScrollView>
 </div>
 </div>
 </Modal>
 )}
 </div>
 );
}

function SetRow({
 set,
 index,
 onChange,
 onComplete,
}: {
 set: ActiveSet;
 index: number;
 onChange: (patch: Partial<ActiveSet>) => void;
 onComplete: () => void;
}) {
 const [kindMenu, setKindMenu] = useState(false);
 const completed = set.completed;

 return (
 <div className={`flex flex-row items-center gap-1 mb-2 ${completed ? 'opacity-50' : ''}`}>
 <div className="w-6 text-center">
 <span className="text-xs font-mono font-black text-awan-tx-mute">{index + 1}</span>
 </div>
 <Touch onPress={() => setKindMenu(v => !v)} className="w-14 h-10 bg-awan-surface flex items-center justify-center relative">
 <span className={`text-awan-sm font-black tracking-widest ${SET_KIND_COLOR[set.kind]}`}>{SET_KIND_LABEL[set.kind]}</span>
 {kindMenu && (
 <div className="absolute top-full left-0 mt-1 bg-awan-surface border border-white/10 z-10 min-w-[100px]">
 {(['warmup', 'working', 'drop', 'failure'] as SetKind[]).map(k => (
 <Touch
 key={k}
 onPress={() => { onChange({ kind: k }); setKindMenu(false); }}
 className="px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0"
 >
 <span className={`text-awan-sm font-black tracking-widest ${SET_KIND_COLOR[k]}`}>{SET_KIND_LABEL[k]}</span>
 </Touch>
 ))}
 </div>
 )}
 </Touch>
 <TextInput
 className="flex-1 bg-awan-surface border border-white/5 h-10 text-center text-awan-gold font-mono font-bold text-sm"
 keyboardType="decimal-pad"
 value={set.weightKg !== undefined ? String(set.weightKg) : ''}
 onChangeText={(v: string) => {
 const n = parseFloat(v.replace(',', '.'));
 onChange({ weightKg: isNaN(n) ? undefined : n });
 }}
 placeholder="0"
 placeholderTextColor="#3a3a3a"
 editable={!completed}
 />
 <TextInput
 className="flex-1 bg-awan-surface border border-white/5 h-10 text-center text-awan-tx font-mono font-bold text-sm"
 keyboardType="number-pad"
 value={set.reps !== undefined ? String(set.reps) : ''}
 onChangeText={(v: string) => {
 const n = parseInt(v, 10);
 onChange({ reps: isNaN(n) ? undefined : n });
 }}
 placeholder="0"
 placeholderTextColor="#3a3a3a"
 editable={!completed}
 />
 <TextInput
 className="w-8 bg-awan-surface border border-white/5 h-10 text-center text-awan-tx-mute font-mono font-bold text-sm"
 keyboardType="number-pad"
 value={set.rir !== undefined ? String(set.rir) : ''}
 onChangeText={(v: string) => {
 const n = parseInt(v, 10);
 if (isNaN(n)) { onChange({ rir: undefined }); return; }
 onChange({ rir: Math.max(0, Math.min(5, n)) });
 }}
 placeholder="–"
 placeholderTextColor="#3a3a3a"
 editable={!completed}
 />
 <div className="relative">
 <Touch
 onPress={onComplete}
 disabled={completed}
 className={`w-8 h-10 flex items-center justify-center ${
 completed ? 'bg-awan-status-ok/20' : 'bg-awan-gold/20 border border-awan-gold/30'
 }`}
 >
 <CheckCircle2
 size={18}
 className={completed ? 'text-awan-status-ok' : 'text-awan-gold'}
 strokeWidth={completed ? 2 : 3}
 />
 </Touch>
 {set.isPR === true && set.completed && (
 <motion.div
 initial={{ scale: 0, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ type: 'spring', stiffness: 400, damping: 12 }}
 style={{ position: 'absolute', top: -6, right: -6, backgroundColor: 'var(--color-awan-gold)', borderRadius: 6, paddingInline: 4, paddingBlock: 2 }}
 >
 <span className="text-black" style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.1em' }}>PR</span>
 </motion.div>
 )}
 </div>
 </div>
 );
}

// ─── Pre-Workout (context picker) ───────────────────────────────────────────

function PreWorkout({
 session,
 onUpdate,
 onStart,
 onAbort,
}: {
 session: ActiveSession;
 onUpdate: (updater: (s: ActiveSession) => ActiveSession) => void;
 onStart: () => void;
 onAbort: () => void;
}) {
 const [showPreEdit, setShowPreEdit] = useState(false);

 if (showPreEdit) {
   return (
     <PreEditExercises
       exercises={session.exercises}
       onDone={(updated) => {
         onUpdate(s => ({ ...s, exercises: updated }));
         setShowPreEdit(false);
       }}
       onBack={() => setShowPreEdit(false)}
     />
   );
 }

 return (
 <div className="flex-1 bg-awan-bg">
 <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/10">
 <div className="flex flex-row items-center gap-4 mb-4">
 <Touch onPress={onAbort} className="w-10 h-10 bg-white/5 flex items-center justify-center">
 <ChevronLeft size={20} className="text-awan-tx-mute" />
 </Touch>
 <Heading level={2} className="mb-0 flex-1" subtitle="Vestiaire">CONTEXTE</Heading>
 </div>
 <span className="text-base font-bold text-awan-tx uppercase">{session.routineName}</span>
 </div>

 <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} style={{ flex: 1 }}>
 <div className="mb-8">
 <span className="awan-label mb-3 block">CONFIGURATION</span>
 <div className="flex flex-row gap-3">
 <Touch
 onPress={() => onUpdate(s => ({ ...s, solo: true }))}
 className={`flex-1 h-16 border flex items-center justify-center ${
 session.solo ? 'bg-awan-gold/15 border-awan-gold' : 'bg-white/5 border-white/5'
 }`}
 >
 <span className={`text-sm font-black tracking-widest ${session.solo ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>SEUL</span>
 </Touch>
 <Touch
 onPress={() => onUpdate(s => ({ ...s, solo: false }))}
 className={`flex-1 h-16 border flex items-center justify-center ${
 !session.solo ? 'bg-awan-gold/15 border-awan-gold' : 'bg-white/5 border-white/5'
 }`}
 >
 <span className={`text-sm font-black tracking-widest ${!session.solo ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>À PLUSIEURS</span>
 </Touch>
 </div>
 </div>

 <div className="mb-8">
 <span className="awan-label mb-3 block">TEMPS DISPONIBLE</span>
 <div className="flex flex-row flex-wrap gap-2">
 {[30, 45, 60, 75, 90, 120].map(min => (
 <Touch
 key={min}
 onPress={() => onUpdate(s => ({ ...s, availableTimeMin: min }))}
 className={`px-4 py-3 border ${
 session.availableTimeMin === min ? 'bg-awan-gold/15 border-awan-gold' : 'bg-white/5 border-white/5'
 }`}
 >
 <span className={`text-sm font-bold ${session.availableTimeMin === min ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
 {min} min
 </span>
 </Touch>
 ))}
 </div>
 </div>

 <Touch
 className="mt-4 h-12 bg-white/5 border border-white/10 flex items-center justify-center gap-2"
 onPress={() => setShowPreEdit(true)}
 >
 <span className="awan-label text-awan-tx-mute">MODIFIER EXERCICES →</span>
 </Touch>
 <Touch
 className="h-16 bg-awan-gold flex items-center justify-center shadow-xl shadow-awan-gold/20 mt-3"
 onPress={onStart}
 >
 <div className="flex flex-row items-center gap-3">
 <Flame size={20} color="black" />
 <span className="awan-label text-black font-black">DÉMARRER L'ÉCHAUFFEMENT</span>
 </div>
 </Touch>
 </ScrollView>
 </div>
 );
}

// S2: Pre-edit exercises before session start
function PreEditExercises({
 exercises,
 onDone,
 onBack,
}: {
 exercises: ActiveExercise[];
 onDone: (updated: ActiveExercise[]) => void;
 onBack: () => void;
}) {
 const [exos, setExos] = useState<ActiveExercise[]>(exercises);

 const updateWeight = (idx: number, val: string) => {
   const n = parseFloat(val);
   setExos(prev => prev.map((e, i) => i !== idx ? e : {
     ...e,
     sets: e.sets.map(s => ({ ...s, weightKg: isNaN(n) ? s.weightKg : n, plannedWeightKg: isNaN(n) ? s.plannedWeightKg : n })),
   }));
 };

 const updateReps = (idx: number, val: string) => {
   const n = parseInt(val);
   setExos(prev => prev.map((e, i) => i !== idx ? e : {
     ...e,
     sets: e.sets.map(s => ({ ...s, reps: isNaN(n) ? s.reps : n, plannedReps: isNaN(n) ? s.plannedReps : n })),
   }));
 };

 const removeExercise = (idx: number) => setExos(prev => prev.filter((_, i) => i !== idx));

 return (
   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 bg-awan-bg">
     <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
       <div className="flex flex-row items-center gap-4">
         <Touch onPress={onBack} className="w-10 h-10 bg-white/5 flex items-center justify-center">
           <ChevronLeft size={20} className="text-awan-tx-mute" />
         </Touch>
         <Heading level={2} className="mb-0 flex-1" subtitle="Avant de commencer">MODIFIER SÉANCE</Heading>
       </div>
     </div>
     <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} style={{ flex: 1 }}>
       {exos.map((ex, idx) => (
         <div key={ex.rid} className="mb-4">
           <div className="flex flex-row items-center justify-between mb-2">
             <span className="text-sm font-bold text-awan-tx uppercase tracking-tight flex-1">{ex.name}</span>
             <Touch onPress={() => removeExercise(idx)} className="w-8 h-8 bg-white/5 flex items-center justify-center">
               <Trash2 size={14} className="text-white/30" />
             </Touch>
           </div>
           <div className="flex flex-row gap-2">
             <div className="flex-1">
               <span className="text-awan-xxs font-black text-awan-tx-mute uppercase tracking-widest mb-1 block">POIDS KG</span>
               <TextInput
                 className="bg-white/5 border border-white/5 px-3 py-2 text-sm font-mono font-bold text-awan-gold"
                 value={String(ex.sets[0]?.weightKg ?? ex.sets[0]?.plannedWeightKg ?? '')}
                 onChangeText={(v: string) => updateWeight(idx, v)}
                 keyboardType="decimal-pad"
               />
             </div>
             <div className="flex-1">
               <span className="text-awan-xxs font-black text-awan-tx-mute uppercase tracking-widest mb-1 block">REPS</span>
               <TextInput
                 className="bg-white/5 border border-white/5 px-3 py-2 text-sm font-mono font-bold text-awan-tx"
                 value={String(ex.sets[0]?.reps ?? ex.sets[0]?.plannedReps ?? '')}
                 onChangeText={(v: string) => updateReps(idx, v)}
                 keyboardType="number-pad"
               />
             </div>
             <div className="flex items-end pb-1">
               <span className="text-awan-xs font-black text-awan-tx-mute font-mono">{ex.sets.length} × sets</span>
             </div>
           </div>
         </div>
       ))}
       {exos.length === 0 && (
         <div className="py-16 items-center opacity-30">
           <span className="awan-label text-center block">TOUS LES EXERCICES SUPPRIMÉS</span>
         </div>
       )}
     </ScrollView>
     <div className="px-6 pb-10 pt-4 border-t border-white/5 bg-awan-bg">
       <Touch
         onPress={() => onDone(exos.map((e, i) => ({ ...e, order: i })))}
         className="h-16 bg-awan-gold flex items-center justify-center"
       >
         <span className="awan-label text-black font-black">CONFIRMER MODIFICATIONS</span>
       </Touch>
     </div>
   </motion.div>
 );
}

// ─── Finish Workout (feeling + RPE + note) ──────────────────────────────────

function FinishWorkout({
 session,
 prevVolume,
 onSave,
 onCancel,
}: {
 session: ActiveSession;
 prevVolume: number | null;
 onSave: (summary: SessionSummary) => void;
 onCancel: () => void;
}) {
 const [feeling, setFeeling] = useState<number | undefined>(undefined);
 const [sessionRPE, setSessionRPE] = useState<number | undefined>(undefined);
 const [note, setNote] = useState('');

 const stats = useMemo(() => {
 const workingSets = session.exercises.flatMap(e =>
 e.sets.filter(s => s.completed && s.kind === 'working'),
 );
 const volume = workingSets.reduce((acc, s) => acc + (s.weightKg ?? 0) * (s.reps ?? 0), 0);

 // S4: density + best 1RM — build pseudo WorkoutSessionLatest from active session
 const pseudoExercises = session.exercises.map(ex => ({
 rid: ex.rid,
 exerciseId: ex.exerciseId,
 name: ex.name,
 primaryMuscle: ex.primaryMuscle,
 secondaryMuscles: ex.secondaryMuscles,
 equipment: ex.equipment,
 order: ex.order,
 sets: ex.sets.filter(s => s.completed).map<ExerciseSetLatest>(s => ({
 v: 2 as const,
 exerciseId: ex.exerciseId,
 kind: s.kind,
 reps: s.reps,
 weightKg: s.weightKg,
 plannedWeightKg: s.plannedWeightKg,
 plannedReps: s.plannedReps,
 rir: s.rir,
 restActualSec: s.restActualSec,
 completedAt: s.completedAt,
 })),
 }));
 const now = Date.now();
 const pseudoSession: WorkoutSessionLatest = {
 v: 3,
 id: session.id,
 routineId: session.routineId,
 name: session.routineName,
 cycleLetter: session.cycleLetter,
 date: ds(new Date()),
 startTime: session.startTime,
 endTime: now,
 duration: Math.floor((now - session.startTime) / 1000),
 warmupStartedAt: session.warmupStartedAt,
 workoutEndedAt: session.workoutEndedAt ?? now,
 solo: session.solo,
 isException: session.isException,
 exercises: pseudoExercises,
 tonnage: pseudoExercises.reduce((t, ex) => t + ex.sets.reduce((s, set) => set.kind === 'working' ? s + (set.weightKg ?? 0) * (set.reps ?? 0) : s, 0), 0),
 durationMin: Math.round((now - session.startTime) / 60000),
 };
 const density = sessionDensity(pseudoSession);
 const oneRmMap = bestOneRmFromSession(pseudoSession);
 const oneRmEntries = Object.entries(oneRmMap).sort((a, b) => b[1] - a[1]);
 const topOneRm = oneRmEntries[0];
 const topExerciseName = topOneRm
 ? (session.exercises.find(e => e.exerciseId === topOneRm[0])?.name ?? topOneRm[0])
 : null;

 return { workingCount: workingSets.length, volume, density, topOneRm, topExerciseName };
 }, [session]);

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 bg-awan-bg">
 <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
 <div className="flex flex-row items-center gap-4">
 <Touch onPress={onCancel} className="w-10 h-10 bg-white/5 flex items-center justify-center">
 <ChevronLeft size={20} className="text-awan-tx-mute" />
 </Touch>
 <Heading level={2} className="mb-0 flex-1" subtitle="Bilan post-séance">DÉBRIEF</Heading>
 </div>
 </div>

 <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }} style={{ flex: 1 }}>
 <div className="grid grid-cols-2 gap-3 mb-8">
 <Card className="p-4 bg-white/5">
 <span className="awan-label mb-1 block">SETS WORKING</span>
 <span className="text-2xl font-mono font-bold text-awan-gold">{stats.workingCount}</span>
 </Card>
 <Card className="p-4 bg-white/5">
 <span className="awan-label mb-1 block">VOLUME (kg)</span>
 <span className="text-2xl font-mono font-bold text-awan-gold">{Math.round(stats.volume)}</span>
 {prevVolume !== null && (
 <span className="font-mono text-awan-md mt-1 block" style={{
 color: stats.volume >= prevVolume
 ? 'var(--color-awan-status-ok)'
 : 'var(--color-awan-status-error)'
 }}>
 {stats.volume >= prevVolume ? '▲' : '▼'} {Math.abs(Math.round(stats.volume - prevVolume))} kg vs S-1
 </span>
 )}
 </Card>
 {stats.density !== null && (
 <Card className="p-4 bg-white/5">
 <span className="awan-label mb-1 block">DENSITÉ</span>
 <span className="text-2xl font-mono font-bold text-awan-gold">{stats.density}</span>
 <span className="font-mono text-awan-sm text-awan-tx-mute mt-1 block uppercase tracking-widest">kg·rep/min actif</span>
 </Card>
 )}
 {stats.topOneRm && stats.topExerciseName && (
 <Card className="p-4 bg-white/5">
 <span className="awan-label mb-1 block">EST. 1RM</span>
 <span className="text-2xl font-mono font-bold text-awan-gold">{stats.topOneRm[1]}</span>
 <span className="font-mono text-awan-sm text-awan-tx-mute mt-1 block uppercase tracking-widest">kg · {stats.topExerciseName}</span>
 </Card>
 )}
 </div>

 <div className="mb-8">
 <span className="awan-label mb-3 block">FORME / ÉNERGIE (1-5)</span>
 <div className="flex flex-row gap-2">
 {[1, 2, 3, 4, 5].map(n => (
 <Touch
 key={n}
 onPress={() => setFeeling(n)}
 className={`flex-1 h-14 border flex items-center justify-center ${
 feeling === n ? 'bg-awan-gold border-awan-gold' : 'bg-white/5 border-white/5'
 }`}
 >
 <span className={`text-base font-black ${feeling === n ? 'text-black' : 'text-awan-tx-mute'}`}>{n}</span>
 </Touch>
 ))}
 </div>
 </div>

 <div className="mb-8">
 <span className="awan-label mb-3 block">SESSION-RPE (1-10)</span>
 <div className="flex flex-row flex-wrap gap-2">
 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
 <Touch
 key={n}
 onPress={() => setSessionRPE(n)}
 className={`w-12 h-12 border flex items-center justify-center ${
 sessionRPE === n ? 'bg-awan-gold border-awan-gold' : 'bg-white/5 border-white/5'
 }`}
 >
 <span className={`text-sm font-black ${sessionRPE === n ? 'text-black' : 'text-awan-tx-mute'}`}>{n}</span>
 </Touch>
 ))}
 </div>
 </div>

 <div className="mb-8">
 <span className="awan-label mb-3 block">NOTE LIBRE</span>
 <TextInput
 className="bg-white/5 border border-white/5 p-5 text-awan-tx font-bold text-sm min-h-[100px]"
 value={note}
 onChangeText={setNote}
 placeholder="Ressenti, observations..."
 placeholderTextColor="#3a3a3a"
 multiline
 />
 </div>

 <Touch
 onPress={() => onSave({ feeling, sessionRPE, note: note.trim() || undefined })}
 className="h-16 bg-awan-gold flex items-center justify-center shadow-xl shadow-awan-gold/20"
 >
 <div className="flex flex-row items-center gap-3">
 <CheckCircle2 size={20} color="black" strokeWidth={3} />
 <span className="awan-label text-black font-black">ENREGISTRER LA SÉANCE</span>
 </div>
 </Touch>
 <Touch
 onPress={() => onSave({ feeling, sessionRPE, note: note.trim() || undefined, exitedAt: Date.now() })}
 className="mt-3 h-14 bg-white/5 border border-white/10 flex items-center justify-center"
 >
 <span className="awan-label text-awan-tx-mute font-black">QUITTER VESTIAIRE →</span>
 </Touch>
 </ScrollView>
 </motion.div>
 );
}

// ─── History ────────────────────────────────────────────────────────────────

function WorkoutHistory({ logs, onBack }: { logs: WorkoutSessionLatest[]; onBack: () => void }) {
 return (
 <div className="flex-1 bg-awan-bg">
 <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
 <div className="flex flex-row items-center gap-4">
 <Touch onPress={onBack} className="w-10 h-10 bg-white/5 flex items-center justify-center">
 <ChevronLeft size={20} className="text-awan-tx-mute" />
 </Touch>
 <Heading level={2} className="mb-0 flex-1" subtitle="Sessions archivées">HISTORIQUE</Heading>
 </div>
 </div>
 <ScrollView contentContainerStyle={{ paddingBottom: 120, padding: 24 }} style={{ flex: 1 }}>
 {logs.length === 0 && (
 <div className="py-20 items-center opacity-30">
 <History size={48} className="text-awan-tx-mute mb-4" />
 <Heading level={4} className="mb-0 text-center" subtitle="">Aucune séance enregistrée</Heading>
 </div>
 )}
 <StaggerList>
 {logs.slice().sort((a, b) => b.startTime - a.startTime).map(log => {
 const workingCount = log.exercises.reduce(
 (acc, ex) => acc + ex.sets.filter(s => s.kind === 'working').length,
 0,
 );
 const volume = log.exercises.reduce(
 (acc, ex) =>
 acc +
 ex.sets
 .filter(s => s.kind === 'working')
 .reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0),
 0,
 );
 return (
 <StaggerItem key={log.id} className="mb-4">
 <Card className="p-5 bg-white/5 border-white/5">
 <div className="flex flex-row justify-between items-center mb-2">
 <span className="text-base font-bold text-awan-tx uppercase tracking-tight">{log.name}</span>
 <span className="text-awan-md font-mono font-bold text-awan-gold">{log.date}</span>
 </div>
 <div className="flex flex-row items-center gap-4 mb-2">
 {log.cycleLetter && (
 <div className="bg-awan-gold/10 px-2 py-0.5 rounded">
 <span className="text-awan-sm font-black text-awan-gold tracking-widest">CYCLE {log.cycleLetter}</span>
 </div>
 )}
 {log.isException && (
 <div className="bg-orange-400/10 px-2 py-0.5 rounded">
 <span className="text-awan-sm font-black text-orange-400 tracking-widest">EXCEPTION</span>
 </div>
 )}
 </div>
 <div className="flex flex-row items-center gap-4 mt-1">
 <div className="flex flex-row items-center gap-1">
 <Target size={11} className="text-awan-tx-mute" />
 <span className="text-awan-md font-bold text-awan-tx-mute uppercase tracking-widest">{workingCount} SETS</span>
 </div>
 <div className="w-[1px] h-3 bg-white/10" />
 <div className="flex flex-row items-center gap-1">
 <Clock size={11} className="text-awan-tx-mute" />
 <span className="text-awan-md font-bold text-awan-tx-mute uppercase tracking-widest">{Math.floor(log.duration / 60)} MIN</span>
 </div>
 <div className="w-[1px] h-3 bg-white/10" />
 <span className="text-awan-md font-bold text-awan-tx-mute uppercase tracking-widest">{Math.round(volume)} KG</span>
 </div>
 </Card>
 </StaggerItem>
 );
 })}
 </StaggerList>
 </ScrollView>
 </div>
 );
}
