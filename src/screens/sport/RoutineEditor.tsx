import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Modal, TextInput as RNTextInput, Pressable, FlatList as RNFlatList, StyleSheet } from 'react-native';
import { Search, Plus, X, Info, Minus, CheckCircle2, ChevronLeft, Trash2 } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { Touch } from '../../components/ui/Touch';
import {
  DEFAULT_PLANNED_SETS,
  DEFAULT_PLANNED_REPS,
  DEFAULT_REST_SEC,
  type RoutineExercise,
  type RoutineLatest,
  type CycleLetter,
} from '../../data/schemas/sport/routine';
import { MUSCLES, searchExercises, loadExerciseCatalog, type ExerciseEntry } from '../../utils/sportData';
import { uid } from '../../utils/storage';

import { useTheme } from '../../hooks/useTheme';
import { FontMono, FontSans } from '../../constants/typography';
import { Fs, Fw, Clr } from '../../theme/tokens';
import { ss, CYCLE_LETTERS } from './shared';
import type { RoutineDraft } from './types';
import { useRoutineDraftPersistence } from '../../hooks/useRoutineDraftPersistence';

const TextInput = RNTextInput as React.ComponentType<any>;
const FlatList = RNFlatList as React.ComponentType<any>;

export function RoutineEditor({
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

  const draft = useMemo<RoutineDraft>(() => ({
    existingId: existing?.id,
    name,
    cycleLetter,
    defaultRestSec,
    exercises,
  }), [name, cycleLetter, defaultRestSec, exercises, existing?.id]);

  useRoutineDraftPersistence(draft, { enabled: true });

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
