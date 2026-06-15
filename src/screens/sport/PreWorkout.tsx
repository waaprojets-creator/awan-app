import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput as RNTextInput } from 'react-native';
import { ChevronLeft, Flame, Trash2 } from 'lucide-react-native';
import { Heading } from '../../components/ui/Heading';
import { Touch } from '../../components/ui/Touch';
import { useTheme } from '../../hooks/useTheme';
import { FontMono, FontSans } from '../../constants/typography';
import { Fs, Fw, Ls, Clr } from '../../theme/tokens';
import { ss } from './shared';
import type { ActiveSession, ActiveExercise } from './types';

const TextInput = RNTextInput as React.ComponentType<any>;

export function PreWorkout({
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
