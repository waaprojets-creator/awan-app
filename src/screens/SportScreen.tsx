import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Modal, Platform, Alert } from 'react-native';
import { Play, Plus, Dumbbell, History, Download } from 'lucide-react-native';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { sessionsThisWeek } from '../hooks/useAwanScore';
import { PeriodizationService } from '../services/periodizationService';
import {
  type RoutineLatest,
  type WorkoutSessionLatest,
  type CycleLetter,
} from '../data/schemas/sport/routine';
import { buildIAExport } from '../services/iaExportService';
import { WorkoutListView } from '../modules/sport/components/WorkoutListView';
import { RoutineGeneratorView } from '../modules/sport/components/RoutineGeneratorView';
import { cacheForRoutine } from '../services/mediaCacheService';
import { safeStorage } from '../utils/safeStorage';
import { ds } from '../utils/storage';
import { L } from '../constants/labels';
import { useTheme } from '../hooks/useTheme';
import { FontSans, FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Clr } from '../theme/tokens';
import type { RoutineDraft, ActiveSession, SessionSummary } from './sport/types';
import { ACTIVE_SESSION_KEY, ROUTINE_DRAFT_KEY, ss } from './sport/shared';
import { WorkoutHistory } from './sport/WorkoutHistory';
import { RoutineCard } from './sport/RoutineCard';
import { CycleScoreSection, VolumeHeatmapSection, VolumeWeekSection } from './sport/AnalysisSections';
import { FinishWorkout } from './sport/FinishWorkout';
import { PreWorkout } from './sport/PreWorkout';
import { ActiveWorkout } from './sport/ActiveWorkout';
import { RoutineEditor } from './sport/RoutineEditor';
import { WorkoutSessionService, buildSessionFromActive, shouldAdvanceWeek } from '../services/workoutSessionService';

type ViewMode = 'list' | 'create' | 'edit' | 'active' | 'history' | 'finish' | 'recovery' | 'workouts' | 'generate';


export default function SportScreen() {
 const theme = useTheme();
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
   const { session, prevSessionVolume } = await WorkoutSessionService.prepareWorkout(routine, opts);
   prevSessionVolumeRef.current = prevSessionVolume;
   setActiveSession(session);
   setView('active');
 }, []);

 const handleSessionUpdate = useCallback((updater: (s: ActiveSession) => ActiveSession) => {
 setActiveSession(prev => (prev ? updater(prev) : prev));
 }, []);

 const handleFinishWorkout = useCallback((summary: SessionSummary) => {
   if (!activeSession) return;
   const endTime = Date.now();
   const session = buildSessionFromActive({ active: activeSession, summary, endTime, date: ds(new Date()) });
   workoutStore.saveSession(session);
   const p = PeriodizationService.getOrInit();
   if (shouldAdvanceWeek(p, new Date())) PeriodizationService.advanceWeek();
   safeStorage.remove(ACTIVE_SESSION_KEY);
   setActiveSession(null);
   setView('list');
 }, [activeSession, workoutStore]);

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
   <View style={{ flex: 1, backgroundColor: theme.bg }}>
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
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
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
 <Text style={[ss.mdBlack, { color: theme.mute, marginBottom: 24 }]}>{draftResumeModal.exercises.length} EXERCICES · Sauvegardé à {draftResumeModal.savedAt ? new Date(draftResumeModal.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</Text>
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

