import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Modal, TextInput as RNTextInput, Alert, Vibration,
} from 'react-native';
import { usePlanner } from '../hooks/usePlanner';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useWeightStore } from '../hooks/useWeightStore';
import { ds as dsDate } from '../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { CATS, MONTHS, DAYS_S } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { FontSans, FontMono } from '../constants/typography';
import { L } from '../constants/labels';
import { ds, parseDate, uid, dateId } from '../utils/storage';
import { TimelineService, type TimelineItem } from '../modules/planning/timeline';
import { TASK_TYPE_META } from '../data/schemas/planning/taskType';
import { eventBus } from '../data/events/bus';
import type { EventMap } from '../data/events/types';
import { useTimeline } from '../hooks/useTimeline';
import { useAppState } from '../context/AppStateContext';

import { Clock, Plus, Download, ChevronLeft, ChevronRight, Calendar, Columns, Grid3X3, Zap, Target, Layers, Trash, TrendingUp } from 'lucide-react-native';
import { dominantEnergy } from '../modules/planning/engine/energyModel';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Touch } from '../components/ui/Touch';
import { TimelineView } from '../components/planning/TimelineView';
import { Fs, Fw, Ls, Clr } from '../theme/tokens';

const TextInput = RNTextInput as React.ComponentType<any>;

const DraggableEvent = React.memo(({ ev, hourHeight, handleEventDragEnd, setEditEv, setShowEvModal, categories }: any) => {
  const theme = useTheme();
  const sd = StyleSheet.create({
    evAbsolute: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.03)', borderLeftWidth: 4, borderRadius: 12, padding: 8, overflow: 'hidden', borderWidth: 1, borderColor: theme.borderSoft },
    evAbsTitle: { fontSize: 10, fontWeight: '900', letterSpacing: -0.2, textTransform: 'uppercase' },
  });

  const translateY = useSharedValue(0);
  const dragging = useSharedValue(0);

  const [hh, mm] = (ev.time || '00:00').split(':').map(Number);
  const top = (hh + mm / 60) * hourHeight;
  const height = hourHeight;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: dragging.value ? 0.9 : 1,
    zIndex: 10,
  }));

  // Long-press (500ms) puis drag vertical → snap-to-origin, mise à jour de l'heure au drop.
  const pan = Gesture.Pan()
    .activateAfterLongPress(500)
    .onStart(() => { dragging.value = 1; })
    .onUpdate((e) => { translateY.value = e.translationY; })
    .onEnd((e) => {
      runOnJS(handleEventDragEnd)(ev, { offset: { y: e.translationY } }, hourHeight);
      translateY.value = withSpring(0);
      dragging.value = 0;
    })
    .onFinalize(() => { dragging.value = 0; });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ position: 'absolute', top, left: 2, right: 2 }, animStyle]}>
        <Touch
          style={StyleSheet.flatten([sd.evAbsolute, { height, borderLeftColor: ev.color || categories[ev.category]?.c || theme.title, position: 'relative', top: 0, left: 0, right: 0 }])}
          onPress={() => !ev.isRt && (setEditEv(ev), setShowEvModal(true))}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
             {ev.isRt && <Zap size={6} color={theme.mute} />}
             <Text style={[sd.evAbsTitle, { color: theme.title }]} numberOfLines={hourHeight === 20 ? 1 : 2}>{hourHeight === 20 ? ev.title : `${ev.time} - ${ev.title}`}</Text>
          </View>
        </Touch>
      </Animated.View>
    </GestureDetector>
  );
});

const STABS = [
  { id: 0, label: 'SEMAINE', Icon: Columns },
  { id: 1, label: 'MOIS', Icon: Grid3X3 },
  { id: 2, label: 'ANNÉE', Icon: Calendar },
  { id: 4, label: 'PLANIFIER', Icon: Target },
  { id: 5, label: 'CHRONOLOGIE', Icon: Layers },
  { id: 6, label: 'ANALYSE', Icon: TrendingUp },
];

function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

interface MonthlyCellProps {
  cell: { day: number; cur: boolean; dstr: string | null; isToday?: boolean; evs: any[] };
  isSel: boolean;
  onSelect: (dateStr: string) => void;
}

const MonthlyCellItem = React.memo(function MonthlyCellItem({ cell, isSel, onSelect }: MonthlyCellProps) {
  const theme = useTheme();
  const numColor = !cell.cur
    ? theme.title
    : isSel
      ? '#000'
      : cell.isToday === true
        ? theme.selected
        : theme.title;
  const numWeight: any = (cell.cur && isSel) ? Fw.display : Fw.body;
  return (
    <Touch
      style={{ width: '14.28%', height: 64, alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: isSel ? theme.selected : 'transparent' }}
      onPress={() => cell.dstr && onSelect(cell.dstr)}
    >
      <Text style={{ fontSize: 14, color: numColor, fontWeight: numWeight, opacity: !cell.cur ? 0.1 : 1 }}>{cell.day}</Text>
      <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
        {cell.evs.slice(0, 3).map((_ev: any, idx: number) => (
          <View key={idx} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSel ? 'rgba(0,0,0,0.6)' : 'rgba(212,175,55,0.6)' }} />
        ))}
      </View>
    </Touch>
  );
});

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  void insets;
  const { db, updateDb, navigate } = useAppState() as any;
  void navigate;
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
  void showRtModal;
  const [showImportModal, setShowImportModal] = useState(false);
  const [editEv, setEditEv] = useState<any>(null);
  const [dragConfirm, setDragConfirm] = useState<any>(null);
  const [creatingEv, setCreatingEv] = useState<any>(null);
  const creatingEvRef = useRef<any>(null);

  const planner = usePlanner();
  const workoutStore = useWorkoutStore();
  const measureStore = useMeasurementStore();
  const weightStore = useWeightStore();
  const [aiTitle, setAiTitle] = useState('');
  const [aiDuration, setAiDuration] = useState('30');
  const [aiPriority, setAiPriority] = useState<1 | 2 | 3>(3);
  const [aiTimeCategory, setAiTimeCategory] = useState<'production' | 'friction' | 'slack' | 'somatique' | null>(null);

  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [todayCount, setTodayCount] = useState(0);
  const [busVersion, setBusVersion] = useState(0);
  const { items: selDayItems } = useTimeline(ds(selDate));

  const categories = useMemo(() => {
    const base: any = { ...CATS };
    if (db?.categories) {
      db.categories.forEach((c: any) => { base[c.key] = { l: c.label, c: c.color }; });
    }
    return base;
  }, [db?.categories]);

  // Abonnement event bus → recharger les counts quand une donnée est enregistrée dans un silo
  useEffect(() => {
    const EVENTS: ReadonlyArray<keyof EventMap> = [
      'workout.completed', 'meal.logged', 'measurement.recorded', 'day.ended',
      'planning.optimized', 'journal.logged', 'prayer.logged', 'quran.logged', 'habit.logged',
    ];
    const offs = EVENTS.map(ev => eventBus.on(ev, () => setBusVersion(v => v + 1)));
    return () => offs.forEach(off => off());
  }, []);

  // Counts du mois visible (dots grille mensuelle + dot hebdo)
  useEffect(() => {
    let cancelled = false;
    const yr = calDate.getFullYear(), mo = calDate.getMonth();
    const dim = new Date(yr, mo + 1, 0).getDate();
    const entries: Array<{ dstr: string; p: Promise<number> }> = [];
    for (let day = 1; day <= dim; day++) {
      const dstr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      entries.push({ dstr, p: TimelineService.getByDate(dstr).then(items => items.length) });
    }
    Promise.all(entries.map(async ({ dstr, p }) => ({ dstr, count: await p }))).then(results => {
      if (cancelled) return;
      setDayCounts(prev => {
        const next = { ...prev };
        results.forEach(({ dstr, count }) => { next[dstr] = count; });
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [calDate, busVersion]);

  // Counts de l'année (dots grille annuelle) — chargés mois par mois
  useEffect(() => {
    let cancelled = false;
    const yr = annDate.getFullYear();
    const loadYear = async () => {
      for (let mo = 0; mo < 12 && !cancelled; mo++) {
        const dim = new Date(yr, mo + 1, 0).getDate();
        const entries: Array<{ dstr: string; p: Promise<number> }> = [];
        for (let day = 1; day <= dim; day++) {
          const dstr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          entries.push({ dstr, p: TimelineService.getByDate(dstr).then(items => items.length) });
        }
        const results = await Promise.all(entries.map(async ({ dstr, p }) => ({ dstr, count: await p })));
        if (!cancelled) {
          setDayCounts(prev => {
            const next = { ...prev };
            results.forEach(({ dstr, count }) => { next[dstr] = count; });
            return next;
          });
        }
      }
    };
    loadYear();
    return () => { cancelled = true; };
  }, [annDate, busVersion]);

  // Compte du jour actuel (carte stat en bas)
  useEffect(() => {
    let cancelled = false;
    TimelineService.getByDate(ds(new Date())).then(items => { if (!cancelled) setTodayCount(items.length); });
    return () => { cancelled = true; };
  }, [busVersion]);

  // Création d'événement par appui long + glissement vertical sur la grille quotidienne.
  // (remplace les anciens pointer events web par un geste react-native-gesture-handler)
  const HOUR_PX = 80;
  const beginCreate = (y: number) => {
    let totalMins = (y / HOUR_PX) * 60;
    totalMins = Math.floor(totalMins / 15) * 15;
    let hh = Math.floor(totalMins / 60);
    let mm = Math.floor(totalMins % 60);
    if (hh > 23) { hh = 23; mm = 45; }
    const ev = { startY: y, startMins: hh * 60 + mm, duration: 15, title: 'Occupé', category: 'perso' };
    creatingEvRef.current = ev;
    setCreatingEv(ev);
  };
  const growCreate = (translationY: number) => {
    const cur = creatingEvRef.current;
    if (!cur || translationY <= 0) return;
    const blocks = Math.round(((translationY / HOUR_PX) * 60) / 15);
    const next = { ...cur, duration: Math.max(15, 15 + blocks * 15) };
    creatingEvRef.current = next;
    setCreatingEv(next);
  };
  const endCreate = () => {
    const cur = creatingEvRef.current;
    if (!cur) return;
    const newEv = {
      id: `ev_${Date.now()}`,
      date: ds(selDate),
      time: `${String(Math.floor(cur.startMins / 60)).padStart(2, '0')}:${String(cur.startMins % 60).padStart(2, '0')}`,
      duration: cur.duration.toString(),
      title: cur.title,
      category: cur.category,
    };
    updateDb({ ...db, events: [...(db.events || []), newEv] });
    creatingEvRef.current = null;
    setCreatingEv(null);
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
      cells.push({ day, cur: true, dstr, isToday: dstr === todayStr, evs: (dayCounts[dstr] ?? 0) > 0 ? [true] : [] });
    }
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - (start + dim) + 1, cur: false, dstr: null, evs: [] });
    return cells;
  }, [calDate, dayCounts]);

  const selectDate = useCallback((dateStr: string) => {
    if (ds(selDate) === dateStr) { setPrevTab(subTab); setSubTab(3); }
    else setSelDate(parseDate(dateStr));
  }, [selDate, subTab]);

  function renderMonthly() {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={[sp.rowBetween, { paddingHorizontal: 24, marginBottom: 32 }]}>
          <Touch onPress={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()-1, 1))} style={[sp.navBtn, { borderColor: theme.border }]}>
            <ChevronLeft size={20} color={theme.mute} />
          </Touch>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: Fw.display, color: theme.title, textTransform: 'uppercase', letterSpacing: 4.2, fontFamily: FontMono }}>{MONTHS[calDate.getMonth()]}</Text>
            <Text style={[sp.sm, { color: theme.selected, textAlign: 'center' }]}>{calDate.getFullYear()}</Text>
          </View>
          <Touch onPress={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()+1, 1))} style={[sp.navBtn, { borderColor: theme.border }]}>
            <ChevronRight size={20} color={theme.mute} />
          </Touch>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 }}>
          {DAYS_S.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', fontFamily: FontMono, letterSpacing: 1.6, color: i >= 5 ? theme.selected : theme.mute, opacity: i >= 5 ? 0.5 : 1 }}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginBottom: 24 }}>
          {monthlyCells.map((cell, i) => (
            <MonthlyCellItem
              key={i}
              cell={cell}
              isSel={!!(cell.dstr && cell.dstr === ds(selDate))}
              onSelect={selectDate}
            />
          ))}
        </View>
        {/* Événements du jour sélectionné */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <Text style={{ textTransform: 'uppercase', marginBottom: 12, fontFamily: FontSans, fontSize: 7, fontWeight: Fw.value, color: theme.mute, letterSpacing: 2.1 }}>
            {new Date(selDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </Text>
          <SelDaySection items={selDayItems} onAdd={() => setShowEvModal(true)} onAddRt={() => setShowRtModal(true)} />
        </View>
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
      const dstr = ds(day);
      return { day, dstr, evs: (db?.events || []).filter((e: any) => e.date === dstr) };
    });
    const hours = Array.from({ length: 24 }).map((_, h) => `${String(h).padStart(2, '0')}:00`);
    return (
      <View style={{ flex: 1 }}>
        <View style={[sp.rowBetween, { paddingHorizontal: 24, marginBottom: 32 }]}>
          <Touch onPress={() => setWkDate(new Date(wkDate.getTime() - 7*86400000))} style={[sp.navBtn, { borderColor: theme.border }]}><ChevronLeft size={20} color={theme.mute} /></Touch>
          <Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: theme.title, textTransform: 'uppercase', letterSpacing: 4, fontFamily: FontMono }}>{lbl.toUpperCase()}</Text>
          <Touch onPress={() => setWkDate(new Date(wkDate.getTime() + 7*86400000))} style={[sp.navBtn, { borderColor: theme.border }]}><ChevronRight size={20} color={theme.mute} /></Touch>
        </View>
        <View style={{ flexDirection: 'row', paddingLeft: 48, paddingRight: 16, marginBottom: 24 }}>
          {cols.map((c, i) => {
            const isToday = c.dstr === ds(new Date());
            return (
              <Touch key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 64, borderWidth: 1, borderColor: isToday ? Clr.gold30 : 'transparent', backgroundColor: isToday ? Clr.gold10 : 'transparent' }} onPress={() => selectDate(c.dstr)}>
                <Text style={{ fontSize: Fs.xs, fontWeight: Fw.display, color: theme.mute, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.6, fontFamily: FontMono }}>{DAYS_S[i]}</Text>
                <Text style={{ fontSize: 20, fontWeight: Fw.display, color: isToday ? theme.selected : theme.title }}>{c.day.getDate()}</Text>
                {(dayCounts[c.dstr] ?? 0) > 0 && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isToday ? theme.selected : 'rgba(212,175,55,0.5)', marginTop: 3 }} />}
              </Touch>
            );
          })}
        </View>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 100 }} style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 48, borderRightWidth: 1, borderRightColor: Clr.white5 }}>
              {hours.map((h, i) => <View key={i} style={{ height: 80, alignItems: 'center' }}><Text style={{ fontSize: Fs.sm, fontFamily: FontMono, color: theme.mute, fontWeight: Fw.display, marginTop: 8, opacity: 0.4 }}>{h}</Text></View>)}
            </View>
            <View style={{ flex: 1, flexDirection: 'row', position: 'relative' }}>
              {cols.map((c, i) => (
                <View key={i} style={{ flex: 1, borderRightWidth: 1, borderRightColor: Clr.white5, position: 'relative' }}>
                  {hours.map((_, h) => <View key={h} style={{ height: 80, borderBottomWidth: 1, borderBottomColor: Clr.white5, opacity: 0.05 }} />)}
                  {c.evs.map((ev: any) => ev.time && <DraggableEvent key={ev.id} ev={ev} hourHeight={20} handleEventDragEnd={handleEventDragEnd} setEditEv={setEditEv} setShowEvModal={setShowEvModal} categories={categories} />)}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  function renderAnnual() {
    const yr = annDate.getFullYear();
    return (
      <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 24 }}>
        <View style={[sp.rowBetween, { marginBottom: 32, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Clr.white5 }]}>
          <Touch onPress={() => setAnnDate(new Date(yr - 1, 0, 1))} style={[sp.navBtn, { borderColor: theme.border }]}><ChevronLeft size={18} color={theme.mute} /></Touch>
          <Text style={{ fontSize: 30, fontWeight: Fw.display, color: theme.title, letterSpacing: -0.6 }}>{yr}</Text>
          <Touch onPress={() => setAnnDate(new Date(yr + 1, 0, 1))} style={[sp.navBtn, { borderColor: theme.border }]}><ChevronRight size={18} color={theme.mute} /></Touch>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 96 }}>
          {Array.from({ length: 12 }).map((_, mo) => {
            const dim = new Date(yr, mo + 1, 0).getDate();
            const moStr = String(mo + 1).padStart(2, '0');
            const daysSet = new Set(
              Object.entries(dayCounts)
                .filter(([dstr, cnt]) => dstr.startsWith(`${yr}-${moStr}-`) && cnt > 0)
                .map(([dstr]) => parseInt(dstr.split('-')[2]!, 10))
            );
            const first = new Date(yr, mo, 1).getDay();
            const start = first === 0 ? 6 : first - 1;
            const cells = [];
            for (let i = 0; i < start; i++) cells.push(null);
            for (let day = 1; day <= dim; day++) cells.push({ day, has: daysSet.has(day) });
            return (
              <Card key={mo} variant="flat" style={{ width: '47%', padding: 16, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }}>
                <Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: theme.selected, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center', letterSpacing: 3, fontFamily: FontMono }}>{MONTHS[mo]}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {cells.map((c, i) => <View key={i} style={{ width: '14.28%', height: 16, alignItems: 'center', justifyContent: 'center' }}>{c && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.has ? theme.selected : Clr.white5 }} />}</View>)}
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function renderDaily() {
    const dstr = ds(selDate);
    const day = new Date(selDate);
    const lbl = day.toLocaleDateString('fr-FR',{weekday:'long', day:'numeric',month:'short'});
    const hours = Array.from({ length: 24 }).map((_, h) => `${String(h).padStart(2, '0')}:00`);
    const gridGesture = Gesture.Pan()
      .activateAfterLongPress(600)
      .onStart((e) => {
        runOnJS(Vibration.vibrate)(20);
        runOnJS(beginCreate)(e.y);
      })
      .onUpdate((e) => { runOnJS(growCreate)(e.translationY); })
      .onEnd(() => { runOnJS(endCreate)(); })
      .onFinalize(() => { runOnJS(endCreate)(); });
    return (
      <View style={{ flex: 1 }}>
        <View style={[sp.row, { paddingHorizontal: 24, marginBottom: 24 }]}>
          <Touch onPress={() => setSubTab(prevTab)} style={[sp.navBtn, { borderColor: theme.border }]}><ChevronLeft size={20} color={theme.mute} /></Touch>
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 12, fontWeight: Fw.display, color: theme.title, textTransform: 'uppercase', letterSpacing: 4.8, fontFamily: FontMono }}>{lbl.toUpperCase()}</Text></View>
          <Touch onPress={() => setShowEvModal(true)} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.selected }}><Plus size={18} color={theme.bg} strokeWidth={3} /></Touch>
        </View>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 100 }} scrollEnabled={!creatingEv} style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 48, borderRightWidth: 1, borderRightColor: Clr.white5 }}>
              {hours.map((h, i) => <View key={i} style={{ height: 80, alignItems: 'center', paddingTop: 8 }}><Text style={{ fontSize: Fs.md, fontFamily: FontMono, fontWeight: Fw.display, color: theme.mute, opacity: 0.4 }}>{h}</Text></View>)}
            </View>
            <GestureDetector gesture={gridGesture}>
              <View style={{ flex: 1, position: 'relative' }}>
                {hours.map((_, h) => <View key={h} style={{ height: 80, borderBottomWidth: 1, borderBottomColor: Clr.white5, opacity: 0.05 }} />)}
                {creatingEv && <View style={{ position: 'absolute', left: 4, right: 4, backgroundColor: Clr.gold20, borderLeftWidth: 4, borderLeftColor: theme.selected, padding: 12, zIndex: 10, top: (creatingEv.startMins / 60) * 80, height: (creatingEv.duration / 60) * 80 }}><Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: theme.title, textTransform: 'uppercase', letterSpacing: 1.8 }}>{creatingEv.title}</Text></View>}
                {(db?.events || []).filter((e: any) => e.date === dstr).map((ev: any) => ev.time && <DraggableEvent key={ev.id} ev={ev} hourHeight={80} handleEventDragEnd={handleEventDragEnd} setEditEv={setEditEv} setShowEvModal={setShowEvModal} categories={categories} />)}
                {selDayItems.filter(item => item.startMin != null).map(item => <TimelineBar key={item.id} item={item} hourHeight={80} theme={theme} />)}
              </View>
            </GestureDetector>
          </View>
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
      const today = dsDate(new Date());
      await planner.saveTask({
        v: 4,
        id: dateId(today),
        date: today,
        scheduledDate: today,
        title: aiTitle.trim(),
        durationMin: dur,
        priority: aiPriority,
        domain: 'general',
        tags: [],
        dependsOn: [],
        status: 'active',
        timeCategory: aiTimeCategory,
      });
      setAiTitle('');
      setAiDuration('30');
      setAiTimeCategory(null);
    };

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ flex: 1, backgroundColor: theme.bg }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 32 }}>
          {/* Add task form */}
          <View>
            <Heading level={4} mono subtitle="Injection de Tâche">NOUVELLE MISSION</Heading>
            <View style={{ gap: 12 }}>
              <TextInput
                style={[sp.field, { backgroundColor: theme.bg, color: theme.title }]}
                placeholder="TITRE DE LA TÂCHE..."
                placeholderTextColor={theme.mute}
                value={aiTitle}
                onChangeText={setAiTitle}
              />
              <View style={[sp.row, { gap: 12, alignItems: 'flex-start' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[sp.label, { color: theme.mute, marginBottom: 8 }]}>DURÉE (MIN)</Text>
                  <TextInput
                    style={[sp.field, { backgroundColor: theme.bg, color: theme.title, fontFamily: FontMono }]}
                    placeholder="30"
                    placeholderTextColor={theme.mute}
                    keyboardType="numeric"
                    value={aiDuration}
                    onChangeText={setAiDuration}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[sp.label, { color: theme.mute, marginBottom: 8 }]}>PRIORITÉ</Text>
                  <View style={[sp.row, { gap: 4 }]}>
                    {([1, 2, 3] as const).map(p => {
                      const active = aiPriority === p;
                      return (
                        <Touch key={p} onPress={() => setAiPriority(p)} style={{ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: active ? Clr.gold20 : Clr.white5, borderColor: active ? theme.selected : Clr.white5 }}>
                          <Text style={{ fontSize: 12, fontWeight: Fw.display, fontFamily: FontMono, color: active ? theme.selected : theme.mute }}>{p}</Text>
                        </Touch>
                      );
                    })}
                  </View>
                </View>
              </View>
              <View>
                <Text style={[sp.label, { color: theme.mute, marginBottom: 8 }]}>CATÉGORIE TEMPS</Text>
                <View style={[sp.row, { gap: 4 }]}>
                  {([null, 'production', 'friction', 'slack'] as const).map(cat => {
                    const active = aiTimeCategory === cat;
                    const label = cat === null ? 'AUCUNE' : cat.toUpperCase();
                    const color = cat === 'production' ? theme.statusOk
                      : cat === 'friction' ? theme.statusWarn
                      : cat === 'slack' ? theme.statusInfo
                      : theme.mute;
                    return (
                      <Touch key={String(cat)} onPress={() => setAiTimeCategory(cat)} style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: active ? Clr.white10 : Clr.white5, borderColor: active ? color : theme.border }}>
                        <Text style={{ fontSize: Fs.xs, fontWeight: Fw.display, fontFamily: FontMono, color: active ? color : theme.mute }}>{label}</Text>
                      </Touch>
                    );
                  })}
                </View>
              </View>
              <Touch onPress={addAiTask} style={{ height: 56, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, alignItems: 'center', justifyContent: 'center' }}>
                <View style={[sp.row, { gap: 12 }]}>
                  <Plus size={18} color={theme.selected} />
                  <Text style={[sp.label, { color: theme.selected }]}>INJECTER TÂCHE</Text>
                </View>
              </Touch>
            </View>
          </View>

          {/* Task list */}
          {planner.tasks.length > 0 && (
            <View>
              <Heading level={4} mono subtitle={`${planner.tasks.length} missions`}>FILE D'ATTENTE</Heading>
              <View style={{ gap: 8 }}>
                {planner.tasks.map(t => {
                  const domainColor = (categories[t.domain] ?? CATS[t.domain as keyof typeof CATS])?.c ?? theme.mute;
                  const titleWeight: any = t.priority <= 1 ? Fw.display : t.priority <= 2 ? Fw.value : t.priority <= 3 ? Fw.label : Fw.body;
                  const titleSize = t.priority <= 1 ? 13 : t.priority <= 3 ? 12 : 11;
                  return (
                    <View key={t.id} style={[sp.row, { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }]}>
                      <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: domainColor }} />
                      <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
                        <Text style={{ fontFamily: FontMono, fontSize: 7, fontWeight: Fw.value, color: domainColor, letterSpacing: 2.1, marginBottom: 2 }}>{(categories[t.domain]?.l ?? t.domain ?? '').toUpperCase()}</Text>
                        <Text style={{ fontFamily: FontSans, fontSize: titleSize, fontWeight: titleWeight, color: theme.title, letterSpacing: titleSize * 0.04, textTransform: 'uppercase' }}>{t.title}</Text>
                        <Text style={{ fontFamily: FontMono, fontSize: 8, color: theme.mute, letterSpacing: 0.8, marginTop: 2 }}>{t.durationMin} MIN · P{t.priority}</Text>
                      </View>
                      <Touch onPress={() => planner.deleteTask(t.id)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
                        <Trash size={14} color={theme.mute} />
                      </Touch>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Optimize button */}
          <Touch onPress={() => planner.optimize(today)} style={{ height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: planner.optimizing ? Clr.white5 : Clr.gold10, borderColor: planner.optimizing ? Clr.white10 : Clr.gold30 }}>
            <View style={[sp.row, { gap: 12 }]}>
              <Zap size={20} color={planner.optimizing ? theme.mute : theme.selected} />
              <Text style={[sp.label, { color: planner.optimizing ? theme.mute : theme.selected }]}>{planner.optimizing ? 'CALCUL EN COURS...' : 'OPTIMISER AUJOURD\'HUI'}</Text>
            </View>
          </Touch>

          {/* Schedule result */}
          {planner.schedule && (
            <View>
              <Heading level={4} mono subtitle={`${planner.schedule.slots.length} créneaux`}>PLANNING OPTIMISÉ</Heading>
              {planner.schedule.slots.length === 0 ? (
                <Card variant="flat" style={{ paddingVertical: 40, alignItems: 'center', backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }}>
                  <Text style={[sp.label, { color: theme.mute }]}>AUCUN CRÉNEAU GÉNÉRÉ</Text>
                </Card>
              ) : (
                <View style={{ gap: 8 }}>
                  {planner.schedule.slots.map((slot, i) => {
                    const task = taskMap.get(slot.taskId);
                    return (
                      <Card key={i} variant="flat" style={[sp.row, { gap: 16, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.gold10 }]}>
                        <View style={{ width: 64, alignItems: 'center' }}>
                          <Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: theme.selected, fontFamily: FontMono }}>{minToTime(slot.startMin)}</Text>
                          <Text style={{ fontSize: Fs.xs, fontWeight: Fw.value, color: theme.mute, fontFamily: FontMono }}>{minToTime(slot.endMin)}</Text>
                        </View>
                        <View style={{ width: 1, height: 32, backgroundColor: Clr.gold20 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: Fw.value, color: theme.title, textTransform: 'uppercase', letterSpacing: -0.35 }}>{task?.title ?? slot.taskId}</Text>
                          <Text style={[sp.sm, { color: theme.mute }]}>{slot.endMin - slot.startMin} MIN</Text>
                        </View>
                      </Card>
                    );
                  })}
                  {planner.schedule.unscheduled.length > 0 && (
                    <Card variant="flat" style={{ paddingVertical: 16, paddingHorizontal: 20, backgroundColor: `${theme.danger}0D`, borderWidth: 1, borderColor: `${theme.danger}33` }}>
                      <Text style={[sp.sm, { color: theme.danger }]}>{planner.schedule.unscheduled.length} TÂCHES NON PLANIFIÉES</Text>
                    </Card>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  function renderUnifiedTimeline() {
    // Visionneur AWAN dans le temps — agrège les 8 types de tâches via
    // useTimeline (getByDate + event bus). Remplace l'ancien flux partiel
    // (séances + mesures + db.events mort).
    return <TimelineView />;
  }

  function renderAnalyse() {
    if (!planner.schedule) {
      return (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 32, gap: 16 }}>
            <Card variant="flat" style={{ padding: 24, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }}>
              <Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: theme.mute, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' }}>
                Lance l'optimiseur d'abord (onglet PLANIFIER)
              </Text>
            </Card>
          </View>
        </ScrollView>
      );
    }

    const taskMap = new Map(planner.tasks.map(t => [t.id, t]));
    const { slots, unscheduled } = planner.schedule;

    let totalSlackMin = 0;
    for (let i = 0; i + 1 < slots.length; i++) {
      const gap = slots[i + 1]!.startMin - slots[i]!.endMin;
      if (gap > 0) totalSlackMin += gap;
    }

    const highPrioSlots = slots.filter(s => (taskMap.get(s.taskId)?.priority ?? 99) === 1);
    const alignedSlots = highPrioSlots.filter(s => dominantEnergy(s.startMin, s.endMin - s.startMin) === 'high');
    const alignPct = highPrioSlots.length > 0 ? Math.round((alignedSlots.length / highPrioSlots.length) * 100) : null;

    const minToHH = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ backgroundColor: theme.bg }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 24 }}>
          {/* Summary cards */}
          <Card variant="flat" style={{ padding: 24, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }}>
            <Heading level={4} mono subtitle="Analyse du planning optimisé">RÉSULTATS</Heading>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
              <View style={{ width: '47%', borderWidth: 1, borderColor: Clr.white5, padding: 16 }}>
                <Text style={[sp.label, { color: theme.mute, marginBottom: 4 }]}>CRÉNEAUX PLACÉS</Text>
                <Text style={{ fontSize: 24, fontWeight: Fw.display, fontFamily: FontMono, color: theme.title }}>{slots.length}</Text>
                {unscheduled.length > 0 && (
                  <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, color: theme.statusWarn, marginTop: 4 }}>{unscheduled.length} non placé{unscheduled.length > 1 ? 's' : ''}</Text>
                )}
              </View>
              <View style={{ width: '47%', borderWidth: 1, borderColor: Clr.white5, padding: 16 }}>
                <Text style={[sp.label, { color: theme.mute, marginBottom: 4 }]}>TEMPS LIBRE</Text>
                <Text style={{ fontSize: 24, fontWeight: Fw.display, fontFamily: FontMono, color: theme.title }}>{Math.round(totalSlackMin / 60)}h{totalSlackMin % 60 > 0 ? `${totalSlackMin % 60}m` : ''}</Text>
                <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, color: theme.mute, marginTop: 4 }}>entre créneaux</Text>
              </View>
            </View>
            {alignPct !== null && (
              <View style={{ marginTop: 16, borderWidth: 1, borderColor: Clr.white5, padding: 16 }}>
                <View style={[sp.rowBetween, { alignItems: 'baseline', marginBottom: 8 }]}>
                  <Text style={[sp.label, { color: theme.mute }]}>ALIGNEMENT ÉNERGIE</Text>
                  <Text style={{ fontSize: 20, fontWeight: Fw.display, fontFamily: FontMono, color: alignPct >= 80 ? theme.statusOk : alignPct >= 50 ? theme.statusWarn : theme.danger }}>{alignPct}%</Text>
                </View>
                <Text style={{ fontSize: Fs.xs, color: theme.mute, lineHeight: Math.round(Fs.xs * 1.5) }}>
                  Tâches haute priorité placées en créneau haute énergie circadienne (06h–09h, 17h–19h)
                </Text>
                <View style={{ marginTop: 8, height: 6, width: '100%', backgroundColor: theme.borderSoft }}>
                  <View style={{ height: '100%', width: `${alignPct}%`, backgroundColor: alignPct >= 80 ? theme.statusOk : alignPct >= 50 ? theme.statusWarn : theme.danger }} />
                </View>
              </View>
            )}
          </Card>

          {/* Slot list */}
          <Card variant="flat" style={{ padding: 24, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }}>
            <Heading level={4} mono subtitle="Ordre chronologique">SÉQUENCE</Heading>
            <View style={{ gap: 8, marginTop: 16 }}>
              {slots.map((slot, i) => {
                const task = taskMap.get(slot.taskId);
                const energy = dominantEnergy(slot.startMin, slot.endMin - slot.startMin);
                const energyColor = energy === 'high' ? theme.statusOk : energy === 'medium' ? theme.statusWarn : theme.mute;
                return (
                  <View key={i} style={[sp.row, { gap: 12, borderBottomWidth: 1, borderBottomColor: Clr.white5, paddingBottom: 8 }]}>
                    <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, color: theme.mute, width: 80 }}>{minToHH(slot.startMin)}–{minToHH(slot.endMin)}</Text>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: energyColor }} />
                    <Text numberOfLines={1} style={{ fontSize: Fs.sm, fontWeight: Fw.display, color: theme.title, flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>{task?.title ?? slot.taskId}</Text>
                    {task && task.priority === 1 && (
                      <Text style={{ fontSize: Fs.xs, fontFamily: FontMono, color: theme.selected }}>P{task.priority}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </Card>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 }}>
        <View style={[sp.rowBetween, { alignItems: 'baseline' }]}>
          <View style={{ flex: 1 }}>
            <ScreenHeader tag="TIME · PLANNING" title="PLANNING" />
          </View>
          <Touch onPress={() => setShowImportModal(true)} style={{ marginBottom: 24, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
            <Download size={16} color={theme.mute} />
          </Touch>
        </View>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Clr.white10 }}>
          {STABS.map(({ id, label, Icon }) => {
            const active = subTab === id;
            return (
              <Touch key={id} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: active ? theme.selected : 'transparent', opacity: active ? 1 : 0.4 }} onPress={() => setSubTab(id)}>
                <Icon size={18} color={active ? theme.selected : theme.mute} />
                <Text style={{ fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: 1.8, fontFamily: FontMono, color: active ? theme.title : theme.mute }}>{label}</Text>
              </Touch>
            );
          })}
        </View>
      </View>
      <Animated.View key={subTab} entering={FadeInDown.duration(220)} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {subTab === 0 && renderWeekly()}
        {subTab === 1 && renderMonthly()}
        {subTab === 2 && renderAnnual()}
        {subTab === 3 && renderDaily()}
        {subTab === 4 && renderAiSchedule()}
        {subTab === 5 && renderUnifiedTimeline()}
        {subTab === 6 && renderAnalyse()}
      </Animated.View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 96, flexDirection: 'row', gap: 16, marginTop: 'auto' }}>
        <Card variant="flat" style={[sp.row, { flex: 1, gap: 16, paddingVertical: 24, paddingHorizontal: 24, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
          <View style={{ width: 40, height: 40, backgroundColor: Clr.gold10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Clr.gold20 }}><Zap size={18} color={theme.selected} /></View>
          <View><Text style={{ fontSize: 24, fontWeight: Fw.display, color: theme.title }}>{todayCount}</Text><Text style={[sp.sm, { color: theme.mute, fontFamily: FontMono }]}>Auj.</Text></View>
        </Card>
        <Card variant="flat" style={[sp.row, { flex: 1, gap: 16, paddingVertical: 24, paddingHorizontal: 24, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
          <View style={{ width: 40, height: 40, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}><Layers size={18} color={theme.mute} /></View>
          <View><Text style={{ fontSize: 24, fontWeight: Fw.display, color: theme.title }}>{(db?.tasks || []).filter((t: any) => !t.done).length}</Text><Text style={[sp.sm, { color: theme.mute, fontFamily: FontMono }]}>Tâches</Text></View>
        </Card>
      </View>
      <EventModal visible={showEvModal} initial={editEv} defaultDate={ds(selDate)} categories={categories} onClose={() => setShowEvModal(false)} onSave={async (ev: any) => { const evs = db.events || []; const newEvs = editEv ? evs.map((e: any) => e.id === editEv.id ? { ...e, ...ev } : e) : [...evs, { id: uid(), ...ev }]; await updateDb({ ...db, events: newEvs }); setShowEvModal(false); }} />
      <ImportModal visible={showImportModal} onClose={() => setShowImportModal(false)} onImport={async (json: string) => { try { const raw = JSON.parse(json); const newRoutines = (Array.isArray(raw) ? raw : [raw]).map(r => ({ id: uid(), name: r.name || 'Importé', time: r.time || '08:00', frequency: 'daily', color: theme.title })); await updateDb({ ...db, routines: [...(db.routines || []), ...newRoutines] }); setShowImportModal(false); } catch (e) { Alert.alert('Erreur', 'JSON invalide'); } }} />
      {dragConfirm && (
        <Modal transparent visible animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Card variant="flat" style={{ width: '100%', padding: 32, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.selected }}>
              <Heading level={4} mono subtitle="Mise à jour routine" style={{ marginBottom: 24 }}>{L.planning.editRoutine}</Heading>
              <Text style={{ fontSize: 14, color: theme.mute, marginBottom: 32, lineHeight: 22 }}>{L.planning.editPrompt}</Text>
              <View style={{ gap: 16 }}>
                <Touch style={{ backgroundColor: theme.selected, height: 64, alignItems: 'center', justifyContent: 'center' }} onPress={() => confirmRoutineUpdate(true)}><Text style={{ fontWeight: Fw.display, color: '#000', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.8, fontFamily: FontMono }}>{L.planning.allOccurrences}</Text></Touch>
                <Touch style={{ backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, height: 64, alignItems: 'center', justifyContent: 'center' }} onPress={() => confirmRoutineUpdate(false)}><Text style={{ fontWeight: Fw.display, color: theme.title, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.8, fontFamily: FontMono }}>{L.planning.onlyThis}</Text></Touch>
                <Touch style={{ height: 48, alignItems: 'center', justifyContent: 'center' }} onPress={() => setDragConfirm(null)}><Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: theme.mute, textTransform: 'uppercase', letterSpacing: 2, fontFamily: FontMono }}>{L.common.cancel}</Text></Touch>
              </View>
            </Card>
          </View>
        </Modal>
      )}
    </View>
  );
}

function EvListSection({ events, categories, onAdd, onAddRt, onEdit }: any) {
  const theme = useTheme();
  return (
    <View style={{ gap: 16 }}>
      {events.map((ev: any) => {
        const evColor = ev.color || categories[ev.category]?.c || theme.title;
        return (
          <Touch key={ev.id} style={{ overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.02)' }} onPress={() => !ev.isRt && onEdit(ev)}>
            <View style={{ width: 3, backgroundColor: evColor }} />
            <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={[sp.rowBetween, { marginBottom: 4 }]}>
                <View style={[sp.row, { gap: 8 }]}>
                  <Clock size={10} color={theme.mute} />
                  <Text style={{ fontFamily: FontMono, fontSize: 10, fontWeight: Fw.value, color: theme.title, letterSpacing: 0.5 }}>{ev.time || '--:--'}</Text>
                </View>
                {ev.isRt
                  ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: theme.selected, backgroundColor: Clr.gold8 }}><Text style={{ fontFamily: FontMono, fontSize: 7, fontWeight: Fw.value, color: theme.selected, letterSpacing: 1.75 }}>ROUTINE</Text></View>
                  : <Text style={{ fontFamily: FontMono, fontSize: 7, fontWeight: Fw.value, color: evColor, letterSpacing: 1.75 }}>{(categories[ev.category]?.l || ev.category || '').toUpperCase()}</Text>
                }
              </View>
              <Text style={{ fontFamily: FontSans, fontSize: 13, fontWeight: Fw.value, color: theme.title, letterSpacing: 0.52, textTransform: 'uppercase' }}>{ev.title}</Text>
            </View>
          </Touch>
        );
      })}
      <View style={[sp.row, { gap: 16, paddingTop: 16 }]}>
        <Touch onPress={onAdd} style={{ flex: 1, backgroundColor: theme.selected, height: 56, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: '#000', textTransform: 'uppercase', letterSpacing: 2, fontFamily: FontMono }}>Nouvel Événement</Text></Touch>
        <Touch onPress={onAddRt} style={{ flex: 1, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, height: 56, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: theme.mute, textTransform: 'uppercase', letterSpacing: 2, fontFamily: FontMono }}>Routine</Text></Touch>
      </View>
    </View>
  );
}

function EventModal({ visible, initial, defaultDate, categories, onClose, onSave }: any) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('perso');
  const [time, setTime] = useState('12:00');
  const [reminder, setReminder] = useState(0);
  React.useEffect(() => { if (visible) { setTitle(initial?.title || ''); setCat(initial?.category || 'perso'); setTime(initial?.time || '12:00'); setReminder(initial?.reminder || 0); } }, [visible, initial]);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View style={[sp.sheet, { backgroundColor: theme.surface }]}>
          <View style={{ width: 48, height: 1, alignSelf: 'center', marginBottom: 24, backgroundColor: theme.border }} />
          <Heading level={2} subtitle="Paramètres du Segment" style={{ alignItems: 'center', marginBottom: 48 }}>PLANIFICATION</Heading>
          <View style={{ gap: 32 }}>
            <View>
              <Text style={[sp.fieldLabel, { color: theme.mute }]}>Identifiant de Mission</Text>
              <TextInput style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white5, padding: 20, color: theme.title, fontWeight: Fw.value, fontSize: 16 }} value={title} onChangeText={setTitle} placeholder="TITRE DE L'OPÉRATION..." placeholderTextColor={theme.mute} />
            </View>
            <View style={[sp.row, { gap: 24, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[sp.fieldLabel, { color: theme.mute }]}>Heure de Lancement</Text>
                <TextInput style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white5, padding: 20, color: theme.title, fontFamily: FontMono, textAlign: 'center', fontSize: 18 }} value={time} onChangeText={setTime} placeholder="12:00" placeholderTextColor={theme.mute} keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[sp.fieldLabel, { color: theme.mute }]}>Anticipation</Text>
                <Touch style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white5, height: 64, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 12, fontWeight: Fw.display, color: theme.selected, textTransform: 'uppercase', letterSpacing: 1.8, fontFamily: FontMono }}>{reminder > 0 ? `${reminder}M` : 'OFF'}</Text></Touch>
              </View>
            </View>
            <View>
              <Text style={[sp.fieldLabel, { color: theme.mute, marginBottom: 16 }]}>Classification Stratégique</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(categories).map(([k, c]: [any, any]) => (
                  <Touch key={k} style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: cat === k ? `${theme.title}4D` : 'transparent', opacity: cat === k ? 1 : 0.4, backgroundColor: cat === k ? 'rgba(255,255,255,0.06)' : theme.surface }} onPress={() => setCat(k)}>
                    <View style={[sp.row, { gap: 8 }]}>
                      <View style={{ width: 8, height: 8, backgroundColor: c.c }} />
                      <Text style={{ fontSize: Fs.xs, fontWeight: Fw.display, color: theme.title, textTransform: 'uppercase', letterSpacing: 1.6, fontFamily: FontMono }}>{c.l}</Text>
                    </View>
                  </Touch>
                ))}
              </View>
            </View>
            <View style={[sp.row, { gap: 16, paddingTop: 16 }]}>
              <Touch onPress={onClose} style={{ flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }}><Text style={{ fontSize: 12, fontWeight: Fw.display, color: theme.mute, textTransform: 'uppercase', letterSpacing: 1.8, fontFamily: FontMono }}>Abandonner</Text></Touch>
              <Touch onPress={() => onSave({ title, date: defaultDate, category: cat, time, reminder })} style={{ flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.selected }}><Text style={{ fontSize: 12, fontWeight: Fw.display, color: '#000', textTransform: 'uppercase', letterSpacing: 1.8, fontFamily: FontMono }}>Initialiser</Text></Touch>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ImportModal({ visible, onClose, onImport }: any) {
  const theme = useTheme();
  const [json, setJson] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
        <View style={[sp.sheet, { backgroundColor: theme.surface }]}>
          <View style={{ width: 48, height: 1, alignSelf: 'center', marginBottom: 24, backgroundColor: theme.border }} />
          <Heading level={2} subtitle="Base de Données Routines" style={{ alignItems: 'center', marginBottom: 48 }}>IMPORTATION</Heading>
          <TextInput style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: Clr.white5, padding: 24, color: theme.title, fontFamily: FontMono, fontSize: 12, marginBottom: 40, minHeight: 200, textAlignVertical: 'top' }} multiline value={json} onChangeText={setJson} placeholder="[{'name': 'Routine'}]" placeholderTextColor={theme.mute} />
          <View style={[sp.row, { gap: 16 }]}>
            <Touch onPress={onClose} style={{ flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white5 }}><Text style={{ fontSize: 12, fontWeight: Fw.display, color: theme.mute, textTransform: 'uppercase', letterSpacing: 1.8, fontFamily: FontMono }}>Annuler</Text></Touch>
            <Touch onPress={() => onImport(json)} style={{ flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.selected }}><Text style={{ fontSize: 12, fontWeight: Fw.display, color: '#000', textTransform: 'uppercase', letterSpacing: 1.8, fontFamily: FontMono }}>Exécuter Import</Text></Touch>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const TYPE_COLOR_IDX: Record<string, number> = {
  sport: 0, nutrition: 1, islam: 2, sommeil: 3,
  mensuration: 4, journal: 5, habitude: 6, tache: 7,
};

function TimelineBar({ item, hourHeight, theme }: { item: TimelineItem; hourHeight: number; theme: any }) {
  const color = (theme.palette as string[])?.[TYPE_COLOR_IDX[item.type] ?? 0] ?? theme.selected;
  const top = (item.startMin! / 60) * hourHeight;
  const heightPx = item.durationMin != null ? (item.durationMin / 60) * hourHeight : hourHeight / 4;
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', left: 2, right: 2, top,
      height: Math.max(heightPx, 12),
      backgroundColor: `${color}14`, borderLeftWidth: 3, borderLeftColor: color,
      borderRadius: 4, padding: 4,
    }}>
      <Text style={{ fontSize: 9, color: theme.title, fontFamily: FontMono, opacity: 0.8 }} numberOfLines={1}>{item.title}</Text>
    </View>
  );
}

function SelDaySection({ items, onAdd, onAddRt }: { items: TimelineItem[]; onAdd: () => void; onAddRt: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {items.length === 0 ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ fontFamily: FontMono, fontSize: Fs.xs, color: theme.mute, letterSpacing: 1.8, textTransform: 'uppercase' }}>Aucune activité</Text>
        </View>
      ) : (
        items.map(item => <SelDayItem key={item.id} item={item} />)
      )}
      <View style={[sp.row, { gap: 16, paddingTop: 8 }]}>
        <Touch onPress={onAdd} style={{ flex: 1, backgroundColor: theme.selected, height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: '#000', textTransform: 'uppercase', letterSpacing: 2, fontFamily: FontMono }}>Nouvel Événement</Text>
        </Touch>
        <Touch onPress={onAddRt} style={{ flex: 1, backgroundColor: Clr.white5, borderWidth: 1, borderColor: Clr.white10, height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: Fs.md, fontWeight: Fw.display, color: theme.mute, textTransform: 'uppercase', letterSpacing: 2, fontFamily: FontMono }}>Routine</Text>
        </Touch>
      </View>
    </View>
  );
}

function SelDayItem({ item }: { item: TimelineItem }) {
  const theme = useTheme();
  const time = item.startMin != null
    ? `${String(Math.floor(item.startMin / 60)).padStart(2, '0')}:${String(item.startMin % 60).padStart(2, '0')}`
    : '--:--';
  const color = (theme.palette as string[])?.[TYPE_COLOR_IDX[item.type] ?? 0] ?? theme.selected;
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
      <View style={{ width: 3, backgroundColor: color }} />
      <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Clock size={10} color={theme.mute} />
            <Text style={{ fontFamily: FontMono, fontSize: 10, fontWeight: Fw.value, color: theme.title, letterSpacing: 0.5 }}>{time}</Text>
          </View>
          <Text style={{ fontFamily: FontMono, fontSize: 7, fontWeight: Fw.value, color, letterSpacing: 1.75 }}>
            {(TASK_TYPE_META[item.type]?.label ?? item.type).toUpperCase()}
          </Text>
        </View>
        <Text style={{ fontFamily: FontSans, fontSize: 13, fontWeight: Fw.value, color: theme.title, letterSpacing: 0.52, textTransform: 'uppercase' }} numberOfLines={1}>{item.title}</Text>
        {item.subtitle ? <Text style={{ fontFamily: FontMono, fontSize: 8, color: theme.mute, letterSpacing: 0.8, marginTop: 2 }}>{item.subtitle}</Text> : null}
      </View>
    </View>
  );
}

const sp = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 32, height: 32, backgroundColor: Clr.white5, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  sm: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  field: { borderWidth: 1, borderColor: Clr.white5, paddingHorizontal: 20, paddingVertical: 16, fontSize: 14, fontWeight: Fw.value },
  fieldLabel: { fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.md_02, marginLeft: 4, marginBottom: 12, fontFamily: FontMono },
  sheet: { padding: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: Clr.white10, width: '100%', maxWidth: 512, alignSelf: 'center' },
});
