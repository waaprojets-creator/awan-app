import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, ScrollView, TextInput, Modal, Alert, Image, FlatList } from 'react-native';
import { motion, AnimatePresence } from 'motion/react';
import { useAppState } from '../context/AppStateContext';
import { useDaily } from '../context/DailyContext';
import { EXERCISES, MUSCLES } from '../utils/sportData';
import { uid, ds } from '../utils/storage';
import { Play, Plus, Trash2, Clock, CheckCircle2, ChevronLeft, Dumbbell, History, Info, Activity, Flame, Target, X, ChevronRight, Search, Activity as ActivityIcon } from 'lucide-react';
import { PageWrapper, StaggerList, StaggerItem } from '../components/Animated';
import { DailyCanvas } from '../components/DailyCanvas';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';

// Sub-components will be updated in next steps...

export default function SportScreen() {
  const { db, updateDb, navigate } = useAppState() as any;
  const { getEntriesByDate, addEntry, moveEntry } = useDaily();

  const [view, setView] = useState('list'); // 'list', 'create', 'active', 'history'
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<any>(null);

  const [inputText, setInputText] = useState('');
  const today = ds(new Date());

  const allEntries = getEntriesByDate(today);
  const sportEntries = allEntries.filter(e => e.module === 'sport');

  const handleAddEntry = () => {
    if (!inputText.trim()) return;
    const entryId = Date.now().toString();
    const parts = inputText.split(' ');
    const tokens = parts.map((part) => {
      let icon = '🏋️';
      let label = 'Exercice';
      if (part.includes('kg')) { icon = '⚖️'; label = 'Charge'; }
      if (part.includes('x') || !isNaN(Number(part))) { icon = '🔄'; label = 'Reps/Séries'; }
      if (part.includes('min') || part.includes('h')) { icon = '⏱️'; label = 'Durée'; }
      return { label, value: part, icon };
    });

    addEntry(today, {
      id: entryId,
      timestamp: Date.now(),
      module: 'sport',
      rawText: inputText,
      tokens
    });
    setInputText('');
  };

  useEffect(() => {
    if (activeWorkout) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [activeWorkout]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const saveRoutine = (rout: any) => {
    const freshDb = { ...db, routinesMuscu: [...(db.routinesMuscu || []), rout] };
    updateDb(freshDb);
    setView('list');
  };

  const startWorkout = (routine: any) => {
    setActiveWorkout({
      id: uid(),
      name: routine.name,
      exercises: routine.exercises.map((ex: any) => ({ ...ex, sets: [{ weight: '', reps: '' }] })),
      startTime: Date.now(),
    });
    setTimer(0);
    setView('active');
  };

  const finishWorkout = () => {
    const finished = {
      ...activeWorkout,
      endTime: Date.now(),
      duration: timer,
      date: ds(new Date())
    };
    const freshDb = { ...db, workoutLogs: [...(db.workoutLogs || []), finished] };
    updateDb(freshDb);
    setActiveWorkout(null);

    addEntry(today, {
      id: uid(),
      timestamp: Date.now(),
      module: 'sport',
      rawText: `Séance: ${finished.name} (${Math.floor(timer/60)} min)`,
      tokens: [
        { label: 'Type', value: 'Séance Guidée', icon: '📋' },
        { label: 'Nom', value: finished.name, icon: '🏋️' },
        { label: 'Durée', value: `${Math.floor(timer/60)} min`, icon: '⏱️' },
        { label: 'Exercices', value: String(finished.exercises.length), icon: '🔢' }
      ]
    });

    setView('list');
  };

  const deleteRoutine = (rout: any) => {
    Alert.alert(
      'DÉCLASSÉ',
      'Confirmer la suppression de ce profil d\'entraînement ?',
      [
        { text: 'ANNULER', style: 'cancel' },
        { text: 'SUPPRIMER', style: 'destructive', onPress: () => {
          const freshDb = { ...db, routinesMuscu: (db.routinesMuscu || []).filter((r: any) => r.id !== rout.id) };
          updateDb(freshDb);
        }}
      ]
    );
  };

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      {view === 'list' && (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <div className="px-6 pt-12 pb-6">
          <Heading level={1} className="mb-8" subtitle="Condition Physique">VECTEUR SPORTIF</Heading>

          {/* Quick Metrics */}
            <div className="flex flex-row gap-4 mb-10">
              <Card className="flex-1 p-5 bg-white/5 border-white/5" variant="flat">
                <div className="flex flex-row items-center gap-2 mb-2">
                  <ActivityIcon size={12} className="text-awan-gold" />
                  <span className="awan-label">NIVEAU FLUX</span>
                </div>
                <span className="text-xl font-bold font-mono text-awan-tx">85%</span>
              </Card>
              <Card className="flex-1 p-5 bg-white/5 border-white/5" variant="flat">
                <div className="flex flex-row items-center gap-2 mb-2">
                  <Flame size={12} className="text-awan-status-error" />
                  <span className="awan-label">OUTPUT</span>
                </div>
                <span className="text-xl font-bold font-mono text-awan-tx">1.2K</span>
              </Card>
            </div>

            <div className="mb-10">
              <Heading level={4} mono subtitle="Capture Musculaire">FLUX LIBRE</Heading>
              <div className="flex flex-row gap-3 items-center">
                <TextInput
                  className="flex-1 bg-awan-bg-soft border border-white/5 rounded-awan-xl px-5 py-4 text-sm font-bold text-awan-tx"
                  placeholder="Rédiger une performance..."
                  placeholderTextColor="#6C665E"
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleAddEntry}
                />
                <Touch 
                  onPress={handleAddEntry}
                  className="w-14 h-14 bg-awan-gold rounded-2xl flex items-center justify-center shadow-lg shadow-awan-gold/10"
                >
                  <Plus size={24} color="black" strokeWidth={3} />
                </Touch>
              </div>
            </div>

            <div className="mb-10">
               <Heading level={4} mono subtitle="Séquence Motrice">HISTORIQUE DU JOUR</Heading>
               <div className="bg-awan-bg-soft/40 p-4 rounded-awan-xl border border-white/5 min-h-[150px]">
                <DailyCanvas 
                  dateId={today} 
                  filterModule="sport"
                  onReorder={(activeId, overId) => moveEntry(today, activeId, overId)}
                />
              </div>
            </div>

            <div className="mb-20">
              <Heading level={4} mono subtitle="Protocoles Guidés">ROUTINES ENREGISTRÉES</Heading>
              {(!db?.routinesMuscu || db.routinesMuscu.length === 0) ? (
                <Card className="py-16 items-center bg-white/5 border-white/10 border-dashed">
                  <Dumbbell size={48} className="text-white/10 mb-6" />
                  <span className="awan-label mb-8">AUCUN PROTOCOLE ACTIF DÉTECTÉ</span>
                  <Touch onPress={() => setView('create')} className="px-8 h-14 bg-awan-gold rounded-2xl flex items-center justify-center">
                    <span className="awan-label text-black font-black">DÉPLOYER PREMIÈRE ROUTINE</span>
                  </Touch>
                </Card>
              ) : (
                <StaggerList>
                  {db.routinesMuscu.map((r: any) => (
                    <StaggerItem key={r.id} className="mb-4">
                      <Card className="p-6 bg-awan-bg-highlight/20" onPress={() => startWorkout(r)}>
                        <div className="flex flex-row justify-between items-center mb-1">
                          <span className="text-lg font-bold text-awan-tx uppercase tracking-tight">{r.name}</span>
                          <Touch onPress={(e) => { e.stopPropagation(); deleteRoutine(r); }}>
                            <Trash2 size={16} className="text-white/20" />
                          </Touch>
                        </div>
                        <div className="flex flex-row items-center gap-3">
                          <div className="bg-awan-gold/10 px-2 py-0.5 rounded border border-awan-gold/20">
                            <span className="text-[9px] font-black text-awan-gold tracking-widest">{r.exercises.length} UNITÉS</span>
                          </div>
                          <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-widest">Initialisé via Routine</span>
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
      )}

      {view === 'create' && <CreateRoutine onSave={saveRoutine} onCancel={() => setView('list')} />}
      {view === 'active' && <ActiveWorkout workout={activeWorkout} timer={timer} formatTime={formatTime} onUpdate={setActiveWorkout} onFinish={finishWorkout} onAbort={() => { setActiveWorkout(null); setView('list'); }} />}
      {view === 'history' && <WorkoutHistory logs={db?.workoutLogs || []} onBack={() => setView('list')} />}
      <ExerciseDetail exercise={(null as any)} visible={false} onClose={() => {}} />
    </PageWrapper>
  );
}

function ExerciseDetail({ exercise, visible, onClose }: any) {
  if (!exercise) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <div className="flex-1 flex justify-center items-center bg-black/90 backdrop-blur-md p-6">
        <Touch className="absolute inset-0" onPress={onClose} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-awan-bg-highlight rounded-awan-3xl border border-white/10 shadow-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-white/10 bg-white/5 relative">
            <span className="awan-label mb-2 text-awan-gold">{MUSCLES[exercise.m]?.l.toUpperCase()}</span>
            <Heading level={2} className="mb-0">{exercise.n}</Heading>
            <Touch onPress={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <X size={20} className="text-awan-tx-mute" />
            </Touch>
          </div>

          <div className="p-8">
            <div className="h-48 bg-black/20 rounded-2xl mb-8 items-center justify-center border border-white/5 overflow-hidden">
               <Image source={{ uri: exercise.anim || exercise.img }} className="w-full h-full" resizeMode="contain" />
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="awan-label">ÉQUIPEMENT</span>
                <span className="text-sm font-bold text-awan-tx">{exercise.eq}</span>
              </div>
              <div>
                <span className="awan-label mb-2 block">PROTOCOLE EXÉCUTION</span>
                <p className="text-sm text-awan-tx opacity-70 leading-relaxed font-medium">
                  {exercise.d || 'Aucun détail technique spécifique disponible pour cette unité motrice.'}
                </p>
              </div>
            </div>

            <Touch onPress={onClose} className="mt-10 h-16 bg-awan-gold rounded-2xl flex items-center justify-center shadow-xl shadow-awan-gold/10">
              <span className="awan-label text-black font-black">FERMER LE DOSSIER</span>
            </Touch>
          </div>
        </motion.div>
      </div>
    </Modal>
  );
}

function CreateRoutine({ onSave, onCancel }: any) {
  const [name, setName] = useState('');
  const [selectedEx, setSelectedEx] = useState<any[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string | null>(null);
  const [viewingEx, setViewingEx] = useState<any>(null);

  const addEx = useCallback((ex: any) => {
    setSelectedEx(prev => [...prev, { ...ex, rid: uid() }]);
    setIsPicking(false);
    setSearch('');
    setFilterMuscle(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!name || selectedEx.length === 0) return Alert.alert('Attention', 'Nom et exercices requis');
    onSave({ id: uid(), name, exercises: selectedEx });
  }, [name, selectedEx, onSave]);

  const filteredExercises = useMemo(() => {
    return (EXERCISES as any[]).filter(ex => {
      const s = search.trim().toLowerCase();
      const matchesSearch = !s || ex.n.toLowerCase().includes(s) || (ex.eq && ex.eq.toLowerCase().includes(s));
      const matchesMuscle = !filterMuscle || ex.m === filterMuscle;
      return matchesSearch && matchesMuscle;
    });
  }, [search, filterMuscle]);

  return (
    <div className="flex-1 bg-awan-bg">
      <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
        <div className="flex flex-row items-center gap-4">
          <Touch onPress={onCancel} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
            <ChevronLeft size={20} className="text-awan-tx-mute" />
          </Touch>
          <Heading level={2} className="mb-0 flex-1" subtitle="Configuration Plan">PROTOCOLE</Heading>
          <Touch onPress={handleSave} className="w-10 h-10 bg-awan-gold rounded-full flex items-center justify-center shadow-lg shadow-awan-gold/20">
            <CheckCircle2 size={20} color="black" strokeWidth={3} />
          </Touch>
        </div>
      </div>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, padding: 24 }} style={{ flex: 1 }}>
        <div className="mb-8">
          <span className="awan-label mb-3 block">IDENTIFIANT DU PROTOCOLE</span>
          <TextInput 
            className="bg-white/5 border border-white/5 rounded-awan-xl p-5 text-awan-tx font-bold text-base" 
            value={name} 
            onChangeText={setName} 
            placeholder="NOM DE LA ROUTINE..." 
            placeholderTextColor="#252525"
          />
        </div>

        <div className="mb-10">
          <Heading level={4} mono subtitle={`Indexé: ${selectedEx.length}`}>UNITÉS MOTRICES</Heading>
          {selectedEx.length === 0 && (
            <div className="py-12 border-2 border-dashed border-white/5 rounded-awan-xl items-center">
              <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-[0.2em] italic">Aucune unité affectée à ce protocole.</span>
            </div>
          )}
          <StaggerList>
            {selectedEx.map((ex, idx) => (
              <StaggerItem key={ex.rid} className="mb-3">
                <Card className="flex-row items-center gap-4 py-4 px-5 bg-white/5" variant="flat">
                  <div className="w-10 h-10 rounded-xl bg-black/40 items-center justify-center border border-white/10 relative overflow-hidden">
                    {ex.img ? <Image source={{ uri: ex.img }} className="w-full h-full" resizeMode="cover" /> : <span className="text-lg">{ex.icon}</span>}
                    <Touch onPress={() => setViewingEx(ex)} className="absolute inset-0 bg-black/40 items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Info size={14} className="text-white" />
                    </Touch>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-awan-tx uppercase tracking-tight">{ex.n}</span>
                    <span className="text-[9px] font-bold text-awan-tx-mute uppercase tracking-widest mt-1">{(MUSCLES as any)[ex.m]?.l} • {ex.eq}</span>
                  </div>
                  <Touch onPress={() => setSelectedEx(selectedEx.filter((_, i) => i !== idx))}>
                    <Trash2 size={16} className="text-awan-status-error/40 hover:text-awan-status-error" />
                  </Touch>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
          
          <Touch 
            className="mt-6 h-16 bg-white/5 border border-dashed border-awan-gold/40 rounded-awan-xl flex items-center justify-center"
            onPress={() => setIsPicking(true)}
          >
            <div className="flex flex-row items-center gap-3">
              <Plus size={20} className="text-awan-gold" />
              <span className="awan-label text-awan-gold">ACCÉDER À LA BIBLIOTHÈQUE OFF</span>
            </div>
          </Touch>
        </div>
      </ScrollView>

      <Modal visible={isPicking} animationType="slide" transparent>
        <div className="flex-1 bg-awan-bg">
          <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
            <div className="flex flex-row items-center justify-between mb-8">
              <Heading level={2} className="mb-0" subtitle="Unités Disponibles">LIBRAIRIE</Heading>
              <Touch onPress={() => { setIsPicking(false); setSearch(''); setFilterMuscle(null); }} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                <X size={20} className="text-awan-tx-mute" />
              </Touch>
            </div>
            
            <Card className="p-0 border-white/5 bg-white/5 overflow-hidden mb-6">
              <div className="flex flex-row items-center px-4 py-1">
                <Search size={16} className="text-awan-tx-mute mr-3" />
                <TextInput 
                  className="flex-1 h-12 text-sm font-bold text-awan-tx outline-none bg-transparent"
                  placeholder="VECTEUR SPÉCIFIQUE..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={search}
                  onChangeText={setSearch}
                />
              </div>
            </Card>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
              <Touch 
                onPress={() => setFilterMuscle(null)}
                className={`px-4 py-2 rounded-full border transition-all ${!filterMuscle ? 'bg-awan-gold/20 border-awan-gold text-awan-gold' : 'bg-white/5 border-white/5 text-awan-tx-mute'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Tous</span>
              </Touch>
              {Object.entries(MUSCLES).map(([id, m]: any) => (
                <Touch 
                  key={id} 
                  onPress={() => setFilterMuscle(id)}
                  className={`px-4 py-2 rounded-full border transition-all ${filterMuscle === id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent'}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-center" style={{ color: filterMuscle === id ? '#D4AF37' : '#6C665E' }}>{m.l}</span>
                </Touch>
              ))}
            </ScrollView>
          </div>

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id.toString()}
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
            renderItem={({ item: ex }) => (
              <Card className="flex-row items-center gap-4 py-4 px-5 bg-white/5 mb-3" variant="flat" onPress={() => addEx(ex)}>
                <div className="w-12 h-12 rounded-xl bg-black/40 items-center justify-center border border-white/10">
                  {ex.img ? <Image source={{ uri: ex.img }} className="w-full h-full" resizeMode="cover" /> : <span className="text-xl">{ex.icon}</span>}
                </div>
                <div className="flex-1">
                  <span className="text-base font-bold text-awan-tx uppercase tracking-tight">{ex.n}</span>
                  <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-widest mt-1">{(MUSCLES as any)[ex.m]?.l} • {ex.eq}</span>
                </div>
                <div className="flex flex-row gap-2">
                  <Touch onPress={(e) => { e.stopPropagation(); setViewingEx(ex); }} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Info size={16} className="text-awan-tx-mute" />
                  </Touch>
                  <div className="w-9 h-9 rounded-xl bg-awan-gold/20 flex items-center justify-center border border-awan-gold/30">
                    <Plus size={18} className="text-awan-gold" />
                  </div>
                </div>
              </Card>
            )}
          />
        </div>
      </Modal>

      <ExerciseDetail exercise={viewingEx} visible={!!viewingEx} onClose={() => setViewingEx(null)} />
    </div>
  );
}

function ActiveWorkout({ workout, timer, formatTime, onUpdate, onFinish, onAbort }: any) {
  const addSet = useCallback((exIdx: number) => {
    onUpdate((prev: any) => {
      const w = { ...prev };
      w.exercises[exIdx].sets = [...w.exercises[exIdx].sets, { weight: '', reps: '' }];
      return w;
    });
  }, [onUpdate]);

  const updateSet = useCallback((exIdx: number, setIdx: number, field: string, val: string) => {
    onUpdate((prev: any) => {
      const w = { ...prev };
      const newSets = [...w.exercises[exIdx].sets];
      newSets[setIdx] = { ...newSets[setIdx], [field]: val };
      w.exercises[exIdx].sets = newSets;
      return w;
    });
  }, [onUpdate]);

  return (
    <div className="flex-1 bg-awan-bg">
      <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/10">
        <div className="flex flex-row justify-between items-center mb-6">
          <div className="flex-1">
            <span className="awan-label text-awan-gold mb-1">PROTOCOLE ACTIF</span>
            <Heading level={2} className="mb-0 uppercase">{workout.name}</Heading>
          </div>
          <Touch onPress={onFinish} className="bg-awan-gold px-6 py-3 rounded-xl shadow-xl shadow-awan-gold/20">
            <span className="awan-label text-black font-black">TERMINER</span>
          </Touch>
        </div>
        
        <Card className="flex-row items-center justify-center py-4 bg-black/40 border-awan-gold/20">
          <Clock size={20} className="text-awan-gold mr-3" />
          <span className="text-3xl font-mono font-bold text-awan-gold tracking-widest tabular-nums">{formatTime(timer)}</span>
        </Card>
      </div>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, padding: 24 }} style={{ flex: 1 }}>
        {workout.exercises.map((ex: any, exIdx: number) => (
          <Card key={exIdx} className="mb-6 p-6 border-white/10 bg-white/5">
            <div className="flex flex-row items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-black/40 items-center justify-center border border-white/10">
                <span className="text-xl">{ex.icon}</span>
              </div>
              <span className="text-lg font-bold text-awan-tx uppercase tracking-tight">{ex.n}</span>
            </div>

            <div className="flex flex-row mb-4 px-2">
              <span className="awan-label w-12 text-center">SÉRIE</span>
              <span className="awan-label flex-1 text-center">CHARGE (KG)</span>
              <span className="awan-label flex-1 text-center">REPS</span>
            </div>

            {ex.sets.map((set: any, setIdx: number) => (
              <div key={setIdx} className="flex flex-row items-center gap-3 mb-3">
                <div className="w-12 items-center">
                   <span className="text-sm font-mono font-black text-awan-tx-mute">{setIdx + 1}</span>
                </div>
                <TextInput 
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl h-12 text-center text-awan-gold font-mono font-bold text-lg"
                  keyboardType="numeric" 
                  value={set.weight} 
                  onChangeText={v => updateSet(exIdx, setIdx, 'weight', v)} 
                  placeholder="0"
                  placeholderTextColor="#252525"
                />
                <TextInput 
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl h-12 text-center text-awan-tx font-mono font-bold text-lg"
                  keyboardType="numeric" 
                  value={set.reps} 
                  onChangeText={v => updateSet(exIdx, setIdx, 'reps', v)} 
                  placeholder="0"
                  placeholderTextColor="#252525"
                />
              </div>
            ))}

            <Touch 
              className="mt-4 h-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center"
              onPress={() => addSet(exIdx)}
            >
              <div className="flex flex-row items-center gap-2">
                <Plus size={14} className="text-awan-tx-mute" strokeWidth={3} />
                <span className="awan-label text-awan-tx-mute">AJOUTER SÉRIE</span>
              </div>
            </Touch>
          </Card>
        ))}

        <Touch 
          className="mt-10 py-6 items-center" 
          onPress={() => Alert.alert('ABANDON', 'Terminer prématurément le protocole ?', [{text: 'NON'}, {text: 'OUI', onPress: onAbort}])}
        >
          <span className="text-[10px] font-black text-awan-status-error uppercase tracking-[0.3em] opacity-50">ANNULER LA SÉANCE</span>
        </Touch>
      </ScrollView>
    </div>
  );
}

function WorkoutHistory({ logs, onBack }: any) {
  return (
    <div className="flex-1 bg-awan-bg">
      <div className="px-6 pt-12 pb-6 border-b border-white/5 bg-white/5">
        <div className="flex flex-row items-center gap-4">
          <Touch onPress={onBack} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
            <ChevronLeft size={20} className="text-awan-tx-mute" />
          </Touch>
          <Heading level={2} className="mb-0 flex-1" subtitle="Registres Sportifs">ARCHIVES</Heading>
        </div>
      </div>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, padding: 24 }} style={{ flex: 1 }}>
        {logs.length === 0 && (
          <div className="py-20 items-center opacity-10">
            <History size={64} className="text-awan-tx-mute mb-4" />
            <Heading level={4} className="mb-0 text-center" subtitle="">Nulle performance archivée.</Heading>
          </div>
        )}
        <StaggerList>
          {logs.slice().reverse().map((log: any) => (
            <StaggerItem key={log.id} className="mb-4">
              <Card className="p-6 bg-white/5 border-white/5">
                <div className="flex flex-row justify-between items-center mb-1">
                  <span className="text-lg font-bold text-awan-tx uppercase tracking-tight">{log.name}</span>
                  <span className="text-[10px] font-mono font-bold text-awan-gold">{log.date}</span>
                </div>
                <div className="flex flex-row items-center gap-4">
                  <div className="flex flex-row items-center gap-2">
                    <Target size={12} className="text-awan-tx-mute" />
                    <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-widest">{log.exercises.length} EXERCICES</span>
                  </div>
                  <div className="w-[1px] h-3 bg-white/10" />
                  <div className="flex flex-row items-center gap-2">
                    <Clock size={12} className="text-awan-tx-mute" />
                    <span className="text-[10px] font-bold text-awan-tx-mute uppercase tracking-widest">{Math.floor(log.duration / 60)} MIN</span>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      </ScrollView>
    </div>
  );
}

