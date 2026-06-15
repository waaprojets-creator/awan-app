import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput as RNTextInput } from 'react-native';
import { CheckCircle2, ChevronLeft } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { Touch } from '../../components/ui/Touch';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import type { ExerciseSetLatest } from '../../data/schemas/sport/exerciseSet';
import { sessionDensity, bestOneRmFromSession } from '../../services/workoutAnalysisService';
import { useTheme } from '../../hooks/useTheme';
import { ds } from '../../utils/storage';
import { FontMono, FontSans } from '../../constants/typography';
import { Fs, Fw, Clr } from '../../theme/tokens';
import { ss } from './shared';
import type { ActiveSession, SessionSummary } from './types';

const TextInput = RNTextInput as React.ComponentType<any>;

export function FinishWorkout({
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
