import React, { useMemo, useState, useEffect } from 'react';
import { View, Dimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, G, Line } from 'react-native-svg';
import {
  startOfDay, endOfDay, subDays,
  parseISO, format, eachDayOfInterval
} from 'date-fns';
import { useTheme } from '../hooks/useTheme';
import { ds } from '../utils/storage';
import { LocalAIService } from '../services/localAIService';
import { MealService } from '../services/mealService';
import { SleepService } from '../services/sleepService';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useMealStore } from '../hooks/useMealStore';
import { usePrayerStore } from '../hooks/usePrayerStore';
import { PageWrapper, AnimatePresence } from '../components/Animated';
import { Activity, Dumbbell, Ruler, Flame, TrendingUp, Moon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { BilanZen } from '../components/BilanZen';
import { motion } from 'motion/react';
import type { SleepEntryLatest } from '../data/schemas/sleep/sleepEntry';


const TABS = [
  { id: 'sport', label: 'SPORT', Icon: Dumbbell },
  { id: 'nutrition', label: 'NUTRITION', Icon: Flame },
  { id: 'scan', label: 'SCAN', Icon: Ruler },
  { id: 'sommeil', label: 'SOMMEIL', Icon: Moon },
  { id: 'correla', label: 'CORRÉLA.', Icon: TrendingUp },
];

const RANGES = [
  { id: 'week', label: '07D' },
  { id: 'month', label: '30D' },
  { id: 'quarter', label: '90D' },
];

const SvgLine = Line as any;
const SvgRect = Rect as any;
const SvgG = G as any;

export default function AnalyseScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const today = ds(new Date());
  const [tab, setTab] = useState('activity');
  const [range, setRange] = useState('week');
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [mealsByDay, setMealsByDay] = useState<Array<{ label: string; kcal: number; p: number }>>([]);
  const [mealsLoading, setMealsLoading] = useState(false);

  const [sleepEntries, setSleepEntries] = useState<SleepEntryLatest[]>([]);
  const workoutStore = useWorkoutStore();
  const measureStore = useMeasurementStore();
  const prayerStore = usePrayerStore(today);
  const mealStoreToday = useMealStore(today);

  useEffect(() => {
    SleepService.getAll().then(setSleepEntries).catch(() => {});
  }, []);

  const interval = useMemo(() => {
    const now = new Date();
    const end = endOfDay(now);
    let start = startOfDay(subDays(now, 6));
    if (range === 'month') start = startOfDay(subDays(now, 29));
    if (range === 'quarter') start = startOfDay(subDays(now, 89));
    return { start, end };
  }, [range]);

  const muscuStats = useMemo(() => {
    return workoutStore.sessions
      .filter(s => {
        const d = parseISO(s.date);
        return d >= interval.start && d <= interval.end;
      })
      .map(s => {
        let weight = 0; let sets = 0;
        s.exercises.forEach((ex: any) => {
          (ex.sets as any[] | undefined ?? []).forEach((set: any) => {
            weight += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
            sets += 1;
          });
        });
        return { label: format(parseISO(s.date), 'dd/MM'), weight, sets };
      });
  }, [workoutStore.sessions, interval]);

  const sleepStats = useMemo(() => {
    const filtered = sleepEntries.filter(e => {
      const d = parseISO(e.date);
      return d >= interval.start && d <= interval.end;
    }).sort((a, b) => a.date.localeCompare(b.date));
    const avgDuration = filtered.length > 0
      ? filtered.reduce((s, e) => s + e.durationH, 0) / filtered.length : 0;
    const avgQuality = filtered.length > 0
      ? filtered.reduce((s, e) => s + e.quality, 0) / filtered.length : 0;
    return {
      entries: filtered,
      avgDuration,
      avgQuality,
      data: filtered.map(e => ({ label: format(parseISO(e.date), 'dd/MM'), durationH: e.durationH, quality: e.quality })),
    };
  }, [sleepEntries, interval]);

  useEffect(() => {
    let active = true;
    setMealsLoading(true);
    const days = eachDayOfInterval(interval);
    Promise.all(
      days.map(async day => {
        const meals = await MealService.getByDate(ds(day));
        const tot = MealService.totals(meals);
        return { label: format(day, 'dd/MM'), kcal: tot.kcal, p: tot.p };
      })
    ).then(results => {
      if (!active) return;
      setMealsByDay(results);
      setMealsLoading(false);
    }).catch(() => { if (active) setMealsLoading(false); });
    return () => { active = false; };
  }, [interval]);

  // Courbe poids — restreinte à l'intervalle sélectionné
  const weightTrend = useMemo(() => {
    return measureStore.history
      .filter(m => {
        const d = parseISO(m.date);
        return d >= interval.start && d <= interval.end;
      })
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(m => ({ label: format(parseISO(m.date), 'dd/MM'), weight: m.weight }));
  }, [measureStore.history, interval]);

  const nutritionStats = useMemo(() => {
    let avgKcal = 0; let avgP = 0; let count = 0;
    mealsByDay.forEach(d => {
      if (d.kcal > 0) { avgKcal += d.kcal; avgP += d.p; count++; }
    });
    return {
      data: mealsByDay,
      avgKcal: count > 0 ? Math.round(avgKcal / count) : 0,
      avgP: count > 0 ? Math.round(avgP / count) : 0,
      count,
    };
  }, [mealsByDay]);

  useEffect(() => {
    const sorted = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted.at(-1) ?? null;
    const prev = sorted.at(-2) ?? null;
    const weightTrend = latest && prev
      ? latest.weight > prev.weight ? 'up' : latest.weight < prev.weight ? 'down' : 'stable'
      : null;
    setAiLoading(true);
    LocalAIService.generateZenSummary({
      kcalToday: mealsByDay.at(-1)?.kcal,
      prayersDone: prayerStore.doneCount,
      prayersTotal: prayerStore.total,
      lastWorkoutName: workoutStore.sessions.at(-1)?.name ?? null,
      weightKg: latest?.weight ?? null,
      weightTrend,
    }).then(s => { setAiSummary(s); setAiLoading(false); });
  }, [measureStore.history, mealsByDay, workoutStore.sessions, prayerStore.doneCount]);

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        <div className="px-6 pt-4 pb-4">
           <Heading level={1} subtitle="Intelligence de Situation">ANALYSE TACTIQUE</Heading>

           <div className="mt-6 border-l-2 border-awan-gold/40 pl-4">
             <span className="block text-awan-md font-bold text-awan-tx leading-relaxed italic">
               « L'avenir s'esquisse en encrant aujourd'hui dans les lignes du passé. »
             </span>
             <span className="block awan-label text-awan-tx-mute mt-2">— Devise AWAN</span>
           </div>

           <div className="mt-8">
             <BilanZen
                summary={aiSummary}
                loading={aiLoading}
                onRefresh={() => {
                  setAiLoading(true);
                  LocalAIService.generateZenSummary({
                    kcalToday: mealsByDay.at(-1)?.kcal,
                    prayersDone: prayerStore.doneCount,
                    prayersTotal: prayerStore.total,
                    lastWorkoutName: workoutStore.sessions.at(-1)?.name ?? null,
                    weightKg: measureStore.history.at(-1)?.weight ?? null,
                  }).then(s => { setAiSummary(s); setAiLoading(false); });
                }}
             />
           </div>
        </div>

        {/* Tab Control */}
        <div className="px-6 mb-8">
           <div className="border-b border-white/10 flex flex-row">
              {TABS.map(({ id, label, Icon }) => (
                <Touch
                  key={id}
                  className={`flex-1 py-3 items-center justify-center border-b-2 transition-all ${tab === id ? 'border-awan-gold' : 'border-transparent opacity-40'}`}
                  onPress={() => setTab(id)}
                >
                  <Icon size={18} className={tab === id ? 'text-awan-gold' : 'text-awan-tx-mute'} />
                  <span className={`text-awan-xs font-black uppercase tracking-widest mt-1 ${tab === id ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>{label}</span>
                </Touch>
              ))}
           </div>
        </div>

        {/* Range Control */}
        <div className="px-6 mb-8 flex flex-row justify-center gap-3">
           {RANGES.map(r => (
             <Touch 
               key={r.id} 
               className={`px-6 py-1.5 border transition-all ${range === r.id ? 'bg-awan-gold/20 border-awan-gold' : 'border-white/10'}`}
               onPress={() => setRange(r.id)}
             >
               <span className={`text-awan-md font-black tracking-[0.2em] ${range === r.id ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>{r.label}</span>
             </Touch>
           ))}
        </div>

        <AnimatePresence mode="wait">
           <motion.div 
             key={tab + range}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="px-6"
           >
             {tab === 'sport' && (
                <div className="space-y-8">
                   {workoutStore.loading ? (
                     <LoadingState label="Chargement des séances..." />
                   ) : muscuStats.length === 0 ? (
                     <EmptyState Icon={Dumbbell} label="Aucune séance sur la période" />
                   ) : (
                     <>
                       <Card className="p-6" variant="flat">
                          <Heading level={4} mono subtitle="Volume total soulevé">TONNAGE (KG × REPS)</Heading>
                          <div className="h-[200px] mt-6">
                             <BarChart data={muscuStats} dataKey="weight" color={theme.title} />
                          </div>
                       </Card>
                       <Card className="p-6" variant="flat">
                          <Heading level={4} mono subtitle="Densité opérative">SÉRIES COMPLÉTÉES</Heading>
                          <div className="h-[200px] mt-6">
                             <BarChart data={muscuStats} dataKey="sets" color={theme.title} />
                          </div>
                       </Card>
                       <div className="grid grid-cols-2 gap-4">
                         <Card className="p-6" variant="flat">
                           <span className="awan-label text-awan-tx-mute mb-2 block">SÉANCES</span>
                           <span className="text-3xl font-black text-awan-gold font-mono">{muscuStats.length}</span>
                           <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">sur la période</span>
                         </Card>
                         <Card className="p-6" variant="flat">
                           <span className="awan-label text-awan-tx-mute mb-2 block">TONNAGE TOTAL</span>
                           <span className="text-3xl font-black text-awan-tx font-mono">{Math.round(muscuStats.reduce((s, d) => s + d.weight, 0) / 1000)}</span>
                           <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">tonnes soulevées</span>
                         </Card>
                       </div>
                     </>
                   )}
                </div>
             )}

             {tab === 'nutrition' && (
                <div className="space-y-8">
                   {mealsLoading ? (
                     <div style={{ height: 120, background: 'var(--color-awan-surface)', borderRadius: 0, opacity: 0.5 }} />
                   ) : nutritionStats.count === 0 && mealsByDay.length > 0 ? (
                     <EmptyState Icon={Flame} label="Aucun repas enregistré sur la période" />
                   ) : (
                     <>
                       <Card className="p-6 bg-white/5 border-white/5" variant="flat">
                         <span className="awan-label text-awan-tx-mute mb-2 block">KCAL · AUJOURD'HUI</span>
                         <div className="flex items-baseline gap-2">
                           <span className="text-3xl font-mono font-bold text-awan-gold tracking-tighter">
                             {mealStoreToday.totals.kcal || '—'}
                           </span>
                           {mealStoreToday.totals.kcal > 0 && (
                             <span className="text-awan-md font-mono text-awan-tx-mute">
                               · P {mealStoreToday.totals.p}g · G {mealStoreToday.totals.c}g · L {mealStoreToday.totals.f}g
                             </span>
                           )}
                         </div>
                       </Card>
                       <div className="grid grid-cols-2 gap-4">
                          <Card className="p-6 bg-white/5 border-white/5" variant="flat">
                             <div className="flex flex-row items-center gap-2 mb-3">
                                <Flame size={12} className="text-awan-gold" />
                                <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase">Moy. Kcal</span>
                             </div>
                             <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">{nutritionStats.avgKcal || '—'}</span>
                          </Card>
                          <Card className="p-6 bg-white/5 border-white/5" variant="flat">
                             <div className="flex flex-row items-center gap-2 mb-3">
                                <Activity size={12} className="text-awan-status-error" />
                                <span className="text-awan-sm font-black text-awan-status-error tracking-widest uppercase">Moy. Prot</span>
                             </div>
                             <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">
                               {nutritionStats.avgP || '—'}{nutritionStats.avgP > 0 && <span className="text-sm ml-1">G</span>}
                             </span>
                          </Card>
                       </div>
                       <Card className="p-6 bg-white/5 border-white/5" variant="flat">
                          <Heading level={4} mono subtitle="Énergie">FLUX CALORIQUE</Heading>
                          <div className="h-[200px] mt-6">
                             <BarChart data={nutritionStats.data} dataKey="kcal" color={theme.title} />
                          </div>
                       </Card>
                     </>
                   )}
                </div>
             )}

             {tab === 'scan' && (
                <div className="space-y-4">
                  {measureStore.loading ? (
                    <LoadingState label="Chargement des mesures..." />
                  ) : measureStore.history.length === 0 ? (
                    <EmptyState Icon={Ruler} label="Aucune mesure enregistrée" />
                  ) : (
                    <>
                    {weightTrend.length > 1 && (
                      <Card className="p-6" variant="flat">
                        <Heading level={4} mono subtitle="Trajectoire biométrique">COURBE POIDS</Heading>
                        <div className="h-[200px] mt-6">
                          <BarChart data={weightTrend} dataKey="weight" color={theme.title} />
                        </div>
                      </Card>
                    )}
                    {measureStore.history.slice().reverse().slice(0, 10).map((m, i) => (
                      <Card key={i} className="p-5" variant="flat">
                        <div className="flex flex-row items-center justify-between mb-3">
                          <span className="text-awan-sm font-mono text-awan-gold uppercase tracking-widest">{m.date}</span>
                          {m.body_fat_pct != null && (
                            <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest">{m.body_fat_pct}% MG</span>
                          )}
                        </div>
                        <div className="flex flex-row items-end gap-6">
                          <div>
                            <span className="text-awan-sm font-black text-awan-tx-mute uppercase block mb-1">Poids</span>
                            <span className="text-3xl font-black text-awan-gold tabular-nums font-mono">{m.weight}<span className="text-sm ml-1 opacity-50">KG</span></span>
                          </div>
                          {m.bpm_rest != null && m.bpm_rest > 0 && (
                            <div>
                              <span className="text-awan-sm font-black text-awan-tx-mute uppercase block mb-1">BPM repos</span>
                              <span className="text-2xl font-black text-awan-tx tabular-nums font-mono">{m.bpm_rest}</span>
                            </div>
                          )}
                          {Object.entries(m.measurements).slice(0, 2).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-awan-sm font-black text-awan-tx-mute uppercase block mb-1">{k}</span>
                              <span className="text-2xl font-black text-awan-tx tabular-nums font-mono">{v}<span className="text-sm ml-0.5 opacity-50">cm</span></span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                    </>
                  )}
                </div>
             )}

             {tab === 'sommeil' && (
                <div className="space-y-6">
                  {sleepStats.entries.length === 0 ? (
                    <EmptyState Icon={Moon} label="Aucun sommeil enregistré sur la période" />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="p-6" variant="flat">
                          <span className="awan-label text-awan-tx-mute mb-2 block">MOY. DURÉE</span>
                          <span className="text-3xl font-black text-awan-gold font-mono">{sleepStats.avgDuration.toFixed(1)}</span>
                          <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">heures/nuit · rec. 7-9h</span>
                        </Card>
                        <Card className="p-6" variant="flat">
                          <span className="awan-label text-awan-tx-mute mb-2 block">MOY. QUALITÉ</span>
                          <span className="text-3xl font-black text-awan-tx font-mono">{sleepStats.avgQuality.toFixed(1)}</span>
                          <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">/ 5 · Mander 2017</span>
                        </Card>
                      </div>
                      <Card className="p-6" variant="flat">
                        <Heading level={4} mono subtitle="Durée nuit">COURBE SOMMEIL</Heading>
                        <div className="h-[200px] mt-6">
                          <BarChart data={sleepStats.data} dataKey="durationH" color={theme.title} />
                        </div>
                      </Card>
                      {sleepStats.entries.slice().reverse().slice(0, 7).map((e, i) => (
                        <Card key={i} className="p-4" variant="flat">
                          <div className="flex flex-row items-center justify-between">
                            <span className="text-awan-sm font-mono text-awan-gold uppercase tracking-widest">{e.date}</span>
                            <div className="flex flex-row items-center gap-4">
                              <span className="text-awan-md font-black text-awan-tx font-mono">{e.durationH.toFixed(1)}<span className="text-sm ml-1 opacity-50">H</span></span>
                              <span className="text-awan-md font-black text-awan-tx-mute">{'★'.repeat(e.quality)}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
             )}
             {tab === 'correla' && (() => {
               // Build a 30-day timeline with workout flags + weight + kcal (today only available)
               const last30 = Array.from({ length: 30 }).map((_, i) => {
                 const d = new Date(); d.setDate(d.getDate() - (29 - i));
                 const str = ds(d);
                 const hasWorkout = workoutStore.sessions.some((s: any) => (s.date ?? ds(new Date(s.startTime ?? 0))) === str);
                 const measure = measureStore.history.find(m => m.date === str);
                 return { str, hasWorkout, weight: measure?.weight ?? null };
               });

               // Pearson correlation: workouts vs weight change
               const weightPoints = last30.filter(d => d.weight !== null);
               const workoutDays = last30.filter(d => d.hasWorkout).length;
               const avgWeight = weightPoints.length > 0
                 ? weightPoints.reduce((s, d) => s + (d.weight ?? 0), 0) / weightPoints.length
                 : null;
               const latestW = measureStore.history.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
               const oldestW = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date))[0];
               const weightDelta = (latestW && oldestW && latestW !== oldestW)
                 ? latestW.weight - oldestW.weight : null;

               // Sessions efficiency: sessions per week this month
               const sessionsPerWeek = (workoutDays / 30) * 7;

               return (
                 <div className="space-y-6">
                   <span className="text-awan-xs font-black text-awan-tx-mute tracking-[0.3em] uppercase block">CORRÉLATIONS INTER-MODULES · 30 JOURS</span>

                   {/* Sport ↔ Poids timeline */}
                   <Card className="p-5 bg-white/5 border-white/5" variant="flat">
                     <span className="awan-label text-awan-gold mb-4 block">SPORT × POIDS</span>
                     <div className="flex flex-row gap-0.5 h-16 items-end mb-2">
                       {last30.map((d, i) => (
                         <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                           {d.weight && avgWeight ? (
                             <div
                               className="w-full"
                               style={{
                                 height: `${Math.max(4, Math.min(48, ((d.weight / avgWeight) * 32)))}px`,
                                 backgroundColor: d.hasWorkout ? 'var(--color-awan-gold)' : 'var(--color-awan-border)',
                               }}
                             />
                           ) : (
                             <div className="w-full h-1" style={{ backgroundColor: d.hasWorkout ? 'var(--color-awan-gold)' : 'transparent' }} />
                           )}
                         </div>
                       ))}
                     </div>
                     <div className="flex flex-row gap-4 mt-3">
                       <div className="flex flex-row items-center gap-1.5">
                         <div className="w-3 h-3" style={{ backgroundColor: 'var(--color-awan-gold)' }} />
                         <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">Séance</span>
                       </div>
                       <div className="flex flex-row items-center gap-1.5">
                         <div className="w-3 h-3 bg-white/12" />
                         <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest">Repos</span>
                       </div>
                     </div>
                   </Card>

                   {/* Metrics grid */}
                   <div className="grid grid-cols-2 gap-3">
                     <Card className="p-5 bg-white/5 border-white/5" variant="flat">
                       <span className="awan-label text-awan-tx-mute mb-2 block">FRÉQUENCE</span>
                       <span className="text-3xl font-black text-awan-gold font-mono">{sessionsPerWeek.toFixed(1)}</span>
                       <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">séances/sem · 30j</span>
                     </Card>
                     <Card className="p-5 bg-white/5 border-white/5" variant="flat">
                       <span className="awan-label text-awan-tx-mute mb-2 block">POIDS · DELTA</span>
                       <span className={`text-3xl font-black font-mono ${weightDelta == null ? 'text-awan-tx-mute' : weightDelta < 0 ? 'text-awan-status-ok' : weightDelta > 0 ? 'text-awan-status-warn' : 'text-awan-tx'}`}>
                         {weightDelta != null ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}` : '—'}
                       </span>
                       <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">kg · total historique</span>
                     </Card>
                     <Card className="p-5 bg-white/5 border-white/5" variant="flat">
                       <span className="awan-label text-awan-tx-mute mb-2 block">JOURS SPORT</span>
                       <span className="text-3xl font-black text-awan-tx font-mono">{workoutDays}<span className="text-sm ml-1 opacity-50">/30</span></span>
                       <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">jours actifs</span>
                     </Card>
                     <Card className="p-5 bg-white/5 border-white/5" variant="flat">
                       <span className="awan-label text-awan-tx-mute mb-2 block">KCAL JOUR</span>
                       <span className="text-3xl font-black text-awan-tx font-mono">{mealStoreToday.totals.kcal || '—'}</span>
                       <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest mt-1 block">aujourd'hui</span>
                     </Card>
                   </div>

                   {/* Insights */}
                   <Card className="p-5 bg-awan-gold/5 border-awan-gold/20" variant="flat">
                     <span className="awan-label text-awan-gold mb-3 block">INSIGHTS</span>
                     <div className="space-y-2">
                       {sessionsPerWeek < 2 && (
                         <span className="text-awan-md text-awan-tx-dim block">· Fréquence en dessous des recommandations OMS (150 min/sem)</span>
                       )}
                       {sessionsPerWeek >= 4 && (
                         <span className="text-awan-md text-awan-status-ok block">· Excellente fréquence d'entraînement</span>
                       )}
                       {weightDelta != null && weightDelta < -2 && sessionsPerWeek > 2 && (
                         <span className="text-awan-md text-awan-status-warn block">· Perte de poids rapide avec entraînement intensif — vérifier l'apport protéique</span>
                       )}
                       {weightDelta != null && weightDelta > 2 && sessionsPerWeek < 2 && (
                         <span className="text-awan-md text-awan-status-warn block">· Prise de masse sans entraînement suffisant — augmenter la fréquence</span>
                       )}
                       {sessionsPerWeek >= 2 && weightDelta != null && Math.abs(weightDelta) <= 1 && (
                         <span className="text-awan-md text-awan-status-ok block">· Équilibre sport/poids stable — maintien de la composition corporelle</span>
                       )}
                       {workoutDays === 0 && weightPoints.length === 0 && (
                         <span className="text-awan-md text-awan-tx-mute block">· Pas de données suffisantes — continuez à enregistrer vos séances et mesures</span>
                       )}
                     </div>
                   </Card>
                 </div>
               );
             })()}
           </motion.div>
        </AnimatePresence>
      </ScrollView>
    </PageWrapper>
  );
}

function BarChart({ data, dataKey, color }: { data: any[], dataKey: string, color: string }) {
  const width = Dimensions.get('window').width - 88;
  const height = 180;
  const padding = 20;
  const barWidth = Math.max(4, Math.min(24, (width - padding * 2) / Math.max(data.length, 1) - 6));
  const maxVal = Math.max(...data.map(d => d[dataKey]), 1);
  
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {[0, 0.5, 1].map((v, i) => (
          <SvgLine 
            key={i}
            x1={0}
            y1={height - padding - v * (height - padding * 2)}
            x2={width}
            y2={height - padding - v * (height - padding * 2)}
            stroke="var(--color-awan-border-soft)"
            strokeWidth="1"
          />
        ))}

        {data.map((d, i) => {
          const barHeight = (d[dataKey] / maxVal) * (height - padding * 2);
          const x = i * (width / data.length) + (width / data.length - barWidth) / 2;
          const y = height - padding - barHeight;
          return (
            <SvgG key={i}>
              <Rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx={2} />
              {d[dataKey] > 0 && (
                <Rect x={x} y={y} width={barWidth} height={2} fill={color} opacity={0.5} />
              )}
            </SvgG>
          );
        })}
      </Svg>
    </View>
  );
}


function EmptyState({ Icon, label }: { Icon: any, label: string }) {
  return (
    <div className="flex flex-col items-center py-20 opacity-30">
      <Icon size={48} className="text-awan-tx-mute mb-4" />
      <span className="text-xs font-bold uppercase tracking-widest text-awan-tx-mute">{label}</span>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-20 opacity-30">
      <div className="w-8 h-8 border-2 border-awan-gold border-t-transparent animate-spin mb-4" />
      <span className="text-awan-md font-black uppercase tracking-widest text-awan-tx-mute">{label}</span>
    </div>
  );
}

