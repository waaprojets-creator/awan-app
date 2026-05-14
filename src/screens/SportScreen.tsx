import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ScrollView, TextInput as RNTextInput, Modal, Alert, FlatList as RNFlatList } from 'react-native';

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
import { DailyCanvas } from '../components/DailyCanvas';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { sessionsThisWeek } from '../hooks/useAwanScore';
import { WorkoutService } from '../services/workoutService';
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
import type { ExerciseSetV1, SetKind } from '../data/schemas/sport/exerciseSet';

type ViewMode = 'list' | 'create' | 'edit' | 'active' | 'history' | 'finish';

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

function formatTime(s: number) {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function SportScreen() {
  useAppState() as any;
  const { addEntry, moveEntry, getEntriesByDate } = useDaily();
  const workoutStore = useWorkoutStore();

  const [view, setView] = useState<ViewMode>('list');
  const [editingRoutine, setEditingRoutine] = useState<RoutineLatest | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<any>(null);

  const today = ds(new Date());

  useEffect(() => {
    loadExerciseCatalog();
  }, []);

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
    setEditingRoutine(null);
    setView('list');
  }, [workoutStore]);

  const startWorkout = useCallback(async (routine: RoutineLatest, opts?: { isException?: boolean }) => {
    const lastSession = await WorkoutService.getLastSessionByRoutine(routine.id);
    const now = Date.now();
    const exercises: ActiveExercise[] = routine.exercises.map((re, idx) => {
      const lastExerciseLog = lastSession?.exercises.find(e => e.rid === re.rid);
      const lastWorkingSet = lastExerciseLog?.sets
        .filter(s => s.kind === 'working')
        .slice(-1)[0];
      const sets: ActiveSet[] = Array.from({ length: re.plannedSets }, (_, i) => ({
        kind: 'working' as SetKind,
        weightKg: lastWorkingSet?.weightKg ?? re.plannedWeightKg ?? undefined,
        reps: lastWorkingSet?.reps ?? re.plannedReps,
        rir: undefined,
        completed: false,
        index: i,
      }));
      return {
        rid: re.rid,
        exerciseId: re.exerciseId,
        name: re.name,
        primaryMuscle: re.primaryMuscle,
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
      equipment: ex.equipment,
      order: ex.order,
      sets: ex.sets
        .filter(s => s.completed)
        .map<ExerciseSetV1>(s => ({
          v: 1,
          exerciseId: ex.exerciseId,
          kind: s.kind,
          reps: s.reps,
          weightKg: s.weightKg,
          rir: s.rir,
          restActualSec: s.restActualSec,
          note: s.note,
          completedAt: s.completedAt,
        })),
    }));

    const session: WorkoutSessionLatest = {
      v: 1,
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
      note: summary.note,
      isException: activeSession.isException,
      exercises: exercisesLog,
    };

    workoutStore.saveSession(session);

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

    setActiveSession(null);
    setView('list');
  }, [activeSession, workoutStore, addEntry]);

  const deleteRoutine = useCallback((r: RoutineLatest) => {
    Alert.alert('Suppression', `Supprimer la routine "${r.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => workoutStore.deleteRoutine(r.id) },
    ]);
  }, [workoutStore]);

  if (view === 'create' || view === 'edit') {
    return (
      <RoutineEditor
        existing={view === 'edit' ? editingRoutine : null}
        onSave={saveRoutine}
        onCancel={() => { setEditingRoutine(null); setView('list'); }}
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
        onSave={handleFinishWorkout}
        onCancel={() => setView('active')}
      />
    );
  }

  if (view === 'history') {
    return <WorkoutHistory logs={workoutStore.sessions} onBack={() => setView('list')} />;
  }

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <div className="px-6 pt-4 pb-6">
          <ScreenHeader tag="BODY · SPORT" title="VECTEUR SPORTIF" />

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

          {nextRoutine && (
            <Card className="p-6 bg-awan-gold/5 border-awan-gold/20 mb-6" onPress={() => startWorkout(nextRoutine)}>
              <div className="flex flex-row items-center justify-between">
                <div className="flex-1">
                  <span className="awan-label text-awan-gold mb-1 block">PROCHAINE SÉANCE</span>
                  <Heading level={3} className="mb-1">{nextRoutine.name}</Heading>
                  <div className="flex flex-row items-center gap-3 mt-2">
                    {nextRoutine.cycleLetter && (
                      <div className="bg-awan-gold/15 px-2 py-0.5 rounded border border-awan-gold/30">
                        <span className="text-[9px] font-black text-awan-gold tracking-widest">CYCLE {nextRoutine.cycleLetter}</span>
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-widest">
                      {nextRoutine.exercises.length} EXERCICES
                    </span>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-awan-gold flex items-center justify-center shadow-xl shadow-awan-gold/30">
                  <Play size={24} color="black" strokeWidth={3} />
                </div>
              </div>
            </Card>
          )}

          <div className="mb-10">
            <Heading level={4} mono subtitle="Séquence Motrice">HISTORIQUE DU JOUR</Heading>
            <div className="bg-awan-bg/40 p-4 rounded-awan-xl border border-white/5 min-h-[150px]">
              <DailyCanvas
                dateId={today}
                filterModule="sport"
                onReorder={(activeId, overId) => moveEntry(today, activeId, overId)}
              />
            </div>
            {getEntriesByDate(today).filter((e: any) => e.module === 'sport').length === 0 && null}
          </div>

          <div className="mb-6 flex flex-row gap-3">
            <Touch
              className="flex-1 h-14 bg-awan-gold rounded-awan-xl flex items-center justify-center"
              onPress={() => { setEditingRoutine(null); setView('create'); }}
            >
              <div className="flex flex-row items-center gap-2">
                <Plus size={18} color="black" strokeWidth={3} />
                <span className="awan-label text-black font-black">NOUVELLE ROUTINE</span>
              </div>
            </Touch>
            <Touch
              className="px-5 h-14 bg-white/5 rounded-awan-xl flex items-center justify-center border border-white/10"
              onPress={() => setView('history')}
            >
              <History size={18} className="text-awan-tx-mute" />
            </Touch>
          </div>

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
                    <Card className="p-6 bg-awan-surface/20" onPress={() => startWorkout(r)}>
                      <div className="flex flex-row justify-between items-center mb-2">
                        <span className="text-lg font-bold text-awan-tx uppercase tracking-tight flex-1">{r.name}</span>
                        <div className="flex flex-row gap-2">
                          <Touch onPress={(e: any) => { e.stopPropagation(); setEditingRoutine(r); setView('edit'); }}>
                            <Info size={16} className="text-awan-tx-mute" />
                          </Touch>
                          <Touch onPress={(e: any) => { e.stopPropagation(); deleteRoutine(r); }}>
                            <Trash2 size={16} className="text-white/20" />
                          </Touch>
                        </div>
                      </div>
                      <div className="flex flex-row items-center gap-3">
                        {r.cycleLetter && (
                          <div className="bg-awan-gold/10 px-2 py-0.5 rounded border border-awan-gold/20">
                            <span className="text-[9px] font-black text-awan-gold tracking-widest">CYCLE {r.cycleLetter}</span>
                          </div>
                        )}
                        <div className="bg-white/5 px-2 py-0.5 rounded">
                          <span className="text-[9px] font-black text-awan-tx-mute tracking-widest">{r.exercises.length} EX</span>
                        </div>
                      </div>
                      <div className="absolute right-6 bottom-6 w-10 h-10 rounded-full bg-awan-gold/20 flex items-center justify-center border border-awan-gold/20">
                        <Play size={18} className="text-awan-gold" strokeWidth={3} />
                      </div>
                    </Card>
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
  rir?: number | undefined;
  restActualSec?: number | undefined;
  note?: string | undefined;
  completed: boolean;
  completedAt?: number | undefined;
  index: number;
}

interface ActiveExercise {
  rid: string;
  exerciseId: string;
  name: string;
  primaryMuscle?: string | undefined;
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
  exercises: ActiveExercise[];
  currentExerciseIdx: number;
  restEndAt: number | null;
  stage: 'arrived' | 'workout' | 'done';
}

interface SessionSummary {
  feeling?: number | undefined;
  sessionRPE?: number | undefined;
  note?: string | undefined;
}

// ─── Routine Editor ──────────────────────────────────────────────────────────

function RoutineEditor({
  existing,
  onSave,
  onCancel,
}: {
  existing: RoutineLatest | null;
  onSave: (r: RoutineLatest) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [cycleLetter, setCycleLetter] = useState<CycleLetter | null>(existing?.cycleLetter ?? null);
  const [defaultRestSec, setDefaultRestSec] = useState(existing?.defaultRestSec ?? DEFAULT_REST_SEC);
  const [exercises, setExercises] = useState<RoutineExercise[]>(
    existing?.exercises ?? [],
  );
  const [isPicking, setIsPicking] = useState(false);

  const addExercise = useCallback((ex: ExerciseEntry) => {
    setExercises(prev => [
      ...prev,
      {
        rid: uid(),
        exerciseId: ex.id,
        name: ex.n,
        primaryMuscle: ex.pm[0],
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
    if (!trimmed) { Alert.alert('Erreur', 'Donne un nom à la routine'); return; }
    if (exercises.length === 0) { Alert.alert('Erreur', 'Ajoute au moins un exercice'); return; }
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
    <div className="flex-1 bg-awan-bg">
      <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
        <div className="flex flex-row items-center gap-4">
          <Touch onPress={onCancel} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
            <ChevronLeft size={20} className="text-awan-tx-mute" />
          </Touch>
          <Heading level={2} className="mb-0 flex-1" subtitle={existing ? 'Modification' : 'Nouvelle routine'}>PROTOCOLE</Heading>
          <Touch onPress={handleSave} className="w-10 h-10 bg-awan-gold rounded-full flex items-center justify-center shadow-lg shadow-awan-gold/20">
            <CheckCircle2 size={20} color="black" strokeWidth={3} />
          </Touch>
        </div>
      </div>

      <ScrollView contentContainerStyle={{ paddingBottom: 140, padding: 24 }} style={{ flex: 1 }}>
        <div className="mb-6">
          <span className="awan-label mb-3 block">NOM</span>
          <TextInput
            className="bg-white/5 border border-white/5 rounded-awan-xl p-5 text-awan-tx font-bold text-base"
            value={name}
            onChangeText={setName}
            placeholder="Push, Pull, Legs..."
            placeholderTextColor="#3a3a3a"
          />
        </div>

        <div className="mb-6">
          <span className="awan-label mb-3 block">CYCLE A/B/C/D</span>
          <div className="flex flex-row gap-2">
            {CYCLE_LETTERS.map(l => (
              <Touch
                key={l ?? 'none'}
                onPress={() => setCycleLetter(l)}
                className={`flex-1 h-12 rounded-xl border flex items-center justify-center ${
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
            <Touch onPress={() => setDefaultRestSec(Math.max(0, defaultRestSec - 15))} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
              <Minus size={16} className="text-awan-tx-mute" />
            </Touch>
            <div className="flex-1 bg-black/40 rounded-xl h-12 flex items-center justify-center">
              <span className="text-awan-gold font-mono font-bold text-lg">{defaultRestSec}s</span>
            </div>
            <Touch onPress={() => setDefaultRestSec(defaultRestSec + 15)} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
              <Plus size={16} className="text-awan-tx-mute" />
            </Touch>
          </div>
        </div>

        <div className="mb-6">
          <Heading level={4} mono subtitle={`${exercises.length} indexé(s)`}>EXERCICES</Heading>
          {exercises.length === 0 && (
            <div className="py-12 border-2 border-dashed border-white/5 rounded-awan-xl items-center">
              <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-[0.2em] italic">Aucun exercice</span>
            </div>
          )}
          <StaggerList>
            {exercises.map((ex, idx) => (
              <StaggerItem key={ex.rid} className="mb-3">
                <Card className="p-4 bg-white/5" variant="flat">
                  <div className="flex flex-row items-start justify-between mb-3">
                    <div className="flex-1">
                      <span className="text-sm font-bold text-awan-tx uppercase tracking-tight block">{ex.name}</span>
                      <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-widest">
                        {MUSCLES[ex.primaryMuscle ?? '']} • {ex.equipment}
                      </span>
                    </div>
                    <Touch onPress={() => removeExercise(idx)}>
                      <Trash2 size={16} className="text-awan-status-error/40" />
                    </Touch>
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
            className="mt-4 h-14 bg-white/5 border border-dashed border-awan-gold/40 rounded-awan-xl flex items-center justify-center"
            onPress={() => setIsPicking(true)}
          >
            <div className="flex flex-row items-center gap-3">
              <Plus size={18} className="text-awan-gold" />
              <span className="awan-label text-awan-gold">AJOUTER UN EXERCICE</span>
            </div>
          </Touch>
        </div>
      </ScrollView>

      <ExercisePicker visible={isPicking} onClose={() => setIsPicking(false)} onPick={addExercise} />
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
      <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-widest mb-1 block">{label}</span>
      <div className="flex flex-row items-center gap-1">
        <Touch onPress={() => onChange(Math.max(min, value - step))} className="w-8 h-10 bg-black/30 rounded-lg flex items-center justify-center">
          <Minus size={12} className="text-awan-tx-mute" />
        </Touch>
        <div className="flex-1 bg-black/40 rounded-lg h-10 flex items-center justify-center">
          <span className="text-awan-tx font-mono font-bold text-sm">{value}</span>
        </div>
        <Touch onPress={() => onChange(value + step)} className="w-8 h-10 bg-black/30 rounded-lg flex items-center justify-center">
          <Plus size={12} className="text-awan-tx-mute" />
        </Touch>
      </div>
    </div>
  );
}

// ─── Exercise Picker ────────────────────────────────────────────────────────

function ExercisePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (ex: ExerciseEntry) => void;
}) {
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string | null>(null);

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
            <Touch onPress={() => { onClose(); setSearch(''); setFilterMuscle(null); }} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
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
              className={`px-4 py-2 rounded-full border transition-all ${
                !filterMuscle ? 'bg-awan-gold/20 border-awan-gold' : 'bg-white/5 border-white/5'
              }`}
            >
              <span className={`text-[10px] font-black uppercase tracking-widest ${!filterMuscle ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>Tous</span>
            </Touch>
            {Object.entries(MUSCLES).map(([id, label]) => (
              <Touch
                key={id}
                onPress={() => setFilterMuscle(id)}
                className={`px-4 py-2 rounded-full border transition-all ${
                  filterMuscle === id ? 'bg-awan-gold/20 border-awan-gold' : 'bg-white/5 border-white/5'
                }`}
              >
                <span className={`text-[10px] font-black uppercase tracking-widest ${filterMuscle === id ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
                  {label}
                </span>
              </Touch>
            ))}
          </ScrollView>
        </div>

        <FlatList
          data={results}
          keyExtractor={(item: ExerciseEntry) => item.id}
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          renderItem={({ item: ex }: { item: ExerciseEntry }) => (
            <Card className="flex-row items-center gap-4 py-4 px-5 bg-white/5 mb-3" variant="flat" onPress={() => onPick(ex)}>
              <div className="flex-1">
                <span className="text-base font-bold text-awan-tx uppercase tracking-tight block">{ex.n}</span>
                <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-widest">
                  {MUSCLES[ex.pm[0] ?? '']} • {ex.eq}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-awan-gold/20 flex items-center justify-center border border-awan-gold/30">
                <Plus size={18} className="text-awan-gold" />
              </div>
            </Card>
          )}
        />
      </div>
    </Modal>
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
      const exercises = s.exercises.map((e, i) =>
        i !== exIdx
          ? e
          : { ...e, sets: e.sets.map((st, j) => (j !== setIdx ? st : { ...st, completed: true, completedAt: Date.now() })) },
      );
      const restEndAt = Date.now() + ex.restSec * 1000;
      return { ...s, exercises, restEndAt };
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
      <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/10">
        <div className="flex flex-row justify-between items-center mb-6">
          <div className="flex-1">
            <span className="awan-label text-awan-gold mb-1 block">SÉANCE EN COURS</span>
            <Heading level={2} className="mb-0 uppercase">{session.routineName}</Heading>
          </div>
          <Touch onPress={onFinishRequest} className="bg-awan-gold px-5 py-3 rounded-xl">
            <span className="awan-label text-black font-black">TERMINER</span>
          </Touch>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="flex-row items-center justify-center py-3 bg-black/40 border-awan-gold/20">
            <Clock size={16} className="text-awan-gold mr-2" />
            <span className="text-xl font-mono font-bold text-awan-gold tracking-widest tabular-nums">{formatTime(timer)}</span>
          </Card>
          <Card className={`flex-row items-center justify-center py-3 bg-black/40 ${restRemaining > 0 ? 'border-orange-400/50' : 'border-white/5'}`}>
            <Timer size={16} className={restRemaining > 0 ? 'text-orange-400 mr-2' : 'text-awan-tx-mute mr-2'} />
            <span className={`text-xl font-mono font-bold tracking-widest tabular-nums ${restRemaining > 0 ? 'text-orange-400' : 'text-awan-tx-mute'}`}>
              {formatTime(restRemaining)}
            </span>
            {restRemaining > 0 && (
              <Touch onPress={skipRest} className="ml-3 px-2 py-1 bg-white/10 rounded">
                <span className="text-[9px] font-black text-awan-tx tracking-widest">PASSER</span>
              </Touch>
            )}
          </Card>
        </div>
      </div>

      <ScrollView contentContainerStyle={{ paddingBottom: 160, padding: 24 }} style={{ flex: 1 }}>
        {session.exercises.map((ex, exIdx) => (
          <Card key={ex.rid} className="mb-6 p-5 border-white/10 bg-white/5">
            <div className="mb-4">
              <span className="text-base font-bold text-awan-tx uppercase tracking-tight block">{ex.name}</span>
              <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-widest">
                {MUSCLES[ex.primaryMuscle ?? '']} • {ex.equipment} • repos {ex.restSec}s
              </span>
            </div>

            <div className="flex flex-row mb-3 px-1 gap-2">
              <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest w-10 text-center">N°</span>
              <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest w-20 text-center">TYPE</span>
              <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest flex-1 text-center">KG</span>
              <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest flex-1 text-center">REPS</span>
              <span className="text-[9px] font-black text-awan-tx-mute uppercase tracking-widest w-12 text-center">RIR</span>
              <span className="w-10" />
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
              className="mt-3 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center"
              onPress={() => addSet(exIdx)}
            >
              <div className="flex flex-row items-center gap-2">
                <Plus size={12} className="text-awan-tx-mute" strokeWidth={3} />
                <span className="text-[9px] font-black text-awan-tx-mute tracking-widest">AJOUTER UN SET</span>
              </div>
            </Touch>
          </Card>
        ))}

        <Touch
          className="mt-6 py-4 items-center"
          onPress={() => Alert.alert('Abandon', 'Quitter la séance sans sauvegarder ?', [
            { text: 'Non', style: 'cancel' },
            { text: 'Oui', style: 'destructive', onPress: onAbort },
          ])}
        >
          <span className="text-[10px] font-black text-awan-status-error uppercase tracking-[0.3em] opacity-50">ANNULER LA SÉANCE</span>
        </Touch>
      </ScrollView>
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
    <div className={`flex flex-row items-center gap-2 mb-2 ${completed ? 'opacity-50' : ''}`}>
      <div className="w-10 text-center">
        <span className="text-xs font-mono font-black text-awan-tx-mute">{index + 1}</span>
      </div>
      <Touch onPress={() => setKindMenu(v => !v)} className="w-20 h-10 bg-black/30 rounded-lg flex items-center justify-center relative">
        <span className={`text-[9px] font-black tracking-widest ${SET_KIND_COLOR[set.kind]}`}>{SET_KIND_LABEL[set.kind]}</span>
        {kindMenu && (
          <div className="absolute top-full left-0 mt-1 bg-awan-surface border border-white/10 rounded-lg z-10 min-w-[100px]">
            {(['warmup', 'working', 'drop', 'failure'] as SetKind[]).map(k => (
              <Touch
                key={k}
                onPress={() => { onChange({ kind: k }); setKindMenu(false); }}
                className="px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0"
              >
                <span className={`text-[9px] font-black tracking-widest ${SET_KIND_COLOR[k]}`}>{SET_KIND_LABEL[k]}</span>
              </Touch>
            ))}
          </div>
        )}
      </Touch>
      <TextInput
        className="flex-1 bg-black/40 border border-white/5 rounded-lg h-10 text-center text-awan-gold font-mono font-bold text-sm"
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
        className="flex-1 bg-black/40 border border-white/5 rounded-lg h-10 text-center text-awan-tx font-mono font-bold text-sm"
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
        className="w-12 bg-black/40 border border-white/5 rounded-lg h-10 text-center text-awan-tx-mute font-mono font-bold text-sm"
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
      <Touch
        onPress={onComplete}
        disabled={completed}
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          completed ? 'bg-awan-status-ok/20' : 'bg-awan-gold/20 border border-awan-gold/30'
        }`}
      >
        <CheckCircle2
          size={18}
          className={completed ? 'text-awan-status-ok' : 'text-awan-gold'}
          strokeWidth={completed ? 2 : 3}
        />
      </Touch>
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
  return (
    <div className="flex-1 bg-awan-bg">
      <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/10">
        <div className="flex flex-row items-center gap-4 mb-4">
          <Touch onPress={onAbort} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
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
              className={`flex-1 h-16 rounded-xl border flex items-center justify-center ${
                session.solo ? 'bg-awan-gold/15 border-awan-gold' : 'bg-white/5 border-white/5'
              }`}
            >
              <span className={`text-sm font-black tracking-widest ${session.solo ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>SEUL</span>
            </Touch>
            <Touch
              onPress={() => onUpdate(s => ({ ...s, solo: false }))}
              className={`flex-1 h-16 rounded-xl border flex items-center justify-center ${
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
                className={`px-4 py-3 rounded-xl border ${
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
          className="h-16 bg-awan-gold rounded-2xl flex items-center justify-center shadow-xl shadow-awan-gold/20 mt-6"
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

// ─── Finish Workout (feeling + RPE + note) ──────────────────────────────────

function FinishWorkout({
  session,
  onSave,
  onCancel,
}: {
  session: ActiveSession;
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
    return { workingCount: workingSets.length, volume };
  }, [session]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 bg-awan-bg">
      <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
        <div className="flex flex-row items-center gap-4">
          <Touch onPress={onCancel} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
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
          </Card>
        </div>

        <div className="mb-8">
          <span className="awan-label mb-3 block">FORME / ÉNERGIE (1-5)</span>
          <div className="flex flex-row gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <Touch
                key={n}
                onPress={() => setFeeling(n)}
                className={`flex-1 h-14 rounded-xl border flex items-center justify-center ${
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
                className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
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
            className="bg-white/5 border border-white/5 rounded-awan-xl p-5 text-awan-tx font-bold text-sm min-h-[100px]"
            value={note}
            onChangeText={setNote}
            placeholder="Ressenti, observations..."
            placeholderTextColor="#3a3a3a"
            multiline
          />
        </div>

        <Touch
          onPress={() => onSave({ feeling, sessionRPE, note: note.trim() || undefined })}
          className="h-16 bg-awan-gold rounded-2xl flex items-center justify-center shadow-xl shadow-awan-gold/20"
        >
          <div className="flex flex-row items-center gap-3">
            <CheckCircle2 size={20} color="black" strokeWidth={3} />
            <span className="awan-label text-black font-black">ENREGISTRER LA SÉANCE</span>
          </div>
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
          <Touch onPress={onBack} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
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
                    <span className="text-[10px] font-mono font-bold text-awan-gold">{log.date}</span>
                  </div>
                  <div className="flex flex-row items-center gap-4 mb-2">
                    {log.cycleLetter && (
                      <div className="bg-awan-gold/10 px-2 py-0.5 rounded">
                        <span className="text-[9px] font-black text-awan-gold tracking-widest">CYCLE {log.cycleLetter}</span>
                      </div>
                    )}
                    {log.isException && (
                      <div className="bg-orange-400/10 px-2 py-0.5 rounded">
                        <span className="text-[9px] font-black text-orange-400 tracking-widest">EXCEPTION</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row items-center gap-4 mt-1">
                    <div className="flex flex-row items-center gap-1">
                      <Target size={11} className="text-awan-tx-mute" />
                      <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-widest">{workingCount} SETS</span>
                    </div>
                    <div className="w-[1px] h-3 bg-white/10" />
                    <div className="flex flex-row items-center gap-1">
                      <Clock size={11} className="text-awan-tx-mute" />
                      <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-widest">{Math.floor(log.duration / 60)} MIN</span>
                    </div>
                    <div className="w-[1px] h-3 bg-white/10" />
                    <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-widest">{Math.round(volume)} KG</span>
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
