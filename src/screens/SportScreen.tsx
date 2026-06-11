import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TextInput as RNTextInput, Modal, FlatList as RNFlatList, Pressable, Platform, Alert, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import {
 MUSCLES,
 searchExercises,
 loadExerciseCatalog,
 type ExerciseEntry,
} from '../utils/sportData';
import { uid, ds, dateId } from '../utils/storage';
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
 Download,
} from 'lucide-react-native';
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
import { WorkoutListView } from '../modules/sport/components/WorkoutListView';
import { RoutineGeneratorView } from '../modules/sport/components/RoutineGeneratorView';
import { cacheForRoutine } from '../services/mediaCacheService';
import { safeStorage } from '../utils/safeStorage';
import { L } from '../constants/labels';
import { useTheme, type AwanTheme } from '../hooks/useTheme';
import { FontSans, FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Clr } from '../theme/tokens';

const TextInput = RNTextInput as React.ComponentType<any>;
const FlatList = RNFlatList as React.ComponentType<any>;
const SvgCircle = Circle as any;

type ViewMode = 'list' | 'create' | 'edit' | 'active' | 'history' | 'finish' | 'recovery' | 'workouts' | 'generate';

const CYCLE_LETTERS: (CycleLetter | null)[] = [null, 'A', 'B', 'C', 'D'];

const SET_KIND_LABEL: Record<SetKind, string> = {
 warmup: 'ÉCHAUF.',
 working: 'WORKING',
 drop: 'DROP',
 failure: 'FAILURE',
};

function setKindColor(kind: SetKind, theme: AwanTheme): string {
 switch (kind) {
 case 'warmup': return theme.mute;
 case 'working': return theme.selected;
 case 'drop': return '#FB923C';
 case 'failure': return '#F87171';
 }
}

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
 try { return JSON.parse(safeStorage.get(BEST_ONERMS_KEY) ?? '{}'); } catch { return {}; }
}

async function notifyRestEnd() {
 try {
 const Notifications = await import('expo-notifications');
 const { status } = await Notifications.getPermissionsAsync();
 if (status !== 'granted') { await Notifications.requestPermissionsAsync(); }
 await Notifications.scheduleNotificationAsync({
 identifier: '9001',
 content: { title: 'AWAN SPORT', body: 'Repos terminé — Série suivante !', sound: true },
 trigger: null,
 });
 } catch {
 /* notifications indisponibles — échec silencieux */
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
  const theme = useTheme();
  if (result.sessionsCount === 0) return null;
  const status = result.score >= 80 ? 'ok' : result.score >= 60 ? 'warn' : 'error';
  const statusVar = status === 'ok' ? theme.statusOk : status === 'warn' ? theme.statusWarn : theme.danger;
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>NOTE CYCLE — 4 SEMAINES</Text>
      <Card style={{ padding: 20, backgroundColor: Clr.white5 }}>
        <View style={[ss.row, { alignItems: 'baseline', gap: 12, marginBottom: 12 }]}>
          <Text style={{ fontSize: 36, fontFamily: FontMono, fontWeight: Fw.value, color: statusVar }}>{result.score}</Text>
          <Text style={[ss.sm, { color: theme.mute }]}>/ 100</Text>
          <Text style={[ss.sm, { color: theme.mute, marginLeft: 'auto' }]}>{result.sessionsCount} séances · {result.weeksObserved}/4 sem</Text>
        </View>
        <Text style={{ fontSize: Fs.md, fontWeight: Fw.value, color: theme.title, fontFamily: FontSans, lineHeight: Math.round(Fs.md * 1.5) }}>{result.diagnostic}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <BreakdownChip label="ADH." value={result.breakdown.adherence} max={20} />
          <BreakdownChip label="FRÉQ." value={result.breakdown.frequency} max={20} />
          <BreakdownChip label="PROG." value={result.breakdown.progression} max={20} />
          <BreakdownChip label="PLATE." value={result.breakdown.plateau} max={15} />
          <BreakdownChip label="RÉCUP." value={result.breakdown.recovery} max={15} />
          <BreakdownChip label="CONST." value={result.breakdown.consistency} max={10} />
        </View>
      </Card>
    </View>
  );
}

function BreakdownChip({ label, value, max }: { label: string; value: number; max: number }) {
  const theme = useTheme();
  const ratio = max > 0 ? value / max : 0;
  const color = ratio >= 0.8 ? theme.statusOk : ratio >= 0.5 ? theme.statusWarn : theme.danger;
  return (
    <View style={{ width: '31%', flexGrow: 1, backgroundColor: Clr.white5, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' }}>
      <Text style={[ss.xs, { color: theme.mute }]}>{label}</Text>
      <Text style={{ fontSize: Fs.md, fontFamily: FontMono, fontWeight: Fw.value, color }}>{value}/{max}</Text>
    </View>
  );
}

function VolumeHeatmapSection({ sessions }: { sessions: WorkoutSessionLatest[] }) {
  const theme = useTheme();
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
    <View style={{ marginBottom: 24 }}>
      <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>HEATMAP MUSCULAIRE — SEMAINE</Text>
      <BodySvg mode="heatmap" muscleValues={muscleValues as Record<MuscleId, number>} />
    </View>
  );
}

function VolumeWeekSection({ sessions }: { sessions: WorkoutSessionLatest[] }) {
  const theme = useTheme();
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
    <View style={{ marginBottom: 24 }}>
      <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>VOLUME SEMAINE</Text>
      <View style={{ gap: 8 }}>
        {entries.map(([muscle, lm]) => {
          const sets = vol[muscle] ?? 0;
          if (sets === 0) return null;
          const pct = Math.min(100, (sets / lm.mrv) * 100);
          const barColor = sets < lm.mev ? theme.danger : sets <= lm.mav[1] ? theme.statusOk : sets >= lm.mrv * 0.8 ? theme.statusWarn : theme.statusOk;
          return (
            <View key={muscle} style={[ss.row, { gap: 12 }]}>
              <Text style={[ss.xs, { color: theme.mute, width: 80, flexShrink: 0 }]}>{lm.label}</Text>
              <View style={{ flex: 1, height: 3, backgroundColor: Clr.white5 }}>
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct}%`, backgroundColor: barColor }} />
              </View>
              <Text style={{ fontSize: Fs.md, fontWeight: Fw.value, fontFamily: FontMono, color: barColor, minWidth: 32, textAlign: 'right' }}>{sets}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function SportScreen() {
 const theme = useTheme();
 useAppState();
 const { addEntry, moveEntry, getEntriesByDate } = useDaily();
 void moveEntry; void getEntriesByDate;
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
 void today;

 useEffect(() => {
 try {
 const saved = safeStorage.get(ACTIVE_SESSION_KEY);
 if (saved) setResumeModal(JSON.parse(saved) as ActiveSession);
 } catch { /* ignore */ }
 try {
 const savedDraft = safeStorage.get(ROUTINE_DRAFT_KEY);
 if (savedDraft) setDraftResumeModal(JSON.parse(savedDraft) as RoutineDraft);
 } catch { /* ignore */ }
 }, []);

 useEffect(() => {
 if (!activeSession) { safeStorage.remove(ACTIVE_SESSION_KEY); return; }
 const save = () => { try { safeStorage.set(ACTIVE_SESSION_KEY, JSON.stringify(activeSession)); } catch { /* ignore */ } };
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
 try { safeStorage.remove(ROUTINE_DRAFT_KEY); } catch { /* ignore */ }
 setEditingRoutine(null);
 setView('list');
 }, [workoutStore]);

 const cancelRoutineEdit = useCallback(() => {
 try { safeStorage.remove(ROUTINE_DRAFT_KEY); } catch { /* ignore */ }
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
 id: dateId(today),
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

 safeStorage.remove(ACTIVE_SESSION_KEY);
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

 const handleExportIA = useCallback(async () => {
 const { json, promptWithData } = await buildIAExport(workoutStore.routines);
 const filename = `awan-sport-ia-${ds(new Date())}.json`;
 if (Platform.OS !== 'web') {
 try {
 const FileSystem = await import('expo-file-system');
 const Sharing = await import('expo-sharing');
 const uri = (FileSystem.documentDirectory ?? '') + filename;
 await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
 await Sharing.shareAsync(uri);
 } catch { Alert.alert('Erreur', 'Export impossible'); }
 } else {
 try {
 await navigator.clipboard.writeText(promptWithData);
 const blob = new Blob([json], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = filename; a.click();
 URL.revokeObjectURL(url);
 } catch { /* ignore */ }
 }
 }, [workoutStore.routines]);

 if (view === 'recovery' && pendingRoutine) {
 return (
   <View style={{ flex: 1, backgroundColor: 'transparent' }}>
     <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
       <ScreenHeader tag="SPORT · RÉCUPÉRATION" title={pendingRoutine.routine.name} />
     </View>
     <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 32 }}>
       <View style={{ width: '100%' }}>
         <Text style={[ss.sm, { textAlign: 'center', color: theme.mute, marginBottom: 24 }]}>SCORE DE RÉCUPÉRATION DU JOUR</Text>
         <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
           {[1,2,3,4,5,6,7,8,9,10].map(n => {
             const active = recoveryScore === n;
             return (
               <Touch key={n} onPress={() => setRecoveryScore(n)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme.selected : theme.surface, borderWidth: active ? 0 : 1, borderColor: 'rgba(128,128,128,0.25)' }}>
                 <Text style={{ fontFamily: FontMono, fontSize: 14, fontWeight: Fw.value, color: active ? '#000' : theme.title }}>{n}</Text>
               </Touch>
             );
           })}
         </View>
         <View style={[ss.rowBetween, { marginTop: 16, paddingHorizontal: 8 }]}>
           <Text style={[ss.smThin, { color: theme.mute }]}>épuisé</Text>
           <Text style={[ss.smThin, { color: theme.mute }]}>parfait</Text>
         </View>
       </View>
       <View style={{ gap: 12, width: '100%' }}>
         <Touch
           onPress={async () => {
             if (!pendingRoutine) return;
             await startWorkout(pendingRoutine.routine, pendingRoutine.opts);
             setPendingRoutine(null);
             if (recoveryScore !== null) {
               handleSessionUpdate(s => ({ ...s, recoveryScore }));
             }
           }}
           style={{ backgroundColor: theme.selected, padding: 16, alignItems: 'center' }}
         >
           <Text style={{ fontSize: Fs.lg, fontWeight: Fw.display, color: '#000', textTransform: 'uppercase', letterSpacing: Ls.lg_02, fontFamily: FontMono }}>{recoveryScore !== null ? `DÉMARRER — RÉCUP ${recoveryScore}/10` : 'DÉMARRER SANS NOTER'}</Text>
         </Touch>
         <Touch onPress={() => { setPendingRoutine(null); setView('list'); }} style={{ padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(128,128,128,0.25)' }}>
           <Text style={[ss.mdBlack, { color: theme.mute }]}>ANNULER</Text>
         </Touch>
       </View>
     </View>
   </View>
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
 safeStorage.remove(ACTIVE_SESSION_KEY);
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
 const ids = routines.flatMap(r => r.exercises.map(e => e.exerciseId));
 cacheForRoutine(ids).catch(() => {});
 setView('workouts');
 }}
 />
 );
 }

 return (
 <View style={{ flex: 1, backgroundColor: 'transparent' }}>
 {resumeModal && (
 <Modal visible={true} transparent animationType="fade">
 <View style={[ss.sheetOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
 <View style={[ss.sheet, { backgroundColor: theme.surface, padding: 24, paddingBottom: 40 }]}>
 <Text style={[ss.label, { color: theme.selected, marginBottom: 8 }]}>SÉANCE EN COURS</Text>
 <Text style={{ fontSize: 18, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', marginBottom: 4, fontFamily: FontSans }}>{resumeModal.routineName}</Text>
 <Text style={[ss.mdBlack, { color: theme.mute, marginBottom: 24 }]}>Démarrée à {new Date(resumeModal.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
 <View style={[ss.row, { gap: 12 }]}>
 <Touch style={{ flex: 1, height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }} onPress={() => { setActiveSession(resumeModal); setResumeModal(null); setView('active'); }}>
 <Text style={[ss.label, { color: '#000' }]}>REPRENDRE</Text>
 </Touch>
 <Touch style={{ flex: 1, height: 56, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center' }} onPress={() => { safeStorage.remove(ACTIVE_SESSION_KEY); setResumeModal(null); }}>
 <Text style={[ss.label, { color: theme.mute }]}>ABANDONNER</Text>
 </Touch>
 </View>
 </View>
 </View>
 </Modal>
 )}
 {!resumeModal && draftResumeModal && (
 <Modal visible={true} transparent animationType="fade">
 <View style={[ss.sheetOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
 <View style={[ss.sheet, { backgroundColor: theme.surface, padding: 24, paddingBottom: 40 }]}>
 <Text style={[ss.label, { color: theme.selected, marginBottom: 8 }]}>ROUTINE EN COURS D'ÉDITION</Text>
 <Text style={{ fontSize: 18, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', marginBottom: 4, fontFamily: FontSans }}>{draftResumeModal.name.trim() || 'SANS NOM'}</Text>
 <Text style={[ss.mdBlack, { color: theme.mute, marginBottom: 24 }]}>{draftResumeModal.exercises.length} EXERCICES · Sauvegardé à {new Date(draftResumeModal.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
 <View style={[ss.row, { gap: 12 }]}>
 <Touch style={{ flex: 1, height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }} onPress={() => {
 const draft = draftResumeModal;
 setDraftToResume(draft);
 setDraftResumeModal(null);
 const existing = draft.existingId ? workoutStore.routines.find(r => r.id === draft.existingId) ?? null : null;
 setEditingRoutine(existing);
 setView(existing ? 'edit' : 'create');
 }}>
 <Text style={[ss.label, { color: '#000' }]}>REPRENDRE</Text>
 </Touch>
 <Touch style={{ flex: 1, height: 56, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center' }} onPress={() => { try { safeStorage.remove(ROUTINE_DRAFT_KEY); } catch { /* ignore */ } setDraftResumeModal(null); }}>
 <Text style={[ss.label, { color: theme.mute }]}>ABANDONNER</Text>
 </Touch>
 </View>
 </View>
 </View>
 </Modal>
 )}
 <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ flex: 1, backgroundColor: theme.bg }} showsVerticalScrollIndicator={false}>
 <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
 <ScreenHeader tag="BODY · SPORT" title="SPORT" />
 {(() => {
   const p = PeriodizationService.getOrInit();
   return (
     <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
       <Text style={[ss.sm, { color: theme.mute }]}>PHASE {p.phase} · SEMAINE {p.mesoWeek} · {PeriodizationService.getPhaseLabel(p.phase)}</Text>
     </View>
   );
 })()}

 <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
 {(() => {
 const cnt = sessionsThisWeek(workoutStore.sessions as any);
 const pct = Math.min(100, cnt * 25);
 return (
 <>
 <View style={{ flex: 1 }}>
 <InstrumentCard label="FLUX" value={`${pct}`} unit="%" status={pct >= 75 ? 'ok' : pct >= 40 ? 'warn' : 'error'} progress={pct} index={1} />
 </View>
 <View style={{ flex: 1 }}>
 <InstrumentCard label="SÉANCES" value={cnt} unit="/sem" status={cnt > 0 ? 'ok' : 'mute'} index={2} />
 </View>
 </>
 );
 })()}
 </View>

 <VolumeWeekSection sessions={workoutStore.sessions as WorkoutSessionLatest[]} />
 <CycleScoreSection sessions={workoutStore.sessions as WorkoutSessionLatest[]} />
 <VolumeHeatmapSection sessions={workoutStore.sessions as WorkoutSessionLatest[]} />

 {nextRoutine && (
 <Card style={{ padding: 24, backgroundColor: 'rgba(212,175,55,0.05)', borderColor: Clr.gold20, marginBottom: 24 }} onPress={() => { setPendingRoutine({ routine: nextRoutine }); setRecoveryScore(null); setView('recovery'); }}>
 <View style={ss.rowBetween}>
 <View style={{ flex: 1 }}>
 <Text style={[ss.label, { color: theme.selected, marginBottom: 4 }]}>PROCHAINE SÉANCE</Text>
 <Heading level={3} style={{ marginBottom: 4 }}>{nextRoutine.name}</Heading>
 <View style={[ss.row, { gap: 12, marginTop: 8 }]}>
 {nextRoutine.cycleLetter && (
 <View style={{ backgroundColor: Clr.gold12, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Clr.gold30 }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.selected, letterSpacing: Ls.sm_02, fontFamily: FontMono }}>CYCLE {nextRoutine.cycleLetter}</Text>
 </View>
 )}
 <Text style={[ss.mdBlack, { color: theme.mute }]}>{nextRoutine.exercises.length} EXERCICES</Text>
 </View>
 </View>
 <View style={{ width: 56, height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
 <Play size={24} color="black" strokeWidth={3} />
 </View>
 </View>
 </Card>
 )}

 <View style={[ss.row, { marginBottom: 12, gap: 12 }]}>
 <Touch style={{ flex: 1, height: 56, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }} onPress={() => { setEditingRoutine(null); setView('create'); }}>
 <View style={[ss.row, { gap: 8 }]}>
 <Plus size={18} color="black" strokeWidth={3} />
 <Text style={[ss.label, { color: '#000' }]}>NOUVELLE ROUTINE</Text>
 </View>
 </Touch>
 <Touch style={{ paddingHorizontal: 20, height: 56, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.white10 }} onPress={() => setView('history')}>
 <History size={18} color={theme.mute} />
 </Touch>
 </View>
 <Touch style={{ marginBottom: 12, height: 48, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.white10 }} onPress={() => setView('workouts')}>
 <Text style={[ss.label, { color: theme.mute }]}>{L.sport.myRoutines} →</Text>
 </Touch>
 <Touch style={[ss.row, { marginBottom: 24, height: 48, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.white10, gap: 8 }]} onPress={handleExportIA}>
 <Download size={14} color={theme.mute} />
 <Text style={[ss.label, { color: theme.mute }]}>EXPORT ANALYSE IA</Text>
 </Touch>

 <View style={{ marginBottom: 80 }}>
 <Heading level={4} mono subtitle="Protocoles Enregistrés">ROUTINES</Heading>
 {workoutStore.routines.length === 0 ? (
 <Card style={{ paddingVertical: 64, alignItems: 'center', backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, borderStyle: 'dashed' }}>
 <Dumbbell size={48} color={Clr.white10} style={{ marginBottom: 24 }} />
 <Text style={[ss.label, { color: theme.mute, marginBottom: 8 }]}>AUCUNE ROUTINE</Text>
 </Card>
 ) : (
 <View>
 {workoutStore.routines.map(r => (
 <View key={r.id} style={{ marginBottom: 16 }}>
 <RoutineCard
 routine={r}
 isConfirmingDelete={confirmDeleteId === r.id}
 onStart={handleRoutineStart}
 onEdit={handleRoutineEdit}
 onDeleteExecute={handleRoutineDeleteExecute}
 onDeleteCancel={handleRoutineDeleteCancel}
 onDeleteRequest={deleteRoutine}
 />
 </View>
 ))}
 </View>
 )}
 </View>
 </View>
 </ScrollView>
 </View>
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
 const theme = useTheme();
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
 try { safeStorage.set(ROUTINE_DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota */ }
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
 id: existing?.id ?? Date.now().toString(),
 name: trimmed,
 cycleLetter,
 exercises,
 defaultRestSec,
 createdAt: existing?.createdAt ?? Date.now(),
 };
 onSave(routine);
 }, [name, cycleLetter, exercises, defaultRestSec, existing, onSave]);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[ss.topBar, { backgroundColor: Clr.white5 }]}>
 <View style={[ss.row, { gap: 16 }]}>
 <Touch onPress={onCancel} style={ss.iconBtn}>
 <ChevronLeft size={20} color={theme.mute} />
 </Touch>
 <Heading level={2} style={{ marginBottom: 0, flex: 1 }} subtitle={existing ? 'Modification' : 'Nouvelle routine'}>PROTOCOLE</Heading>
 <Touch onPress={handleSave} style={{ width: 40, height: 40, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
 <CheckCircle2 size={20} color="black" strokeWidth={3} />
 </Touch>
 </View>
 </View>

 <ScrollView contentContainerStyle={{ paddingBottom: 140, padding: 24 }} style={{ flex: 1, minHeight: 0 }}>
 <View style={{ marginBottom: 24 }}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>NOM</Text>
 <TextInput style={{ backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5, padding: 20, color: theme.title, fontWeight: Fw.value, fontSize: 16, fontFamily: FontSans }} value={name} onChangeText={(v: string) => { setName(v); if (saveError) setSaveError(''); }} placeholder="Push, Pull, Legs..." placeholderTextColor="#3a3a3a" />
 {saveError ? (
   <Text style={{ fontFamily: FontMono, fontSize: 10, color: theme.danger, letterSpacing: 1.5, marginTop: 6 }}>⚠ {saveError.toUpperCase()}</Text>
 ) : null}
 </View>

 <View style={{ marginBottom: 24 }}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>CYCLE A/B/C/D</Text>
 <View style={[ss.row, { gap: 8 }]}>
 {CYCLE_LETTERS.map(l => {
 const active = cycleLetter === l;
 return (
 <Touch key={l ?? 'none'} onPress={() => setCycleLetter(l)} style={{ flex: 1, height: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme.selected : Clr.white5, borderColor: active ? theme.selected : Clr.white5 }}>
 <Text style={{ fontSize: 14, fontWeight: Fw.display, color: active ? '#000' : theme.mute }}>{l ?? '—'}</Text>
 </Touch>
 );
 })}
 </View>
 </View>

 <View style={{ marginBottom: 24 }}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>REPOS PAR DÉFAUT (sec)</Text>
 <View style={[ss.row, { gap: 12 }]}>
 <Touch onPress={() => setDefaultRestSec(Math.max(0, defaultRestSec - 15))} style={{ width: 48, height: 48, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center' }}>
 <Minus size={16} color={theme.mute} />
 </Touch>
 <View style={{ flex: 1, backgroundColor: theme.surface, height: 48, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ color: theme.selected, fontFamily: FontMono, fontWeight: Fw.value, fontSize: 18 }}>{defaultRestSec}s</Text>
 </View>
 <Touch onPress={() => setDefaultRestSec(defaultRestSec + 15)} style={{ width: 48, height: 48, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center' }}>
 <Plus size={16} color={theme.mute} />
 </Touch>
 </View>
 </View>

 <View style={{ marginBottom: 24 }}>
 <Heading level={4} mono subtitle={`${exercises.length} indexé(s)`}>EXERCICES</Heading>
 {exercises.length === 0 && (
 <View style={{ paddingVertical: 48, borderWidth: 2, borderColor: Clr.white5, borderStyle: 'dashed', alignItems: 'center' }}>
 <Text style={{ fontSize: Fs.md, fontWeight: Fw.value, color: theme.mute, textTransform: 'uppercase', letterSpacing: 2, fontStyle: 'italic' }}>Aucun exercice</Text>
 </View>
 )}
 {exercises.map((ex, idx) => (
 <View key={ex.rid} style={{ marginBottom: 12 }}>
 <Card variant="flat" style={{ padding: 16, backgroundColor: Clr.white5 }}>
 <View style={[ss.rowBetween, { alignItems: 'flex-start', marginBottom: 12 }]}>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: 14, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.35, fontFamily: FontSans }}>{ex.name}</Text>
 <Text style={[ss.sm, { color: theme.mute }]}>{MUSCLES[ex.primaryMuscle ?? '']} • {ex.equipment}</Text>
 </View>
 <View style={[ss.row, { gap: 8 }]}>
 <Touch onPress={() => { const full = searchExercises('').find(e => e.id === ex.exerciseId); if (full) setViewingEx(full); }} style={{ width: 32, height: 32, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.white10 }}>
 <Info size={14} color={theme.mute} />
 </Touch>
 <Touch onPress={() => removeExercise(idx)}>
 <Trash2 size={16} color={`${theme.danger}66`} />
 </Touch>
 </View>
 </View>
 <View style={[ss.row, { gap: 8 }]}>
 <NumField label="SETS" value={ex.plannedSets} onChange={v => updateExercise(idx, { plannedSets: v })} step={1} min={1} />
 <NumField label="REPS" value={ex.plannedReps} onChange={v => updateExercise(idx, { plannedReps: v })} step={1} min={1} />
 <NumField label="REPOS (s)" value={ex.restSec} onChange={v => updateExercise(idx, { restSec: v })} step={15} min={0} />
 </View>
 </Card>
 </View>
 ))}
 <Touch style={{ marginTop: 16, height: 56, backgroundColor: Clr.white5, borderWidth: 1, borderColor: `${theme.selected}66`, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }} onPress={() => { void loadExerciseCatalog().then(() => setIsPicking(true)); }}>
 <View style={[ss.row, { gap: 12 }]}>
 <Plus size={18} color={theme.selected} />
 <Text style={[ss.label, { color: theme.selected }]}>AJOUTER UN EXERCICE</Text>
 </View>
 </Touch>
 </View>
 </ScrollView>

 <ExercisePicker visible={isPicking} onClose={() => setIsPicking(false)} onPick={addExercise} onViewDetail={setViewingEx} />
 <ExerciseDetail exercise={viewingEx} onClose={() => setViewingEx(null)} />
 </View>
 );
}

function NumField({ label, value, onChange, step, min }: { label: string; value: number; onChange: (v: number) => void; step: number; min: number }) {
 const theme = useTheme();
 return (
 <View style={{ flex: 1 }}>
 <Text style={[ss.sm, { color: theme.mute, marginBottom: 4 }]}>{label}</Text>
 <View style={[ss.row, { gap: 4 }]}>
 <Touch onPress={() => onChange(Math.max(min, value - step))} style={{ width: 32, height: 40, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
 <Minus size={12} color={theme.mute} />
 </Touch>
 <View style={{ flex: 1, backgroundColor: theme.surface, height: 40, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ color: theme.title, fontFamily: FontMono, fontWeight: Fw.value, fontSize: 14 }}>{value}</Text>
 </View>
 <Touch onPress={() => onChange(value + step)} style={{ width: 32, height: 40, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
 <Plus size={12} color={theme.mute} />
 </Touch>
 </View>
 </View>
 );
}

// ─── Routine card ─────────────────────────────────────────────────────────────

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
  const theme = useTheme();
  return (
    <Card style={{ padding: 24, backgroundColor: theme.surface }} onPress={() => onStart(r)}>
      <View style={[ss.rowBetween, { marginBottom: 8 }]}>
        <Text style={{ fontSize: 18, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.45, flex: 1, fontFamily: FontSans }}>{r.name}</Text>
        <View style={[ss.row, { gap: 8 }]}>
          <Touch onPress={(e: any) => { e?.stopPropagation?.(); onEdit(r); }}>
            <Info size={16} color={theme.mute} />
          </Touch>
          {isConfirmingDelete ? (
            <View style={[ss.row, { gap: 8 }]}>
              <Touch onPress={(e: any) => { e?.stopPropagation?.(); onDeleteExecute(r.id); }}>
                <Text style={{ color: theme.danger, fontSize: 11, fontWeight: Fw.display, letterSpacing: 1.1 }}>SUPPR</Text>
              </Touch>
              <Touch onPress={(e: any) => { e?.stopPropagation?.(); onDeleteCancel(); }}>
                <X size={14} color={theme.mute} />
              </Touch>
            </View>
          ) : (
            <Touch onPress={(e: any) => { e?.stopPropagation?.(); onDeleteRequest(r); }}>
              <Trash2 size={16} color={Clr.white20} />
            </Touch>
          )}
        </View>
      </View>
      <View style={[ss.row, { gap: 12 }]}>
        {r.cycleLetter && (
          <View style={{ backgroundColor: Clr.gold10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Clr.gold20 }}>
            <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.selected, letterSpacing: Ls.sm_02, fontFamily: FontMono }}>CYCLE {r.cycleLetter}</Text>
          </View>
        )}
        <View style={{ backgroundColor: Clr.white5, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.mute, letterSpacing: Ls.sm_02, fontFamily: FontMono }}>{r.exercises.length} EX</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', right: 24, bottom: 24, width: 40, height: 40, backgroundColor: Clr.gold20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.gold20 }}>
        <Play size={18} color={theme.selected} strokeWidth={3} />
      </View>
    </Card>
  );
});

const MuscleFilterButton = React.memo(function MuscleFilterButton({
  muscleId, label, isActive, onPress,
}: { muscleId: string; label: string; isActive: boolean; onPress: (id: string) => void }) {
  const theme = useTheme();
  return (
    <Touch onPress={() => onPress(muscleId)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, backgroundColor: isActive ? Clr.gold20 : Clr.white5, borderColor: isActive ? theme.selected : Clr.white5 }}>
      <Text style={[ss.mdBlack, { color: isActive ? theme.selected : theme.mute }]}>{label}</Text>
    </Touch>
  );
});

function ExercisePicker({
 visible, onClose, onPick, onViewDetail,
}: {
 visible: boolean;
 onClose: () => void;
 onPick: (ex: ExerciseEntry) => void;
 onViewDetail?: (ex: ExerciseEntry) => void;
}) {
 const theme = useTheme();
 const [search, setSearch] = useState('');
 const [filterMuscle, setFilterMuscle] = useState<string | null>(null);
 const handleMusclePress = useCallback((id: string) => setFilterMuscle(id), []);

 const results = useMemo(() => {
 if (!visible) return [];
 return searchExercises(search, filterMuscle ?? undefined).slice(0, 200);
 }, [search, filterMuscle, visible]);

 return (
 <Modal visible={visible} animationType="slide" transparent>
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[ss.topBar, { backgroundColor: Clr.white5 }]}>
 <View style={[ss.rowBetween, { marginBottom: 24 }]}>
 <Heading level={2} style={{ marginBottom: 0 }} subtitle="Free Exercise DB">CATALOGUE</Heading>
 <Touch onPress={() => { onClose(); setSearch(''); setFilterMuscle(null); }} style={ss.iconBtn}>
 <X size={20} color={theme.mute} />
 </Touch>
 </View>

 <View style={[ss.row, { backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16 }]}>
 <Search size={16} color={theme.mute} style={{ marginRight: 12 }} />
 <TextInput style={{ flex: 1, height: 48, fontSize: 14, fontWeight: Fw.value, color: theme.title, backgroundColor: 'transparent', fontFamily: FontSans }} placeholder="Rechercher..." placeholderTextColor="rgba(255,255,255,0.2)" value={search} onChangeText={setSearch} />
 </View>

 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
 <Touch onPress={() => setFilterMuscle(null)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, backgroundColor: !filterMuscle ? Clr.gold20 : Clr.white5, borderColor: !filterMuscle ? theme.selected : Clr.white5 }}>
 <Text style={[ss.mdBlack, { color: !filterMuscle ? theme.selected : theme.mute }]}>Tous</Text>
 </Touch>
 {Object.entries(MUSCLES).map(([id, label]) => (
 <MuscleFilterButton key={id} muscleId={id} label={label} isActive={filterMuscle === id} onPress={handleMusclePress} />
 ))}
 </ScrollView>
 </View>

 <FlatList
 data={results}
 keyExtractor={(item: ExerciseEntry) => item.id}
 style={{ flex: 1 }}
 contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
 renderItem={({ item: ex }: { item: ExerciseEntry }) => (
 <Card variant="flat" style={[ss.row, { gap: 12, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: Clr.white5, marginBottom: 12 }]} onPress={() => onPick(ex)}>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: 16, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.4, fontFamily: FontSans }}>{ex.n}</Text>
 <Text style={[ss.mdBlack, { color: theme.mute }]}>{MUSCLES[ex.pm[0] ?? '']} • {ex.eq}</Text>
 </View>
 {onViewDetail && (
 <Touch onPress={(e: any) => { e?.stopPropagation?.(); onViewDetail(ex); }} style={{ width: 36, height: 36, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.white10 }}>
 <Info size={16} color={theme.mute} />
 </Touch>
 )}
 <View style={{ width: 36, height: 36, backgroundColor: Clr.gold20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.gold30 }}>
 <Plus size={18} color={theme.selected} />
 </View>
 </Card>
 )}
 />
 </View>
 </Modal>
 );
}

// ─── Exercise Detail Modal ──────────────────────────────────────────────────

function ExerciseDetail({ exercise, onClose }: { exercise: ExerciseEntry | null; onClose: () => void }) {
 const theme = useTheme();
 if (!exercise) return null;
 const musclePrimary = exercise.pm.map(m => MUSCLES[m] ?? m).join(', ');
 const muscleSecondary = exercise.sm?.map((m: string) => MUSCLES[m] ?? m).join(', ');
 const levelMap: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert' };
 const forceMap: Record<string, string> = { pull: 'Tiré', push: 'Poussé', static: 'Statique' };
 const catMap: Record<string, string> = { strength: 'Force', stretching: 'Étirement', cardio: 'Cardio', plyometrics: 'Pliométrie', powerlifting: 'Force max', strongman: 'Homme fort', olympic_weightlifting: 'Haltérophilie' };

 const Badge = ({ children, gold }: { children: React.ReactNode; gold?: boolean }) => (
 <View style={{ backgroundColor: gold ? Clr.gold10 : Clr.white5, borderWidth: 1, borderColor: gold ? Clr.gold20 : Clr.white10, paddingHorizontal: 12, paddingVertical: 6 }}>
 <Text style={[ss.mdBlack, { color: gold ? theme.selected : theme.mute }]}>{children}</Text>
 </View>
 );

 return (
 <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
 <View style={[ss.sheetOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
 <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
 <View style={[ss.sheet, { backgroundColor: theme.surface, maxHeight: '75%' }]}>
 <View style={ss.grabberWrap}><View style={ss.grabber} /></View>
 <View style={[ss.rowBetween, { alignItems: 'flex-start', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Clr.white5 }]}>
 <View style={{ flex: 1, paddingRight: 16 }}>
 <Text style={[ss.label, { color: theme.selected, marginBottom: 4 }]}>{musclePrimary.toUpperCase()}</Text>
 <Text style={{ fontSize: 20, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.4, fontFamily: FontSans }}>{exercise.n}</Text>
 </View>
 <Touch onPress={onClose} style={{ width: 36, height: 36, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
 <X size={18} color={theme.mute} />
 </Touch>
 </View>

 <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
 {exercise.eq && <Badge>{exercise.eq}</Badge>}
 {exercise.lvl && <Badge>{levelMap[exercise.lvl] ?? exercise.lvl}</Badge>}
 {exercise.cat && <Badge gold>{catMap[exercise.cat] ?? exercise.cat}</Badge>}
 {exercise.force && <Badge>{forceMap[exercise.force] ?? exercise.force}</Badge>}
 </View>
 {muscleSecondary && (
 <View style={{ marginBottom: 20 }}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 8 }]}>MUSCLES SECONDAIRES</Text>
 <Text style={{ fontSize: 14, fontWeight: Fw.value, color: theme.title, fontFamily: FontSans }}>{muscleSecondary}</Text>
 </View>
 )}
 </ScrollView>
 </View>
 </View>
 </Modal>
 );
}

// ─── Rest Ring + Chrono Overlay ─────────────────────────────────────────────

function RestRing({ remaining, total }: { remaining: number; total: number }) {
 const theme = useTheme();
 const r = 14;
 const circ = 2 * Math.PI * r;
 const pct = total > 0 ? remaining / total : 0;
 return (
 <View style={{ width: 36, height: 36, flexShrink: 0, transform: [{ rotate: '-90deg' }] }}>
 <Svg width={36} height={36} viewBox="0 0 36 36">
 <SvgCircle cx={18} cy={18} r={r} fill="none" stroke={theme.borderSoft} strokeWidth={2.5} />
 <SvgCircle cx={18} cy={18} r={r} fill="none" stroke={theme.statusWarn} strokeWidth={2.5} strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round" />
 </Svg>
 </View>
 );
}

function ChronoOverlay({ timer, restRemaining, restTotal, routineName }: { timer: number; restRemaining: number; restTotal: number; routineName: string }) {
 const theme = useTheme();
 const isResting = restRemaining > 0;
 return (
 <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 80, backgroundColor: theme.bg, borderBottomWidth: 1, borderBottomColor: Clr.gold10 }}>
 <View style={[ss.row, { paddingHorizontal: 20, paddingVertical: 8, gap: 16 }]}>
 <View style={[ss.row, { gap: 8, flex: 1 }]}>
 <Clock size={11} color={theme.mute} />
 <Text style={{ fontSize: 14, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected, letterSpacing: 1.4 }}>{formatTime(timer)}</Text>
 </View>
 {isResting && (
 <View style={[ss.row, { gap: 8 }]}>
 <RestRing remaining={restRemaining} total={restTotal} />
 <Text style={{ fontSize: 14, fontFamily: FontMono, fontWeight: Fw.value, letterSpacing: 1.4, color: theme.statusWarn }}>{formatTime(restRemaining)}</Text>
 </View>
 )}
 <Text numberOfLines={1} style={[ss.xs, { color: theme.mute, maxWidth: 100 }]}>{routineName}</Text>
 </View>
 </View>
 );
}

// ─── Active Workout ─────────────────────────────────────────────────────────

function ActiveWorkout({
 session, timer, onUpdate, onFinishRequest, onAbort,
}: {
 session: ActiveSession;
 timer: number;
 onUpdate: (updater: (s: ActiveSession) => ActiveSession) => void;
 onFinishRequest: () => void;
 onAbort: () => void;
}) {
 const theme = useTheme();
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
 return { ...ex, sets: ex.sets.map((set, j) => (j !== setIdx ? set : { ...set, ...patch })) };
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
 safeStorage.set(BEST_ONERMS_KEY, JSON.stringify(stored));
 } catch { /* ignore */ }
 }
 }

 const exercises = s.exercises.map((e, i) =>
 i !== exIdx ? e : { ...e, sets: e.sets.map((st, j) => j !== setIdx ? st : { ...st, completed: true, completedAt: Date.now(), isPR }) },
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
 sets: [...ex.sets, { kind: 'working' as SetKind, weightKg: last?.weightKg, reps: last?.reps, rir: undefined, completed: false, index: ex.sets.length }],
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
 return <PreWorkout session={session} onUpdate={onUpdate} onStart={startWorkoutPhase} onAbort={onAbort} />;
 }

 const restTotal = session.exercises[session.currentExerciseIdx]?.restSec ?? 90;

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <ChronoOverlay timer={timer} restRemaining={restRemaining} restTotal={restTotal} routineName={session.routineName} />
 <View style={{ paddingTop: 44, paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: Clr.white5, backgroundColor: Clr.white10 }}>
 <View style={[ss.rowBetween, { marginBottom: 24, marginTop: 32 }]}>
 <View style={{ flex: 1 }}>
 <Text style={[ss.label, { color: theme.selected, marginBottom: 4 }]}>SÉANCE EN COURS</Text>
 <Heading level={2} style={{ marginBottom: 0 }}>{session.routineName}</Heading>
 </View>
 <Touch onPress={onFinishRequest} style={{ backgroundColor: theme.selected, paddingHorizontal: 20, paddingVertical: 12 }}>
 <Text style={[ss.label, { color: '#000' }]}>TERMINER</Text>
 </Touch>
 </View>

 <View style={[ss.row, { gap: 12 }]}>
 <Card style={[ss.row, { flex: 1, justifyContent: 'center', paddingVertical: 12, backgroundColor: theme.surface, borderColor: Clr.gold20 }]}>
 <Clock size={16} color={theme.selected} style={{ marginRight: 8 }} />
 <Text style={{ fontSize: 20, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected, letterSpacing: 1.8 }}>{formatTime(timer)}</Text>
 </Card>
 <Card style={[ss.row, { flex: 1, justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: theme.surface, borderColor: restRemaining > 0 ? `${theme.statusWarn}4D` : Clr.white5 }]}>
 {restRemaining > 0
 ? <RestRing remaining={restRemaining} total={restTotal} />
 : <Timer size={16} color={theme.mute} />
 }
 <Text style={{ fontSize: 20, fontFamily: FontMono, fontWeight: Fw.value, letterSpacing: 1.8, color: restRemaining > 0 ? theme.statusWarn : theme.mute }}>{formatTime(restRemaining)}</Text>
 {restRemaining > 0 && (
 <Touch onPress={skipRest} style={{ marginLeft: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Clr.white10 }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.title, letterSpacing: Ls.sm_02 }}>PASSER</Text>
 </Touch>
 )}
 </Card>
 </View>
 </View>

 <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 16, paddingVertical: 16 }} style={{ flex: 1, width: '100%' }}>
 {session.exercises.map((ex, exIdx) => (
 <Card key={ex.rid} style={{ marginBottom: 24, padding: 12, borderColor: Clr.white10, backgroundColor: Clr.white5 }}>
 <View style={{ marginBottom: 16 }}>
 <View style={[ss.rowBetween, { alignItems: 'flex-start' }]}>
 <Text style={{ fontSize: 16, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.4, flex: 1, fontFamily: FontSans }}>{ex.name}</Text>
 {ex.sets.every(s => !s.completed) && (
 <Touch onPress={async () => { await loadExerciseCatalog(); setSubstituteTarget({ exIdx, muscle: ex.primaryMuscle ?? '' }); }} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5, marginLeft: 8 }}>
 <Text style={[ss.xxs, { color: theme.mute }]}>REMPLACER</Text>
 </Touch>
 )}
 </View>
 <Text style={[ss.sm, { color: theme.mute }]}>{MUSCLES[ex.primaryMuscle ?? '']} • {ex.equipment} • repos {ex.restSec}s</Text>
 </View>

 <View style={[ss.row, { marginBottom: 12, paddingHorizontal: 4, gap: 4 }]}>
 <Text style={[ss.sm, { color: theme.mute, width: 24, textAlign: 'center' }]}>N°</Text>
 <Text style={[ss.sm, { color: theme.mute, width: 56, textAlign: 'center' }]}>TYPE</Text>
 <Text style={[ss.sm, { color: theme.mute, flex: 1, textAlign: 'center' }]}>KG</Text>
 <Text style={[ss.sm, { color: theme.mute, flex: 1, textAlign: 'center' }]}>REPS</Text>
 <Text style={[ss.sm, { color: theme.mute, width: 32, textAlign: 'center' }]}>RIR</Text>
 <View style={{ width: 32 }} />
 </View>

 {ex.sets.map((set, setIdx) => (
 <SetRow key={setIdx} set={set} index={setIdx} onChange={patch => updateSet(exIdx, setIdx, patch)} onComplete={() => completeSet(exIdx, setIdx)} />
 ))}

 <Touch style={{ marginTop: 12, height: 40, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5, alignItems: 'center', justifyContent: 'center' }} onPress={() => addSet(exIdx)}>
 <View style={[ss.row, { gap: 8 }]}>
 <Plus size={12} color={theme.mute} strokeWidth={3} />
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.mute, letterSpacing: Ls.sm_02 }}>AJOUTER UN SET</Text>
 </View>
 </Touch>
 </Card>
 ))}

 {confirmAbandon ? (
 <View style={[ss.row, { marginTop: 24, paddingVertical: 16, justifyContent: 'center', gap: 16 }]}>
 <Text style={{ color: theme.mute, fontSize: 11, fontWeight: Fw.value, letterSpacing: 1.5 }}>QUITTER SANS SAUVEGARDER ?</Text>
 <Touch onPress={onAbort}>
 <Text style={{ color: theme.danger, fontSize: 11, fontWeight: Fw.display, letterSpacing: 1.1 }}>OUI</Text>
 </Touch>
 <Touch onPress={() => setConfirmAbandon(false)}>
 <Text style={{ color: theme.mute, fontSize: 11, fontWeight: Fw.value, letterSpacing: 1.1 }}>NON</Text>
 </Touch>
 </View>
 ) : (
 <Touch style={{ marginTop: 24, paddingVertical: 16, alignItems: 'center' }} onPress={() => setConfirmAbandon(true)}>
 <Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: theme.danger, textTransform: 'uppercase', letterSpacing: 3, opacity: 0.5 }}>ANNULER LA SÉANCE</Text>
 </Touch>
 )}
 </ScrollView>

 {/* S3: Substitution modal */}
 {substituteTarget && (
 <Modal visible={true} transparent animationType="slide">
 <View style={[ss.sheetOverlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
 <View style={[ss.sheet, { backgroundColor: theme.surface, maxHeight: '70%' }]}>
 <View style={[ss.rowBetween, { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Clr.white5 }]}>
 <Text style={[ss.label, { color: theme.selected }]}>REMPLACER PAR...</Text>
 <Touch onPress={() => setSubstituteTarget(null)} style={{ width: 32, height: 32, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center' }}>
 <X size={14} color={theme.mute} />
 </Touch>
 </View>
 <ScrollView style={{ flex: 1, maxHeight: 400 } as any} contentContainerStyle={{ padding: 16 }}>
 {searchExercises(substituteTarget.muscle).filter(ex => ex.pm[0] === substituteTarget.muscle || ex.pm.includes(substituteTarget.muscle)).slice(0, 20).map(ex => (
 <Touch key={ex.id} onPress={() => substituteExercise(substituteTarget.exIdx, ex)} style={[ss.rowBetween, { marginBottom: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }]}>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: 14, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.35, fontFamily: FontSans }}>{ex.n}</Text>
 <Text style={[ss.xs, { color: theme.mute }]}>{ex.eq}</Text>
 </View>
 <Text style={[ss.xs, { color: theme.selected, marginLeft: 8 }]}>{MUSCLES[ex.pm[0] ?? ''] ?? ex.pm[0]}</Text>
 </Touch>
 ))}
 </ScrollView>
 </View>
 </View>
 </Modal>
 )}
 </View>
 );
}

function SetRow({ set, index, onChange, onComplete }: { set: ActiveSet; index: number; onChange: (patch: Partial<ActiveSet>) => void; onComplete: () => void }) {
 const theme = useTheme();
 const [kindMenu, setKindMenu] = useState(false);
 const completed = set.completed;

 return (
 <View style={[ss.row, { gap: 4, marginBottom: 8, opacity: completed ? 0.5 : 1 }]}>
 <View style={{ width: 24, alignItems: 'center' }}>
 <Text style={{ fontSize: 12, fontFamily: FontMono, fontWeight: Fw.display, color: theme.mute }}>{index + 1}</Text>
 </View>
 <View style={{ width: 56 }}>
 <Touch onPress={() => setKindMenu(v => !v)} style={{ height: 40, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, letterSpacing: Ls.sm_02, color: setKindColor(set.kind, theme) }}>{SET_KIND_LABEL[set.kind]}</Text>
 </Touch>
 {kindMenu && (
 <View style={{ position: 'absolute', top: 42, left: 0, backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white10, zIndex: 10, minWidth: 100 }}>
 {(['warmup', 'working', 'drop', 'failure'] as SetKind[]).map(k => (
 <Touch key={k} onPress={() => { onChange({ kind: k }); setKindMenu(false); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Clr.white5 }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, letterSpacing: Ls.sm_02, color: setKindColor(k, theme) }}>{SET_KIND_LABEL[k]}</Text>
 </Touch>
 ))}
 </View>
 )}
 </View>
 <TextInput style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white5, height: 40, textAlign: 'center', color: theme.selected, fontFamily: FontMono, fontWeight: Fw.value, fontSize: 14 }} keyboardType="decimal-pad" value={set.weightKg !== undefined ? String(set.weightKg) : ''} onChangeText={(v: string) => { const n = parseFloat(v.replace(',', '.')); onChange({ weightKg: isNaN(n) ? undefined : n }); }} placeholder="0" placeholderTextColor="#3a3a3a" editable={!completed} />
 <TextInput style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white5, height: 40, textAlign: 'center', color: theme.title, fontFamily: FontMono, fontWeight: Fw.value, fontSize: 14 }} keyboardType="number-pad" value={set.reps !== undefined ? String(set.reps) : ''} onChangeText={(v: string) => { const n = parseInt(v, 10); onChange({ reps: isNaN(n) ? undefined : n }); }} placeholder="0" placeholderTextColor="#3a3a3a" editable={!completed} />
 <TextInput style={{ width: 32, backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white5, height: 40, textAlign: 'center', color: theme.mute, fontFamily: FontMono, fontWeight: Fw.value, fontSize: 14 }} keyboardType="number-pad" value={set.rir !== undefined ? String(set.rir) : ''} onChangeText={(v: string) => { const n = parseInt(v, 10); if (isNaN(n)) { onChange({ rir: undefined }); return; } onChange({ rir: Math.max(0, Math.min(5, n)) }); }} placeholder="–" placeholderTextColor="#3a3a3a" editable={!completed} />
 <View style={{ position: 'relative' }}>
 <Touch onPress={onComplete} disabled={completed} style={{ width: 32, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: completed ? `${theme.statusOk}33` : Clr.gold20, borderWidth: completed ? 0 : 1, borderColor: Clr.gold30 }}>
 <CheckCircle2 size={18} color={completed ? theme.statusOk : theme.selected} strokeWidth={completed ? 2 : 3} />
 </Touch>
 {set.isPR === true && set.completed && (
 <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: theme.selected, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2 }}>
 <Text style={{ color: '#000', fontSize: 7, fontWeight: Fw.display, letterSpacing: 0.7 }}>PR</Text>
 </View>
 )}
 </View>
 </View>
 );
}

// ─── Pre-Workout (context picker) ───────────────────────────────────────────

function PreWorkout({
 session, onUpdate, onStart, onAbort,
}: {
 session: ActiveSession;
 onUpdate: (updater: (s: ActiveSession) => ActiveSession) => void;
 onStart: () => void;
 onAbort: () => void;
}) {
 const theme = useTheme();
 const [showPreEdit, setShowPreEdit] = useState(false);

 if (showPreEdit) {
   return (
     <PreEditExercises
       exercises={session.exercises}
       onDone={(updated) => { onUpdate(s => ({ ...s, exercises: updated })); setShowPreEdit(false); }}
       onBack={() => setShowPreEdit(false)}
     />
   );
 }

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[ss.topBar, { backgroundColor: Clr.white10 }]}>
 <View style={[ss.row, { gap: 16, marginBottom: 16 }]}>
 <Touch onPress={onAbort} style={ss.iconBtn}>
 <ChevronLeft size={20} color={theme.mute} />
 </Touch>
 <Heading level={2} style={{ marginBottom: 0, flex: 1 }} subtitle="Vestiaire">CONTEXTE</Heading>
 </View>
 <Text style={{ fontSize: 16, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', fontFamily: FontSans }}>{session.routineName}</Text>
 </View>

 <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} style={{ flex: 1 }}>
 <View style={{ marginBottom: 32 }}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>CONFIGURATION</Text>
 <View style={[ss.row, { gap: 12 }]}>
 <Touch onPress={() => onUpdate(s => ({ ...s, solo: true }))} style={{ flex: 1, height: 64, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: session.solo ? Clr.gold12 : Clr.white5, borderColor: session.solo ? theme.selected : Clr.white5 }}>
 <Text style={{ fontSize: 14, fontWeight: Fw.display, letterSpacing: Ls.sm_02, color: session.solo ? theme.selected : theme.mute }}>SEUL</Text>
 </Touch>
 <Touch onPress={() => onUpdate(s => ({ ...s, solo: false }))} style={{ flex: 1, height: 64, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: !session.solo ? Clr.gold12 : Clr.white5, borderColor: !session.solo ? theme.selected : Clr.white5 }}>
 <Text style={{ fontSize: 14, fontWeight: Fw.display, letterSpacing: Ls.sm_02, color: !session.solo ? theme.selected : theme.mute }}>À PLUSIEURS</Text>
 </Touch>
 </View>
 </View>

 <View style={{ marginBottom: 32 }}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>TEMPS DISPONIBLE</Text>
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
 {[30, 45, 60, 75, 90, 120].map(min => {
 const active = session.availableTimeMin === min;
 return (
 <Touch key={min} onPress={() => onUpdate(s => ({ ...s, availableTimeMin: min }))} style={{ paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, backgroundColor: active ? Clr.gold12 : Clr.white5, borderColor: active ? theme.selected : Clr.white5 }}>
 <Text style={{ fontSize: 14, fontWeight: Fw.value, color: active ? theme.selected : theme.mute }}>{min} min</Text>
 </Touch>
 );
 })}
 </View>
 </View>

 <Touch style={[ss.row, { marginTop: 16, height: 48, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center', gap: 8 }]} onPress={() => setShowPreEdit(true)}>
 <Text style={[ss.label, { color: theme.mute }]}>MODIFIER EXERCICES →</Text>
 </Touch>
 <Touch style={{ height: 64, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center', marginTop: 12 }} onPress={onStart}>
 <View style={[ss.row, { gap: 12 }]}>
 <Flame size={20} color="black" />
 <Text style={[ss.label, { color: '#000' }]}>DÉMARRER L'ÉCHAUFFEMENT</Text>
 </View>
 </Touch>
 </ScrollView>
 </View>
 );
}

// S2: Pre-edit exercises before session start
function PreEditExercises({
 exercises, onDone, onBack,
}: {
 exercises: ActiveExercise[];
 onDone: (updated: ActiveExercise[]) => void;
 onBack: () => void;
}) {
 const theme = useTheme();
 const [exos, setExos] = useState<ActiveExercise[]>(exercises);

 const updateWeight = (idx: number, val: string) => {
   const n = parseFloat(val);
   setExos(prev => prev.map((e, i) => i !== idx ? e : { ...e, sets: e.sets.map(s => ({ ...s, weightKg: isNaN(n) ? s.weightKg : n, plannedWeightKg: isNaN(n) ? s.plannedWeightKg : n })) }));
 };

 const updateReps = (idx: number, val: string) => {
   const n = parseInt(val);
   setExos(prev => prev.map((e, i) => i !== idx ? e : { ...e, sets: e.sets.map(s => ({ ...s, reps: isNaN(n) ? s.reps : n, plannedReps: isNaN(n) ? s.plannedReps : n })) }));
 };

 const removeExercise = (idx: number) => setExos(prev => prev.filter((_, i) => i !== idx));

 return (
   <View style={{ flex: 1, backgroundColor: theme.bg }}>
     <View style={[ss.topBar, { backgroundColor: Clr.white5 }]}>
       <View style={[ss.row, { gap: 16 }]}>
         <Touch onPress={onBack} style={ss.iconBtn}>
           <ChevronLeft size={20} color={theme.mute} />
         </Touch>
         <Heading level={2} style={{ marginBottom: 0, flex: 1 }} subtitle="Avant de commencer">MODIFIER SÉANCE</Heading>
       </View>
     </View>
     <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} style={{ flex: 1 }}>
       {exos.map((ex, idx) => (
         <View key={ex.rid} style={{ marginBottom: 16 }}>
           <View style={[ss.rowBetween, { marginBottom: 8 }]}>
             <Text style={{ fontSize: 14, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.35, flex: 1, fontFamily: FontSans }}>{ex.name}</Text>
             <Touch onPress={() => removeExercise(idx)} style={{ width: 32, height: 32, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center' }}>
               <Trash2 size={14} color={Clr.white20} />
             </Touch>
           </View>
           <View style={[ss.row, { gap: 8 }]}>
             <View style={{ flex: 1 }}>
               <Text style={[ss.xxs, { color: theme.mute, marginBottom: 4 }]}>POIDS KG</Text>
               <TextInput style={{ backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }} value={String(ex.sets[0]?.weightKg ?? ex.sets[0]?.plannedWeightKg ?? '')} onChangeText={(v: string) => updateWeight(idx, v)} keyboardType="decimal-pad" />
             </View>
             <View style={{ flex: 1 }}>
               <Text style={[ss.xxs, { color: theme.mute, marginBottom: 4 }]}>REPS</Text>
               <TextInput style={{ backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: FontMono, fontWeight: Fw.value, color: theme.title }} value={String(ex.sets[0]?.reps ?? ex.sets[0]?.plannedReps ?? '')} onChangeText={(v: string) => updateReps(idx, v)} keyboardType="number-pad" />
             </View>
             <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: 4 }}>
               <Text style={{ fontSize: Fs.xs, fontWeight: Fw.display, color: theme.mute, fontFamily: FontMono }}>{ex.sets.length} × sets</Text>
             </View>
           </View>
         </View>
       ))}
       {exos.length === 0 && (
         <View style={{ paddingVertical: 64, alignItems: 'center', opacity: 0.3 }}>
           <Text style={[ss.label, { color: theme.mute, textAlign: 'center' }]}>TOUS LES EXERCICES SUPPRIMÉS</Text>
         </View>
       )}
     </ScrollView>
     <View style={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: Clr.white5, backgroundColor: theme.bg }}>
       <Touch onPress={() => onDone(exos.map((e, i) => ({ ...e, order: i })))} style={{ height: 64, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
         <Text style={[ss.label, { color: '#000' }]}>CONFIRMER MODIFICATIONS</Text>
       </Touch>
     </View>
   </View>
 );
}

// ─── Finish Workout (feeling + RPE + note) ──────────────────────────────────

function FinishWorkout({
 session, prevVolume, onSave, onCancel,
}: {
 session: ActiveSession;
 prevVolume: number | null;
 onSave: (summary: SessionSummary) => void;
 onCancel: () => void;
}) {
 const theme = useTheme();
 const [feeling, setFeeling] = useState<number | undefined>(undefined);
 const [sessionRPE, setSessionRPE] = useState<number | undefined>(undefined);
 const [note, setNote] = useState('');

 const stats = useMemo(() => {
 const workingSets = session.exercises.flatMap(e => e.sets.filter(s => s.completed && s.kind === 'working'));
 const volume = workingSets.reduce((acc, s) => acc + (s.weightKg ?? 0) * (s.reps ?? 0), 0);

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
 const topExerciseName = topOneRm ? (session.exercises.find(e => e.exerciseId === topOneRm[0])?.name ?? topOneRm[0]) : null;

 return { workingCount: workingSets.length, volume, density, topOneRm, topExerciseName };
 }, [session]);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[ss.topBar, { backgroundColor: Clr.white5 }]}>
 <View style={[ss.row, { gap: 16 }]}>
 <Touch onPress={onCancel} style={ss.iconBtn}>
 <ChevronLeft size={20} color={theme.mute} />
 </Touch>
 <Heading level={2} style={{ marginBottom: 0, flex: 1 }} subtitle="Bilan post-séance">DÉBRIEF</Heading>
 </View>
 </View>

 <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }} style={{ flex: 1 }}>
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
 <Card style={[ss.statHalf, { backgroundColor: Clr.white5 }]}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 4 }]}>SETS WORKING</Text>
 <Text style={{ fontSize: 24, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }}>{stats.workingCount}</Text>
 </Card>
 <Card style={[ss.statHalf, { backgroundColor: Clr.white5 }]}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 4 }]}>VOLUME (kg)</Text>
 <Text style={{ fontSize: 24, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }}>{Math.round(stats.volume)}</Text>
 {prevVolume !== null && (
 <Text style={{ fontFamily: FontMono, fontSize: Fs.md, marginTop: 4, color: stats.volume >= prevVolume ? theme.statusOk : theme.danger }}>{stats.volume >= prevVolume ? '▲' : '▼'} {Math.abs(Math.round(stats.volume - prevVolume))} kg vs S-1</Text>
 )}
 </Card>
 {stats.density !== null && (
 <Card style={[ss.statHalf, { backgroundColor: Clr.white5 }]}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 4 }]}>DENSITÉ</Text>
 <Text style={{ fontSize: 24, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }}>{stats.density}</Text>
 <Text style={[ss.sm, { color: theme.mute, marginTop: 4, fontFamily: FontMono }]}>kg·rep/min actif</Text>
 </Card>
 )}
 {stats.topOneRm && stats.topExerciseName && (
 <Card style={[ss.statHalf, { backgroundColor: Clr.white5 }]}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 4 }]}>EST. 1RM</Text>
 <Text style={{ fontSize: 24, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }}>{stats.topOneRm[1]}</Text>
 <Text style={[ss.sm, { color: theme.mute, marginTop: 4, fontFamily: FontMono }]}>kg · {stats.topExerciseName}</Text>
 </Card>
 )}
 </View>

 <View style={{ marginBottom: 32 }}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>FORME / ÉNERGIE (1-5)</Text>
 <View style={[ss.row, { gap: 8 }]}>
 {[1, 2, 3, 4, 5].map(n => {
 const active = feeling === n;
 return (
 <Touch key={n} onPress={() => setFeeling(n)} style={{ flex: 1, height: 56, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme.selected : Clr.white5, borderColor: active ? theme.selected : Clr.white5 }}>
 <Text style={{ fontSize: 16, fontWeight: Fw.display, color: active ? '#000' : theme.mute }}>{n}</Text>
 </Touch>
 );
 })}
 </View>
 </View>

 <View style={{ marginBottom: 32 }}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>SESSION-RPE (1-10)</Text>
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
 const active = sessionRPE === n;
 return (
 <Touch key={n} onPress={() => setSessionRPE(n)} style={{ width: 48, height: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme.selected : Clr.white5, borderColor: active ? theme.selected : Clr.white5 }}>
 <Text style={{ fontSize: 14, fontWeight: Fw.display, color: active ? '#000' : theme.mute }}>{n}</Text>
 </Touch>
 );
 })}
 </View>
 </View>

 <View style={{ marginBottom: 32 }}>
 <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>NOTE LIBRE</Text>
 <TextInput style={{ backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5, padding: 20, color: theme.title, fontWeight: Fw.value, fontSize: 14, minHeight: 100, textAlignVertical: 'top', fontFamily: FontSans }} value={note} onChangeText={setNote} placeholder="Ressenti, observations..." placeholderTextColor="#3a3a3a" multiline />
 </View>

 <Touch onPress={() => onSave({ feeling, sessionRPE, note: note.trim() || undefined })} style={{ height: 64, backgroundColor: theme.selected, alignItems: 'center', justifyContent: 'center' }}>
 <View style={[ss.row, { gap: 12 }]}>
 <CheckCircle2 size={20} color="black" strokeWidth={3} />
 <Text style={[ss.label, { color: '#000' }]}>ENREGISTRER LA SÉANCE</Text>
 </View>
 </Touch>
 <Touch onPress={() => onSave({ feeling, sessionRPE, note: note.trim() || undefined, exitedAt: Date.now() })} style={{ marginTop: 12, height: 56, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={[ss.label, { color: theme.mute }]}>QUITTER VESTIAIRE →</Text>
 </Touch>
 </ScrollView>
 </View>
 );
}

// ─── History ────────────────────────────────────────────────────────────────

function WorkoutHistory({ logs, onBack }: { logs: WorkoutSessionLatest[]; onBack: () => void }) {
 const theme = useTheme();
 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[ss.topBar, { backgroundColor: Clr.white5 }]}>
 <View style={[ss.row, { gap: 16 }]}>
 <Touch onPress={onBack} style={ss.iconBtn}>
 <ChevronLeft size={20} color={theme.mute} />
 </Touch>
 <Heading level={2} style={{ marginBottom: 0, flex: 1 }} subtitle="Sessions archivées">HISTORIQUE</Heading>
 </View>
 </View>
 <ScrollView contentContainerStyle={{ paddingBottom: 120, padding: 24 }} style={{ flex: 1 }}>
 {logs.length === 0 && (
 <View style={{ paddingVertical: 80, alignItems: 'center', opacity: 0.3 }}>
 <History size={48} color={theme.mute} style={{ marginBottom: 16 }} />
 <Heading level={4} style={{ marginBottom: 0 }} subtitle="">Aucune séance enregistrée</Heading>
 </View>
 )}
 {logs.slice().sort((a, b) => b.startTime - a.startTime).map(log => {
 const workingCount = log.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.kind === 'working').length, 0);
 const volume = log.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.kind === 'working').reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0), 0);
 return (
 <View key={log.id} style={{ marginBottom: 16 }}>
 <Card style={{ padding: 20, backgroundColor: Clr.white5, borderColor: Clr.white5 }}>
 <View style={[ss.rowBetween, { marginBottom: 8 }]}>
 <Text style={{ fontSize: 16, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.4, fontFamily: FontSans }}>{log.name}</Text>
 <Text style={{ fontSize: Fs.md, fontFamily: FontMono, fontWeight: Fw.value, color: theme.selected }}>{log.date}</Text>
 </View>
 <View style={[ss.row, { gap: 16, marginBottom: 8 }]}>
 {log.cycleLetter && (
 <View style={{ backgroundColor: Clr.gold10, paddingHorizontal: 8, paddingVertical: 2 }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.selected, letterSpacing: Ls.sm_02, fontFamily: FontMono }}>CYCLE {log.cycleLetter}</Text>
 </View>
 )}
 {log.isException && (
 <View style={{ backgroundColor: 'rgba(251,146,60,0.1)', paddingHorizontal: 8, paddingVertical: 2 }}>
 <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: '#FB923C', letterSpacing: Ls.sm_02, fontFamily: FontMono }}>EXCEPTION</Text>
 </View>
 )}
 </View>
 <View style={[ss.row, { gap: 16, marginTop: 4 }]}>
 <View style={[ss.row, { gap: 4 }]}>
 <Target size={11} color={theme.mute} />
 <Text style={[ss.mdBlack, { color: theme.mute }]}>{workingCount} SETS</Text>
 </View>
 <View style={{ width: 1, height: 12, backgroundColor: Clr.white10 }} />
 <View style={[ss.row, { gap: 4 }]}>
 <Clock size={11} color={theme.mute} />
 <Text style={[ss.mdBlack, { color: theme.mute }]}>{Math.floor(log.duration / 60)} MIN</Text>
 </View>
 <View style={{ width: 1, height: 12, backgroundColor: Clr.white10 }} />
 <Text style={[ss.mdBlack, { color: theme.mute }]}>{Math.round(volume)} KG</Text>
 </View>
 </Card>
 </View>
 );
 })}
 </ScrollView>
 </View>
 );
}

const ss = StyleSheet.create({
 row: { flexDirection: 'row', alignItems: 'center' },
 rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
 label: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
 sm: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
 smThin: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
 md: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.md_02 },
 mdBlack: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.md_02 },
 xs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },
 xxs: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.xxs_02 },
 iconBtn: { width: 40, height: 40, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center' },
 topBar: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: Clr.white5 },
 sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
 sheet: { width: '100%', maxWidth: 512, alignSelf: 'center', borderTopWidth: 1, borderTopColor: Clr.white10, overflow: 'hidden' },
 grabberWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
 grabber: { width: 40, height: 4, backgroundColor: Clr.white20 },
 statHalf: { width: '47%', flexGrow: 1, padding: 16 },
});
