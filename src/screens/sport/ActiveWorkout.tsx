import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Modal, StyleSheet, TextInput as RNTextInput } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Clock, Timer, Plus, X, CheckCircle2 } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { Touch } from '../../components/ui/Touch';
import { OneRepMaxService } from '../../services/oneRepMaxService';
import { MUSCLES, searchExercises, loadExerciseCatalog } from '../../utils/sportData';
import type { ExerciseEntry } from '../../utils/sportData';
import { useTheme } from '../../hooks/useTheme';
import { FontMono, FontSans } from '../../constants/typography';
import { Fs, Fw, Ls, Clr } from '../../theme/tokens';
import { ss, formatTime, computeOneRM, notifyRestEnd, SET_KIND_LABEL, setKindColor } from './shared';
import type { ActiveSession, ActiveSet, ActiveExercise } from './types';
import type { SetKind } from '../../data/schemas/sport/exerciseSet';
import { PreWorkout } from './PreWorkout';
import { useRestTimer } from '../../hooks/useRestTimer';

const TextInput = RNTextInput as React.ComponentType<any>;
const SvgCircle = Circle as any;

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

export function ActiveWorkout({
  session, timer, onUpdate, onFinishRequest, onAbort,
}: {
  session: ActiveSession;
  timer: number;
  onUpdate: (updater: (s: ActiveSession) => ActiveSession) => void;
  onFinishRequest: () => void;
  onAbort: () => void;
}) {
  const theme = useTheme();
  const restRemaining = useRestTimer(session.restEndAt, useCallback(() => {
    notifyRestEnd();
    onUpdate(s => ({ ...s, restEndAt: null }));
  }, [onUpdate]));
  const [substituteTarget, setSubstituteTarget] = useState<{ exIdx: number; muscle: string } | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

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
          void OneRepMaxService.saveRecords(newBestOneRMs);
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
