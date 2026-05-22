import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Modal, TextInput as RNTextInput, Alert,
} from 'react-native';
import { usePlanner } from '../hooks/usePlanner';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { ds as dsDate } from '../utils/storage';

const TextInput = RNTextInput as React.ComponentType<any>;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion, useDragControls } from 'motion/react';
import { CATS, MONTHS, MONTHS_S, DAYS_S } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { L } from '../constants/labels';
import { ds, parseDate, uid } from '../utils/storage';
import { eventsForDate, daysWithEvents } from '../utils/recurrence';
import { useAppState } from '../context/AppStateContext';
import { requestNotificationPermission, NOTIF_INTERVALS } from '../utils/notifications';

import { useLongPressDrag } from '../hooks/useLongPressDrag';
import { Clock, Plus, Download, ChevronLeft, ChevronRight, Calendar, Columns, Grid3X3, Zap, Target, Layers, Trash } from 'lucide-react';
import { PageWrapper, AnimatePresence } from '../components/Animated';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';

const DraggableEvent = React.memo(({ ev, hourHeight, handleEventDragEnd, setEditEv, setShowEvModal, categories, containerRef }: any) => {
  const theme = useTheme();
  const controls = useDragControls();
  const { isPressed, handlePointerDown, handlePointerMove, handlePointerUp, onDragEnd } = useLongPressDrag(controls, containerRef);

  const wrappedOnDragEnd = (e: any, info: any) => {
    onDragEnd();
    handleEventDragEnd(ev, info, hourHeight);
  };

  const [hh, mm] = (ev.time || '00:00').split(':').map(Number);
  const top = (hh + mm / 60) * hourHeight;
  const height = hourHeight;

  return (
    <motion.div
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragSnapToOrigin={true}
      onDragEnd={wrappedOnDragEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: 'absolute', top, left: 2, right: 2, zIndex: 10, WebkitUserSelect: 'none', userSelect: 'none', opacity: isPressed ? 0.9 : 1 }}
    >
      <Touch 
        style={StyleSheet.flatten([s.evAbsolute, { height, borderLeftColor: ev.color || categories[ev.category]?.c || theme.title, position: 'relative', top: 0, left: 0, right: 0 }])}
        onPress={() => !ev.isRt && (setEditEv(ev), setShowEvModal(true))}
      >
        <div className="flex flex-row items-center gap-1">
           {ev.isRt && <Zap size={6} className="text-white/40" />}
           <Text style={[s.evAbsTitle, { color: theme.title }]} numberOfLines={hourHeight === 20 ? 1 : 2}>{hourHeight === 20 ? ev.title : `${ev.time} - ${ev.title}`}</Text>
        </div>
      </Touch>
    </motion.div>
  );
});

const STABS = [
  { id: 0, label: 'HEBDO', Icon: Columns },
  { id: 1, label: 'MENSUEL', Icon: Grid3X3 },
  { id: 2, label: 'ANNUEL', Icon: Calendar },
  { id: 4, label: 'FLUX IA', Icon: Target },
  { id: 5, label: 'TOUT', Icon: Layers },
];

function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { db, updateDb, navigate } = useAppState() as any;
  const theme = useTheme();
  const scrollRef = useRef(null);
  
  const [subTab, setSubTab] = useState(1);
  const [prevTab, setPrevTab] = useState(1);
  const [calDate, setCalDate] = useState(new Date());
  const [wkDate, setWkDate] = useState(new Date());
  const [annDate, setAnnDate] = useState(new Date());
  const [selDate, setSelDate] = useState(new Date());
  const [showEvModal, setShowEvModal] = useState(false);
  const [showRtModal, setShowRtModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editEv, setEditEv] = useState<any>(null);
  const [dragConfirm, setDragConfirm] = useState<any>(null);
  const [creatingEv, setCreatingEv] = useState<any>(null);
  const gridPressTimeout = useRef<any>(null);
  const gridStartPos = useRef<any>(null);

  const planner = usePlanner();
  const workoutStore = useWorkoutStore();
  const measureStore = useMeasurementStore();
  const [aiTitle, setAiTitle] = useState('');
  const [aiDuration, setAiDuration] = useState('30');
  const [aiEnergy, setAiEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [aiPriority, setAiPriority] = useState(3);

  const categories = useMemo(() => {
    const base: any = { ...CATS };
    if (db?.categories) {
      db.categories.forEach((c: any) => { base[c.key] = { l: c.label, c: c.color }; });
    }
    return base;
  }, [db?.categories]);

  const handleGridPointerDown = (e: any) => {
    const nativeEvent = e.nativeEvent;
    const offsetY = nativeEvent.offsetY !== undefined ? nativeEvent.offsetY : nativeEvent.locationY;
    gridStartPos.current = { x: nativeEvent.clientX, y: nativeEvent.clientY };
    
    gridPressTimeout.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
      let totalMins = (offsetY / 48) * 60;
      totalMins = Math.floor(totalMins / 15) * 15;
      let hh = Math.floor(totalMins / 60);
      let mm = Math.floor(totalMins % 60);
      if (hh > 23) { hh = 23; mm = 45; }
      
      setCreatingEv({ startY: offsetY, startMins: hh * 60 + mm, duration: 15, title: 'Occupé', category: 'perso' });
    }, 1000);
  };

  const handleGridPointerMove = (e: any) => {
    const nativeEvent = e.nativeEvent;
    if (!creatingEv) {
      if (gridStartPos.current) {
        const dx = Math.abs(nativeEvent.clientX - gridStartPos.current.x);
        const dy = Math.abs(nativeEvent.clientY - gridStartPos.current.y);
        if (dx > 10 || dy > 10) clearTimeout(gridPressTimeout.current);
      }
      return;
    }
    const offsetY = nativeEvent.offsetY !== undefined ? nativeEvent.offsetY : nativeEvent.locationY;
    const deltaY = offsetY - creatingEv.startY;
    if (deltaY > 0) {
      let addedMins = (deltaY / 48) * 60;
      let blocks = Math.round(addedMins / 15);
      setCreatingEv((prev: any) => ({ ...prev, duration: Math.max(15, 15 + blocks * 15) }));
    }
  };

  const handleGridPointerUp = () => {
    clearTimeout(gridPressTimeout.current);
    if (creatingEv) {
      const newEv = {
        id: `ev_${Date.now()}`,
        date: ds(selDate),
        time: `${String(Math.floor(creatingEv.startMins / 60)).padStart(2,'0')}:${String(creatingEv.startMins % 60).padStart(2,'0')}`,
        duration: creatingEv.duration.toString(),
        title: creatingEv.title,
        category: creatingEv.category,
      };
      updateDb({ ...db, events: [...(db.events || []), newEv] });
      setCreatingEv(null);
    }
  };

  const handleEventDragEnd = (ev: any, info: any, hourHeight: number) => {
    let [hh, mm] = (ev.time || '00:00').split(':').map(Number);
    const top = (hh + mm / 60) * hourHeight;
    const newTop = Math.max(0, top + info.offset.y);
    let totalMins = (newTop / hourHeight) * 60;
    totalMins = Math.round(totalMins / 15) * 15;
    let newH = Math.floor(totalMins / 60);
    let newM = Math.floor(totalMins % 60);
    if (newH > 23) { newH = 23; newM = 45; }
    const newTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    if (newTime === ev.time) return;
    if (ev.isRt) setDragConfirm({ ev, newTime });
    else updateEventTime(ev, newTime);
  };

  const updateEventTime = (ev: any, newTime: string) => {
    const idx = (db.events || []).findIndex((e: any) => e.id === ev.id);
    if (idx >= 0) {
      const freshEvs = [...db.events];
      freshEvs[idx] = { ...freshEvs[idx], time: newTime };
      updateDb({ ...db, events: freshEvs });
    }
  };

  const confirmRoutineUpdate = (applyToAll: boolean) => {
    if (!dragConfirm) return;
    const { ev, newTime } = dragConfirm;
    const freshDb = { ...db, routines: [...(db.routines || [])], events: [...(db.events || [])] };
    if (applyToAll) {
      const idx = freshDb.routines.findIndex((r: any) => r.id === ev.originalRtId);
      if (idx >= 0) freshDb.routines[idx] = { ...freshDb.routines[idx], time: newTime };
    } else {
      const idx = freshDb.routines.findIndex((r: any) => r.id === ev.originalRtId);
      if (idx >= 0) freshDb.routines[idx] = { ...freshDb.routines[idx], excludedDates: [...(freshDb.routines[idx].excludedDates || []), ev.date] };
      freshDb.events.push({ ...ev, id: `ev_${Date.now()}`, time: newTime, category: 'routine', isRt: false });
    }
    updateDb(freshDb);
    setDragConfirm(null);
  };

  const monthlyCells = useMemo(() => {
    const yr = calDate.getFullYear(), mo = calDate.getMonth();
    const first = new Date(yr, mo, 1).getDay();
    const start = first === 0 ? 6 : first - 1;
    const dim = new Date(yr, mo + 1, 0).getDate();
    const dipm = new Date(yr, mo, 0).getDate();
    const cells = [];
    const todayStr = ds(new Date());
    for (let i = start - 1; i >= 0; i--) cells.push({ day: dipm - i, cur: false, dstr: null, evs: [] });
    for (let day = 1; day <= dim; day++) {
      const dstr = `${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      cells.push({ day, cur: true, dstr, isToday: dstr === todayStr, evs: eventsForDate(db, dstr) });
    }
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - (start + dim) + 1, cur: false, dstr: null, evs: [] });
    return cells;
  }, [calDate, db]);

  function selectDate(dateStr: string) {
    if (ds(selDate) === dateStr) { setPrevTab(subTab); setSubTab(3); }
    else setSelDate(parseDate(dateStr));
  }

  function renderMonthly() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <div className="flex flex-row items-center justify-between px-6 mb-8">
          <Touch onPress={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()-1, 1))} className="w-8 h-8 bg-white/5 flex items-center justify-center" style={{ border: '1px solid var(--color-awan-border)' }}>
            <ChevronLeft size={20} className="text-awan-tx-mute" />
          </Touch>
          <div className="items-center">
            <span className="text-sm font-black text-awan-tx uppercase tracking-[0.3em] font-mono">{MONTHS[calDate.getMonth()]}</span>
            <span className="text-awan-sm font-black text-awan-gold uppercase tracking-widest text-center">{calDate.getFullYear()}</span>
          </div>
          <Touch onPress={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()+1, 1))} className="w-8 h-8 bg-white/5 flex items-center justify-center" style={{ border: '1px solid var(--color-awan-border)' }}>
            <ChevronRight size={20} className="text-awan-tx-mute" />
          </Touch>
        </div>
        <div className="flex flex-row px-4 mb-4">
          {DAYS_S.map((d, i) => (
            <div key={i} className="flex-1 items-center">
              <span className={`text-awan-xs font-black uppercase font-mono tracking-widest ${i>=5 ? 'text-awan-gold opacity-50' : 'text-awan-tx-mute'}`}>{d}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-row flex-wrap px-4 mb-6">
          {monthlyCells.map((cell, i) => {
            const isSel = cell.dstr && cell.dstr === ds(selDate);
            const isToday = cell.isToday;
            // Couleur du chiffre : sélectionné → noir gras sur fond doré, aujourd'hui → doré fin, autre → texte normal
            const numClass = !cell.cur
              ? 'opacity-10 text-awan-tx font-normal'
              : isSel
                ? 'text-black font-black'
                : isToday
                  ? 'text-awan-gold font-normal'
                  : 'text-awan-tx font-normal';
            return (
              <Touch key={i} className={`w-[14.28%] h-16 items-center justify-center  relative ${isSel ? 'bg-awan-gold' : ''}`} onPress={() => cell.dstr && selectDate(cell.dstr)}>
                <span className={`text-sm ${numClass}`}>{cell.day}</span>
                <div className="flex flex-row gap-0.5 mt-1">
                  {cell.evs.slice(0, 3).map((ev: any, idx: number) => <div key={idx} className={`w-1 h-1 rounded-full ${isSel ? 'bg-black/60' : 'bg-awan-gold/60'}`} />)}
                </div>
              </Touch>
            );
          })}
        </div>
        {/* Événements du jour sélectionné */}
        <div className="px-4 pb-6">
          <span className="uppercase block mb-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 700, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
            {new Date(selDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </span>
          <EvListSection events={eventsForDate(db, ds(selDate))} categories={categories} onAdd={() => setShowEvModal(true)} onAddRt={() => setShowRtModal(true)} onEdit={(ev: any) => { setEditEv(ev); setShowEvModal(true); }} />
        </div>
      </ScrollView>
    );
  }

  function renderWeekly() {
    const d = new Date(wkDate), dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const mon = new Date(d); mon.setDate(d.getDate() - dow);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const lbl = mon.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' — '+sun.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
    const cols = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(mon); day.setDate(mon.getDate() + i);
      return { day, dstr: ds(day), evs: eventsForDate(db, ds(day)) };
    });
    const hours = Array.from({ length: 24 }).map((_, h) => `${String(h).padStart(2, '0')}:00`);
    return (
      <View style={{ flex: 1 }}>
        <div className="flex flex-row items-center justify-between px-6 mb-8">
          <Touch onPress={() => setWkDate(new Date(wkDate.getTime() - 7*86400000))} className="w-8 h-8 bg-white/5 flex items-center justify-center" style={{ border: '1px solid var(--color-awan-border)' }}><ChevronLeft size={20} className="text-awan-tx-mute" /></Touch>
          <span className="text-awan-md font-black text-awan-tx uppercase tracking-[0.4em] font-mono">{lbl.toUpperCase()}</span>
          <Touch onPress={() => setWkDate(new Date(wkDate.getTime() + 7*86400000))} className="w-8 h-8 bg-white/5 flex items-center justify-center" style={{ border: '1px solid var(--color-awan-border)' }}><ChevronRight size={20} className="text-awan-tx-mute" /></Touch>
        </div>
        <div className="flex flex-row pl-12 pr-4 mb-6">
          {cols.map((c, i) => (
            <Touch key={i} className={`flex-1 items-center justify-center h-16  border ${c.dstr === ds(new Date()) ? 'bg-awan-gold/10 border-awan-gold/30' : 'border-transparent'}`} onPress={() => selectDate(c.dstr)}>
              <span className="text-awan-xs font-black text-awan-tx-mute mb-2 uppercase tracking-widest font-mono">{DAYS_S[i]}</span>
              <span className={`text-xl font-black ${c.dstr === ds(new Date()) ? 'text-awan-gold' : 'text-awan-tx'}`}>{c.day.getDate()}</span>
            </Touch>
          ))}
        </div>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 100 }} style={{ flex: 1 }}>
          <div className="flex flex-row">
            <div className="w-12 border-r border-white/5">
              {hours.map((h, i) => <div key={i} className="h-20 items-center"><span className="text-awan-sm font-mono text-awan-tx-mute font-black mt-2 opacity-40">{h}</span></div>)}
            </div>
            <div className="flex-1 flex flex-row relative">
              {cols.map((c, i) => (
                <div key={i} className="flex-1 border-r border-white/5 relative">
                  {hours.map((_, h) => <div key={h} className="h-20 border-b border-white/5 opacity-5" />)}
                  {c.evs.map((ev: any) => ev.time && <DraggableEvent key={ev.id} ev={ev} hourHeight={20} handleEventDragEnd={handleEventDragEnd} setEditEv={setEditEv} setShowEvModal={setShowEvModal} categories={categories} containerRef={scrollRef} />)}
                </div>
              ))}
            </div>
          </div>
        </ScrollView>
      </View>
    );
  }

  function renderAnnual() {
    const yr = annDate.getFullYear();
    return (
      <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 24 }}>
        <div className="flex flex-row items-center justify-between mb-8 pb-4 border-b border-white/5">
          <Touch onPress={() => setAnnDate(new Date(yr - 1, 0, 1))} className="w-8 h-8 bg-white/5 flex items-center justify-center" style={{ border: '1px solid var(--color-awan-border)' }}><ChevronLeft size={18} className="text-awan-tx-mute" /></Touch>
          <span className="text-3xl font-black text-awan-tx tracking-tighter tabular-nums">{yr}</span>
          <Touch onPress={() => setAnnDate(new Date(yr + 1, 0, 1))} className="w-8 h-8 bg-white/5 flex items-center justify-center" style={{ border: '1px solid var(--color-awan-border)' }}><ChevronRight size={18} className="text-awan-tx-mute" /></Touch>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-24">
          {Array.from({ length: 12 }).map((_, mo) => {
            const dim = new Date(yr, mo + 1, 0).getDate();
            const daysSet = daysWithEvents(db, yr, mo);
            const first = new Date(yr, mo, 1).getDay();
            const start = first === 0 ? 6 : first - 1;
            const cells = [];
            for (let i = 0; i < start; i++) cells.push(null);
            for (let day = 1; day <= dim; day++) cells.push({ day, has: daysSet.has(day) });
            return (
              <Card key={mo} className="p-4 bg-white/5 border-white/5" variant="flat">
                <span className="text-awan-md font-black text-awan-gold uppercase mb-3 block text-center tracking-[0.3em] font-mono">{MONTHS[mo]}</span>
                <div className="flex flex-row flex-wrap">
                  {cells.map((c, i) => <div key={i} className="w-[14.28%] h-4 items-center justify-center">{c && <div className={`w-1.5 h-1.5 rounded-full ${c.has ? 'bg-awan-gold' : 'bg-white/5'}`} />}</div>)}
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollView>
    );
  }

  function renderDaily() {
    const dstr = ds(selDate);
    const day = new Date(selDate);
    const lbl = day.toLocaleDateString('fr-FR',{weekday:'long', day:'numeric',month:'short'});
    const hours = Array.from({ length: 24 }).map((_, h) => `${String(h).padStart(2, '0')}:00`);
    return (
      <View style={{ flex: 1 }}>
        <div className="flex flex-row items-center px-6 mb-6">
          <Touch onPress={() => setSubTab(prevTab)} className="w-8 h-8 bg-white/5 flex items-center justify-center" style={{ border: '1px solid var(--color-awan-border)' }}><ChevronLeft size={20} className="text-awan-tx-mute" /></Touch>
          <div className="flex-1 items-center"><span className="text-xs font-black text-awan-tx uppercase tracking-[0.4em] font-mono">{lbl.toUpperCase()}</span></div>
          <Touch onPress={() => setShowEvModal(true)} className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: 'var(--color-awan-gold)' }}><Plus size={18} color="var(--color-awan-bg)" strokeWidth={3} /></Touch>
        </div>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 100 }} scrollEnabled={!creatingEv} style={{ flex: 1 }}>
          <div className="flex flex-row">
            <div className="w-12 border-r border-white/5">
              {hours.map((h, i) => <div key={i} className="h-20 items-center pt-2"><span className="text-awan-md font-mono font-black text-awan-tx-mute opacity-40">{h}</span></div>)}
            </div>
            <div className="flex-1 relative">
              <div onPointerDown={handleGridPointerDown} onPointerMove={handleGridPointerMove} onPointerUp={handleGridPointerUp} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} />
              {hours.map((_, h) => <div key={h} className="h-20 border-b border-white/5 opacity-5" />)}
              {creatingEv && <div className="absolute left-1 right-1 bg-awan-gold/20 border-l-4 border-awan-gold  p-3 z-10" style={{ top: (creatingEv.startMins / 60) * 80, height: (creatingEv.duration / 60) * 80 }}><span className="text-awan-md font-black text-awan-tx uppercase tracking-widest">{creatingEv.title}</span></div>}
              {eventsForDate(db, dstr).map((ev: any) => ev.time && <DraggableEvent key={ev.id} ev={ev} hourHeight={80} handleEventDragEnd={handleEventDragEnd} setEditEv={setEditEv} setShowEvModal={setShowEvModal} categories={categories} containerRef={scrollRef} />)}
            </div>
          </div>
        </ScrollView>
      </View>
    );
  }

  function renderAiSchedule() {
    const today = ds(new Date());
    const taskMap = new Map(planner.tasks.map(t => [t.id, t]));

    const addAiTask = async () => {
      const dur = parseInt(aiDuration, 10);
      if (!aiTitle.trim() || isNaN(dur) || dur < 5) return;
      await planner.saveTask({
        v: 1,
        id: uid(),
        title: aiTitle.trim(),
        durationMin: dur,
        priority: aiPriority,
        energyLevel: aiEnergy,
        domain: 'general',
        tags: [],
        dependsOn: [],
        enabled: true,
      });
      setAiTitle('');
      setAiDuration('30');
    };

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <div className="px-6 space-y-8 pt-2">
          {/* Add task form */}
          <div>
            <Heading level={4} mono subtitle="Injection de Tâche">NOUVELLE MISSION</Heading>
            <div className="space-y-3">
              <TextInput
                className="bg-awan-bg border border-white/5  px-5 py-4 text-sm font-bold text-awan-tx"
                placeholder="TITRE DE LA TÂCHE..."
                placeholderTextColor="var(--color-awan-tx-mute)"
                value={aiTitle}
                onChangeText={setAiTitle}
              />
              <div className="flex flex-row gap-3">
                <div className="flex-1">
                  <span className="awan-label mb-2 block">DURÉE (MIN)</span>
                  <TextInput
                    className="bg-awan-bg border border-white/5  px-5 py-4 text-sm font-bold text-awan-tx font-mono"
                    placeholder="30"
                    placeholderTextColor="var(--color-awan-tx-mute)"
                    keyboardType="numeric"
                    value={aiDuration}
                    onChangeText={setAiDuration}
                  />
                </div>
                <div className="flex-1">
                  <span className="awan-label mb-2 block">PRIORITÉ</span>
                  <div className="flex flex-row gap-1">
                    {[1, 2, 3, 4, 5].map(p => (
                      <Touch
                        key={p}
                        onPress={() => setAiPriority(p)}
                        className={`flex-1 h-14  items-center justify-center border ${aiPriority === p ? 'bg-awan-gold/20 border-awan-gold' : 'bg-white/5 border-white/5'}`}
                      >
                        <span className={`text-xs font-black font-mono ${aiPriority === p ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>{p}</span>
                      </Touch>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <span className="awan-label mb-2 block">NIVEAU ÉNERGIE</span>
                <div className="flex flex-row gap-2">
                  {(['low', 'medium', 'high'] as const).map(e => (
                    <Touch
                      key={e}
                      onPress={() => setAiEnergy(e)}
                      className={`flex-1 h-12  items-center justify-center border ${aiEnergy === e ? 'bg-awan-gold/20 border-awan-gold' : 'bg-white/5 border-white/5'}`}
                    >
                      <span className={`text-awan-sm font-black uppercase tracking-widest ${aiEnergy === e ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
                        {e === 'low' ? 'BAS' : e === 'medium' ? 'MOYEN' : 'ÉLEVÉ'}
                      </span>
                    </Touch>
                  ))}
                </div>
              </div>
              <Touch
                onPress={addAiTask}
                className="h-14 bg-white/5 border border-white/10  flex items-center justify-center"
              >
                <div className="flex flex-row items-center gap-3">
                  <Plus size={18} className="text-awan-gold" />
                  <span className="awan-label text-awan-gold">INJECTER TÂCHE</span>
                </div>
              </Touch>
            </div>
          </div>

          {/* Task list */}
          {planner.tasks.length > 0 && (
            <div>
              <Heading level={4} mono subtitle={`${planner.tasks.length} missions`}>FILE D'ATTENTE</Heading>
              <div className="space-y-2">
                {planner.tasks.map(t => {
                  const domainColor = (categories[t.domain] ?? CATS[t.domain as keyof typeof CATS])?.c ?? 'var(--color-awan-tx-mute)';
                  // priorité → poids typographique (1=900 dominant, 5=400 discret)
                  const titleWeight = t.priority <= 1 ? 900 : t.priority <= 2 ? 700 : t.priority <= 3 ? 600 : 400;
                  const titleSize = t.priority <= 1 ? '13px' : t.priority <= 3 ? '12px' : '11px';
                  return (
                    <div key={t.id} className="flex-row items-center flex border" style={{ borderColor: 'var(--color-awan-border)', backgroundColor: 'var(--color-awan-surface)' }}>
                      <div className="w-[3px] self-stretch" style={{ backgroundColor: domainColor }} />
                      <div className="flex-1 px-4 py-3">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', fontWeight: 700, color: domainColor, letterSpacing: '0.3em', display: 'block', marginBottom: 2 }}>{(categories[t.domain]?.l ?? t.domain ?? '').toUpperCase()} · {t.energyLevel.toUpperCase()}</span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: titleSize, fontWeight: titleWeight, color: 'var(--color-awan-tx)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block' }}>{t.title}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.1em', display: 'block', marginTop: 2 }}>{t.durationMin} MIN · P{t.priority}</span>
                      </div>
                      <Touch onPress={() => planner.deleteTask(t.id)} className="w-9 h-9 flex items-center justify-center" style={{ border: '1px solid var(--color-awan-border)' }}>
                        <Trash size={14} color="var(--color-awan-tx-mute)" />
                      </Touch>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optimize button */}
          <Touch
            onPress={() => planner.optimize(today)}
            className={`h-16  flex items-center justify-center border ${planner.optimizing ? 'bg-white/5 border-white/10' : 'bg-awan-gold/10 border-awan-gold/30'}`}
          >
            <div className="flex flex-row items-center gap-3">
              <Zap size={20} className={planner.optimizing ? 'text-awan-tx-mute' : 'text-awan-gold'} />
              <span className={`awan-label ${planner.optimizing ? 'text-awan-tx-mute' : 'text-awan-gold'}`}>
                {planner.optimizing ? 'CALCUL EN COURS...' : 'OPTIMISER AUJOURD\'HUI'}
              </span>
            </div>
          </Touch>

          {/* Schedule result */}
          {planner.schedule && (
            <div>
              <Heading level={4} mono subtitle={`${planner.schedule.slots.length} créneaux`}>PLANNING OPTIMISÉ</Heading>
              {planner.schedule.slots.length === 0 ? (
                <Card className="py-10 items-center bg-white/5 border-white/5" variant="flat">
                  <span className="awan-label">AUCUN CRÉNEAU GÉNÉRÉ</span>
                </Card>
              ) : (
                <div className="space-y-2">
                  {planner.schedule.slots.map((slot, i) => {
                    const task = taskMap.get(slot.taskId);
                    return (
                      <Card key={i} className="flex-row items-center gap-4 py-4 px-5 bg-awan-surface border-awan-gold/10" variant="flat">
                        <div className="w-16 items-center">
                          <span className="text-awan-md font-black text-awan-gold font-mono">{minToTime(slot.startMin)}</span>
                          <span className="text-awan-xs font-bold text-awan-tx-mute font-mono">{minToTime(slot.endMin)}</span>
                        </div>
                        <div className="w-px h-8 bg-awan-gold/20" />
                        <div className="flex-1">
                          <span className="text-sm font-bold text-awan-tx uppercase tracking-tight">{task?.title ?? slot.taskId}</span>
                          <span className="text-awan-sm font-bold text-awan-tx-mute uppercase tracking-widest">
                            {slot.endMin - slot.startMin} MIN
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                  {planner.schedule.unscheduled.length > 0 && (
                    <Card className="py-4 px-5 bg-awan-status-error/5 border-awan-status-error/20" variant="flat">
                      <span className="text-awan-sm font-black text-awan-status-error uppercase tracking-widest">
                        {planner.schedule.unscheduled.length} TÂCHES NON PLANIFIÉES
                      </span>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollView>
    );
  }

  function renderUnifiedTimeline() {
    // Build a unified list of events from all modules, grouped by date, sorted descending (most recent first)
    type TimelineItem = {
      key: string;
      type: 'workout' | 'measurement' | 'event';
      label: string;
      sub: string;
      color: string;
    };
    type DayGroup = { date: string; dateLabel: string; isFuture: boolean; items: TimelineItem[] };

    const today = dsDate(new Date());

    // Collect dates with events (last 60 days + next 30 days)
    const dayMap = new Map<string, TimelineItem[]>();
    const addItem = (date: string, item: TimelineItem) => {
      if (!dayMap.has(date)) dayMap.set(date, []);
      dayMap.get(date)!.push(item);
    };

    // Workout sessions
    for (const s of workoutStore.sessions) {
      const date = (s as any).date ?? dsDate(new Date((s as any).startTime ?? 0));
      addItem(date, {
        key: `workout-${(s as any).id}`,
        type: 'workout',
        label: (s as any).name ?? 'SÉANCE',
        sub: `${Math.round(((s as any).duration ?? 0) / 60)} min · ${((s as any).exercises ?? []).length} exercices`,
        color: 'var(--color-awan-gold)',
      });
    }

    // Measurements
    for (const m of measureStore.history) {
      const parts: string[] = [];
      if ((m as any).weight > 0) parts.push(`${(m as any).weight}kg`);
      if ((m as any).body_fat_pct > 0) parts.push(`${(m as any).body_fat_pct}% MG`);
      addItem((m as any).date, {
        key: `meas-${(m as any).date}`,
        type: 'measurement',
        label: 'MESURE CORPORELLE',
        sub: parts.join(' · ') || 'Mesures enregistrées',
        color: 'var(--color-awan-status-ok)',
      });
    }

    // Planning events (last 30 + future)
    const cutoffPast = new Date(); cutoffPast.setDate(cutoffPast.getDate() - 30);
    const cutoffFuture = new Date(); cutoffFuture.setDate(cutoffFuture.getDate() + 30);
    for (const ev of (db?.events ?? [])) {
      const date = ev.date ?? today;
      if (date >= dsDate(cutoffPast) && date <= dsDate(cutoffFuture)) {
        addItem(date, {
          key: `ev-${ev.id}`,
          type: 'event',
          label: ev.title ?? 'Événement',
          sub: ev.time ? `${ev.time} · ${ev.category ?? ''}` : (ev.category ?? ''),
          color: ev.color ?? 'rgba(255,255,255,0.4)',
        });
      }
    }

    const groups: DayGroup[] = Array.from(dayMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        dateLabel: new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase(),
        isFuture: date > today,
        items,
      }));

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        {groups.length === 0 && (
          <div className="py-20 items-center">
            <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest">AUCUNE DONNÉE</span>
          </div>
        )}
        {groups.map(g => (
          <div key={g.date} className="mb-5">
            {/* Séparateur de jour */}
            <div className="flex flex-row items-center gap-3 mb-2">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', fontWeight: 700, letterSpacing: '0.35em', color: g.isFuture ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)' }}>
                {g.date === today ? 'AUJOURD\'HUI' : g.dateLabel}
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: g.isFuture ? 'var(--color-awan-border-soft)' : 'var(--color-awan-border)' }} />
            </div>
            {g.items.map(item => (
              <div key={item.key} className="flex flex-row gap-3 mb-1 py-2 border-b" style={{ borderColor: 'var(--color-awan-border-soft)' }}>
                {/* Barre couleur type */}
                <div className="w-[3px] self-stretch" style={{ backgroundColor: item.color }} />
                <div className="flex-1">
                  {/* Badge type */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', fontWeight: 700, color: item.color, letterSpacing: '0.3em', display: 'block', marginBottom: 2 }}>
                    {item.type === 'workout' ? 'SÉANCE' : item.type === 'measurement' ? 'MESURE' : 'ÉVÉN.'}
                  </span>
                  {/* Titre — hiérarchie principale */}
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block' }}>{item.label}</span>
                  {/* Métadonnées — hiérarchie secondaire */}
                  {item.sub && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.1em', display: 'block', marginTop: 2 }}>{item.sub}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </ScrollView>
    );
  }

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <div className="px-6 pt-4 pb-1">
        <div className="flex flex-row justify-between items-baseline">
          <div className="flex-1">
            <ScreenHeader tag="TIME · PLANNING" title="PLANNING" className="mb-3" />
          </div>
          <Touch onPress={() => setShowImportModal(true)} className="mb-6 w-8 h-8 flex items-center justify-center" style={{ border: '1px solid var(--color-awan-border)' }}>
            <Download size={16} color="var(--color-awan-tx-mute)" />
          </Touch>
        </div>
        <div className="flex flex-row border-b border-white/10">
          {STABS.map(({ id, label, Icon }) => (
            <Touch key={id} className={`flex-1 py-3 flex-col items-center justify-center gap-1.5 border-b-2 transition-all ${subTab === id ? 'border-awan-gold' : 'border-transparent opacity-40'}`} onPress={() => setSubTab(id)}>
              <Icon size={18} className={subTab === id ? 'text-awan-gold' : 'text-awan-tx-mute'} />
              <span className={`text-awan-sm font-black uppercase tracking-[0.2em] font-mono ${subTab === id ? 'text-awan-tx' : 'text-awan-tx-mute'}`}>{label}</span>
            </Touch>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
          {subTab === 0 && renderWeekly()}
          {subTab === 1 && renderMonthly()}
          {subTab === 2 && renderAnnual()}
          {subTab === 3 && renderDaily()}
          {subTab === 4 && renderAiSchedule()}
          {subTab === 5 && renderUnifiedTimeline()}
        </motion.div>
      </AnimatePresence>
      <div className="px-6 pb-24 flex flex-row gap-4 mt-auto">
        <Card className="flex-1 flex-row items-center gap-4 py-6 px-6 bg-white/5 border-white/5" variant="flat">
          <div className="w-10 h-10  bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20"><Zap size={18} className="text-awan-gold" /></div>
          <div><span className="text-2xl font-black text-awan-tx tabular-nums">{eventsForDate(db, ds(new Date())).length}</span><span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest block font-mono">Auj.</span></div>
        </Card>
        <Card className="flex-1 flex-row items-center gap-4 py-6 px-6 bg-white/5 border-white/5" variant="flat">
          <div className="w-10 h-10  bg-white/5 flex items-center justify-center border border-white/10"><Layers size={18} className="text-awan-tx-mute" /></div>
          <div><span className="text-2xl font-black text-awan-tx tabular-nums">{(db?.tasks || []).filter((t: any) => !t.done).length}</span><span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest block font-mono">Tâches</span></div>
        </Card>
      </div>
      <EventModal visible={showEvModal} initial={editEv} defaultDate={ds(selDate)} categories={categories} onClose={() => setShowEvModal(false)} onSave={async (ev: any) => { const evs = db.events || []; const newEvs = editEv ? evs.map((e: any) => e.id === editEv.id ? { ...e, ...ev } : e) : [...evs, { id: uid(), ...ev }]; await updateDb({ ...db, events: newEvs }); setShowEvModal(false); }} />
      <ImportModal visible={showImportModal} onClose={() => setShowImportModal(false)} onImport={async (json: string) => { try { const raw = JSON.parse(json); const newRoutines = (Array.isArray(raw) ? raw : [raw]).map(r => ({ id: uid(), name: r.name || 'Importé', time: r.time || '08:00', frequency: 'daily', color: theme.title })); await updateDb({ ...db, routines: [...(db.routines || []), ...newRoutines] }); setShowImportModal(false); } catch (e) { Alert.alert('Erreur', 'JSON invalide'); } }} />
      {dragConfirm && <Modal transparent visible><div className="flex-1 bg-black/90 justify-center items-center p-8 backdrop-blur-md"><Card className="w-full p-8 bg-awan-surface border-awan-gold" variant="flat"><Heading level={4} mono subtitle="Mise à jour routine" className="mb-6">{L.planning.editRoutine}</Heading><span className="text-sm text-awan-tx-mute mb-8 block leading-relaxed">{L.planning.editPrompt}</span><div className="flex flex-col gap-4"><Touch className="bg-awan-gold h-16 items-center justify-center" onPress={() => confirmRoutineUpdate(true)}><span className="font-black text-black text-xs uppercase tracking-widest font-mono">{L.planning.allOccurrences}</span></Touch><Touch className="bg-white/5 border border-white/10 h-16 items-center justify-center" onPress={() => confirmRoutineUpdate(false)}><span className="font-black text-awan-tx text-xs uppercase tracking-widest font-mono">{L.planning.onlyThis}</span></Touch><Touch className="h-12 items-center justify-center" onPress={() => setDragConfirm(null)}><span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-[0.2em] font-mono">{L.common.cancel}</span></Touch></div></Card></div></Modal>}
    </PageWrapper>
  );
}

function EvListSection({ events, categories, onAdd, onAddRt, onEdit }: any) {
  const theme = useTheme();
  return (
    <div className="space-y-4">
      {events.map((ev: any) => {
        const evColor = ev.color || categories[ev.category]?.c || theme.title;
        return (
          <Touch key={ev.id} className="overflow-hidden flex flex-row border" style={{ borderColor: 'var(--color-awan-border)', backgroundColor: 'rgba(255,255,255,0.02)' }} onPress={() => !ev.isRt && onEdit(ev)}>
            <div className="w-[3px]" style={{ backgroundColor: evColor }} />
            <div className="flex-1 px-4 py-3">
              <div className="flex flex-row justify-between items-center mb-1">
                <div className="flex flex-row items-center gap-2">
                  <Clock size={10} color="var(--color-awan-tx-mute)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.05em' }}>{ev.time || '--:--'}</span>
                </div>
                {ev.isRt
                  ? <div className="px-2 py-0.5" style={{ border: '1px solid var(--color-awan-gold)', backgroundColor: 'rgba(212,175,55,0.08)' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', fontWeight: 700, color: 'var(--color-awan-gold)', letterSpacing: '0.25em' }}>ROUTINE</span></div>
                  : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', fontWeight: 700, color: evColor, letterSpacing: '0.25em' }}>{(categories[ev.category]?.l || ev.category || '').toUpperCase()}</span>
                }
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block' }}>{ev.title}</span>
            </div>
          </Touch>
        );
      })}
      <div className="flex flex-row gap-4 pt-4">
        <Touch onPress={onAdd} className="flex-1 bg-awan-gold h-14  items-center justify-center"><span className="text-awan-md font-black text-black uppercase tracking-widest font-mono">Nouvel Événement</span></Touch>
        <Touch onPress={onAddRt} className="flex-1 bg-white/5 border border-white/10 h-14  items-center justify-center"><span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest font-mono">Routine</span></Touch>
      </div>
    </div>
  );
}

function EventModal({ visible, initial, defaultDate, categories, onClose, onSave }: any) {
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('perso');
  const [time, setTime] = useState('12:00');
  const [reminder, setReminder] = useState(0);
  React.useEffect(() => { if (visible) { setTitle(initial?.title || ''); setCat(initial?.category || 'perso'); setTime(initial?.time || '12:00'); setReminder(initial?.reminder || 0); } }, [visible, initial]);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <div className="flex-1 bg-black/70 justify-end backdrop-blur-sm">
        <div className="bg-awan-surface p-8 pt-4 rounded-none border-t border-white/10 w-full max-w-lg mx-auto">
          <div className="w-12 h-px self-center mb-6" style={{ backgroundColor: 'var(--color-awan-border)' }} />
          <Heading level={2} subtitle="Paramètres du Segment" className="text-center mb-12">PLANIFICATION</Heading>
          <div className="space-y-8">
            <div><span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest ml-1 mb-3 block font-mono">Identifiant de Mission</span><TextInput className="bg-awan-surface border border-white/5  p-5 text-awan-tx font-bold text-base" value={title} onChangeText={setTitle} placeholder="TITRE DE L'OPÉRATION..." placeholderTextColor="var(--color-awan-tx-mute)" /></div>
            <div className="grid grid-cols-2 gap-6">
              <div><span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest ml-1 mb-3 block font-mono">Heure de Lancement</span><TextInput className="bg-awan-surface border border-white/5  p-5 text-awan-tx font-mono text-center text-lg" value={time} onChangeText={setTime} placeholder="12:00" /></div>
              <div><span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest ml-1 mb-3 block font-mono">Anticipation</span><Touch className="bg-awan-surface border border-white/5 h-16  items-center justify-center"><span className="text-xs font-black text-awan-gold uppercase tracking-widest font-mono">{reminder > 0 ? `${reminder}M` : 'OFF'}</span></Touch></div>
            </div>
            <div>
              <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest ml-1 mb-4 block font-mono">Classification Stratégique</span>
              <div className="flex flex-row flex-wrap gap-2">
                {Object.entries(categories).map(([k, c]: [any, any]) => <Touch key={k} className={`px-4 py-2 border transition-all ${cat === k ? 'border-awan-tx/30' : 'border-transparent opacity-40'}`} style={{ backgroundColor: cat === k ? 'rgba(255,255,255,0.06)' : 'var(--color-awan-surface)' }} onPress={() => setCat(k)}><div className="flex flex-row items-center gap-2"><div className="w-2 h-2" style={{ backgroundColor: c.c }} /><span className="text-awan-xs font-black text-awan-tx uppercase tracking-widest font-mono">{c.l}</span></div></Touch>)}
              </div>
            </div>
            <div className="flex flex-row gap-4 pt-4">
              <Touch onPress={onClose} className="flex-1 h-16 items-center justify-center  bg-white/5 border border-white/5"><span className="text-xs font-black text-awan-tx-mute uppercase tracking-widest font-mono">Abandonner</span></Touch>
              <Touch onPress={() => onSave({ title, date: defaultDate, category: cat, time, reminder })} className="flex-1 h-16 items-center justify-center  bg-awan-gold"><span className="text-xs font-black text-black uppercase tracking-widest font-mono">Initialiser</span></Touch>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({ visible, onClose, onImport }: any) {
  const [json, setJson] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade">
      <div className="flex-1 bg-black/80 justify-end backdrop-blur-md">
        <div className="bg-awan-surface p-8 pt-4 rounded-none border-t border-white/10 w-full max-w-lg mx-auto">
          <div className="w-12 h-px mx-auto mb-6" style={{ backgroundColor: 'var(--color-awan-border)' }} />
          <Heading level={2} subtitle="Base de Données Routines" className="text-center mb-12">IMPORTATION</Heading>
          <TextInput className="bg-awan-surface border border-white/5  p-6 text-awan-tx font-mono text-xs mb-10 min-h-[200px]" multiline value={json} onChangeText={setJson} placeholder="[{'name': 'Routine'}]" placeholderTextColor="var(--color-awan-tx-mute)" />
          <div className="flex flex-row gap-4">
            <Touch onPress={onClose} className="flex-1 h-16 items-center justify-center  bg-white/5 border border-white/5"><span className="text-xs font-black text-awan-tx-mute uppercase tracking-widest font-mono">Annuler</span></Touch>
            <Touch onPress={() => onImport(json)} className="flex-1 h-16 items-center justify-center  bg-awan-gold"><span className="text-xs font-black text-black uppercase tracking-widest font-mono">Exécuter Import</span></Touch>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const s = StyleSheet.create({
  evAbsolute: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.03)', borderLeftWidth: 4, borderRadius: 12, padding: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'var(--color-awan-border-soft)' },
  evAbsTitle: { fontSize: 10, fontWeight: '900', letterSpacing: -0.2, textTransform: 'uppercase' },
});
