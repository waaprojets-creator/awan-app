import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { ChevronRight, Activity, Utensils, Ruler, Brain, Moon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Touch } from '../components/ui/Touch';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { useMealStore } from '../hooks/useMealStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useSleepStore } from '../hooks/useSleepStore';
import { useCoach } from '../hooks/useCoach';
import { ds } from '../utils/storage';
import { sessionsThisWeek } from '../hooks/useAwanScore';
import { getAdviceText } from '../constants/coachAdvice';
import { DEFAULT_KCAL_TARGET } from '../constants/app';
import { safeStorage } from '../utils/safeStorage';
import type { Severity } from '../data/schemas/coach/rule';
import type { Advice } from '../data/schemas/coach/assessment';

function BodySilhouette() {
 const s = 'var(--color-awan-tx-mute)';
 return (
 <svg width="48" height="96" viewBox="0 0 48 96" fill="none">
 <ellipse cx="24" cy="9" rx="7" ry="8" stroke={s} strokeWidth="1" opacity="0.45"/>
 <rect x="21" y="16" width="6" height="4" rx="1" stroke={s} strokeWidth="0.8" opacity="0.35"/>
 <path d="M 10 22 Q 18 18 24 19 Q 30 18 38 22 L 37 50 Q 30 54 24 54 Q 18 54 11 50 Z" stroke={s} strokeWidth="1" fill="none" opacity="0.4"/>
 <path d="M 10 22 L 3 44 L 6 46 L 13 24" stroke={s} strokeWidth="0.8" opacity="0.35" strokeLinejoin="round"/>
 <path d="M 38 22 L 45 44 L 42 46 L 35 24" stroke={s} strokeWidth="0.8" opacity="0.35" strokeLinejoin="round"/>
 <path d="M 17 54 L 15 82 L 19 82 L 22 54" stroke={s} strokeWidth="0.9" opacity="0.4"/>
 <path d="M 31 54 L 33 82 L 29 82 L 26 54" stroke={s} strokeWidth="0.9" opacity="0.4"/>
 </svg>
 );
}

const COACH_COLOR: Record<Severity, string> = {
 info: 'var(--color-awan-gold)',
 good: 'var(--color-awan-status-ok)',
 warn: 'var(--color-awan-status-warn)',
 alert: 'var(--color-awan-status-error)',
};

export default function SanteScreen({ navigate }: any) {
 const today = ds(new Date());
 const workoutStore = useWorkoutStore();
 const mealStore = useMealStore(today);
 const measureStore = useMeasurementStore();
 const sleepStore = useSleepStore();
 const { assessments: coachAssessments } = useCoach(today);

 const KCAL_TARGET = useMemo(() => {
 try {
 const profile = JSON.parse(safeStorage.get('awan.nutrition.profile') ?? '{}');
 return typeof profile.targetKcal === 'number' ? profile.targetKcal : DEFAULT_KCAL_TARGET;
 } catch { return DEFAULT_KCAL_TARGET; }
 }, []);

 const sessCount = sessionsThisWeek(workoutStore.sessions as Array<{ date?: string; startTime?: number }>);

 // Tendance sport : sessions cette semaine vs semaine précédente
 const sessCountPrevWeek = useMemo(() => {
   const now = Date.now();
   const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
   const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
   return (workoutStore.sessions as Array<{ startTime?: number }>)
     .filter(s => { const t = s.startTime ?? 0; return t >= twoWeeksAgo && t < oneWeekAgo; }).length;
 }, [workoutStore.sessions]);
 const sportDelta = sessCount - sessCountPrevWeek;

 const lastSession = useMemo(() =>
 [...(workoutStore.sessions as Array<{ startTime?: number }>)]
 .sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))[0],
 [workoutStore.sessions]);

 const daysSince = lastSession?.startTime
 ? Math.floor((Date.now() - (lastSession.startTime as number)) / 86_400_000)
 : null;

 const kcal = mealStore.totals.kcal;
 const kcalPct = Math.min(100, Math.round((kcal / KCAL_TARGET) * 100));

 const latestMeasure = measureStore.history
 .slice()
 .sort((a, b) => a.date.localeCompare(b.date))
 .at(-1);

 // Tendance poids : delta 7 jours
 const weightDelta = useMemo(() => {
   const sorted = measureStore.history.filter(e => e.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
   if (sorted.length < 2) return null;
   const last = sorted.at(-1)!;
   const sevenDaysAgo = new Date(last.date); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
   const sevenStr = sevenDaysAgo.toISOString().slice(0, 10);
   const baseline = [...sorted].reverse().find(e => e.date <= sevenStr);
   if (!baseline) return null;
   return last.weight - baseline.weight;
 }, [measureStore.history]);

 const topAdvice = useMemo<Advice | null>(() => {
 const order: Record<Severity, number> = { alert: 0, warn: 1, good: 2, info: 3 };
 const all: Advice[] = coachAssessments.flatMap((a) => a.advices);
 if (all.length === 0) return null;
 return [...all].sort((a, b) => order[a.severity] - order[b.severity])[0] ?? null;
 }, [coachAssessments]);

 return (
 <ScrollView
 style={{ flex: 1, width: '100%', maxWidth: '100%' }}
 contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
 showsVerticalScrollIndicator={false}
 >
 <ScreenHeader tag="SANTÉ" title="SANTÉ" />

 {/* SPORT */}
 <Touch onPress={() => navigate('Sport')} className="mb-4 block">
 <Card className="p-5 bg-white/3 border-white/5" variant="flat">
 <div className="flex flex-row justify-between items-center mb-4">
 <div className="flex flex-row items-center gap-3">
 <div className="w-8 h-8 bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20">
 <Activity size={15} className="text-awan-gold" />
 </div>
 <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase">SPORT</span>
 </div>
 <ChevronRight size={16} className="text-awan-tx-mute" />
 </div>
 <div className="flex flex-row gap-8 items-end">
 <div>
 <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest block mb-1">SÉANCES / SEM</span>
 <div className="flex flex-row items-baseline gap-2">
   <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">{sessCount}</span>
   {sportDelta !== 0 && (
     <span className="text-awan-sm font-black font-mono" style={{ color: sportDelta > 0 ? 'var(--color-awan-status-ok)' : 'var(--color-awan-status-error)' }}>
       {sportDelta > 0 ? '▲' : '▼'} {Math.abs(sportDelta)} vs S-1
     </span>
   )}
 </div>
 </div>
 {daysSince !== null && (
 <div>
 <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest block mb-1">DERNIÈRE SÉANCE</span>
 <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">
 {daysSince === 0 ? "AUJOURD'HUI" : `J-${daysSince}`}
 </span>
 </div>
 )}
 </div>
 {sessCount > 0 && (
 <div className="mt-3 h-0.5 bg-white/5 overflow-hidden">
 <div className="h-full bg-awan-gold " style={{ width: `${Math.min(100, sessCount * 25)}%` }} />
 </div>
 )}
 </Card>
 </Touch>

 {/* NUTRITION */}
 <Touch onPress={() => navigate('Nutrition')} className="mb-4 block">
 <Card className="p-5 bg-white/3 border-white/5" variant="flat">
 <div className="flex flex-row justify-between items-center mb-4">
 <div className="flex flex-row items-center gap-3">
 <div className="w-8 h-8 bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20">
 <Utensils size={15} className="text-awan-gold" />
 </div>
 <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase">NUTRITION</span>
 </div>
 <ChevronRight size={16} className="text-awan-tx-mute" />
 </div>
 <div className="flex flex-row gap-6 flex-wrap">
 <div>
 <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest block mb-1">KCAL</span>
 <span className="text-3xl font-black text-awan-tx font-mono tracking-tighter">
 {kcal}<span className="text-xs ml-1 opacity-50" style={{ color: 'var(--color-awan-gold)' }}>/{KCAL_TARGET}</span>
 </span>
 </div>
 {(['p', 'c', 'f'] as const).map(m => (
 <div key={m}>
 <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest block mb-1">
 {m === 'p' ? 'PROT' : m === 'c' ? 'GLUC' : 'LIP'}
 </span>
 <span className="text-2xl font-black text-awan-tx font-mono">
 {mealStore.totals[m]}<span className="text-awan-md ml-0.5 opacity-50" style={{ color: 'var(--color-awan-gold)' }}>g</span>
 </span>
 </div>
 ))}
 </div>
 {kcal > 0 && (
 <div className="mt-3 h-0.5 bg-white/5 overflow-hidden">
 <div className={`h-full transition-all ${kcalPct >= 90 && kcalPct <= 110 ? 'bg-awan-status-ok' : 'bg-awan-gold'}`}
 style={{ width: `${kcalPct}%` }} />
 </div>
 )}
 </Card>
 </Touch>

 {/* MENSURATION */}
 <Touch onPress={() => navigate('Mensuration')} className="mb-4 block">
 <Card className="p-5 bg-white/3 border-white/5" variant="flat">
 <div className="flex flex-row justify-between items-center mb-4">
 <div className="flex flex-row items-center gap-3">
 <div className="w-8 h-8 bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20">
 <Ruler size={15} className="text-awan-gold" />
 </div>
 <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase">MENSURATION</span>
 </div>
 <ChevronRight size={16} className="text-awan-tx-mute" />
 </div>
 <div className="flex flex-row gap-6 items-center">
 <BodySilhouette />
 <div className="flex flex-col gap-3 flex-1">
 {latestMeasure ? (
 <>
 <div>
 <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest block mb-0.5">POIDS</span>
 <div className="flex flex-row items-baseline gap-2">
   <span className="text-2xl font-black text-awan-tx font-mono tracking-tighter">
     {latestMeasure.weight}<span className="text-xs ml-1 text-awan-gold">kg</span>
   </span>
   {weightDelta !== null && (
     <span className="text-awan-sm font-black font-mono" style={{ color: weightDelta < 0 ? 'var(--color-awan-status-ok)' : weightDelta > 0 ? 'var(--color-awan-status-warn)' : 'var(--color-awan-tx-mute)' }}>
       {weightDelta > 0 ? '▲' : weightDelta < 0 ? '▼' : '–'} {Math.abs(weightDelta).toFixed(1)} kg/sem
     </span>
   )}
 </div>
 </div>
 {latestMeasure.body_fat_pct > 0 && (
 <div>
 <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest block mb-0.5">MASSE GRASSE</span>
 <span className="text-2xl font-black text-awan-tx font-mono tracking-tighter">
 {latestMeasure.body_fat_pct.toFixed(1)}<span className="text-xs ml-1 text-awan-gold">%</span>
 </span>
 </div>
 )}
 {latestMeasure.bpm_rest > 0 && (
 <div>
 <span className="text-awan-xs font-black text-awan-tx-mute uppercase tracking-widest block mb-0.5">BPM REPOS</span>
 <span className="text-2xl font-black text-awan-tx font-mono tracking-tighter">{latestMeasure.bpm_rest}</span>
 </div>
 )}
 </>
 ) : (
 <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest opacity-40">Aucune mesure</span>
 )}
 </div>
 </div>
 </Card>
 </Touch>

 {/* SOMMEIL */}
 <Touch onPress={() => navigate('Sleep')} className="mb-4 block">
 <Card className="p-5 bg-white/3 border-white/5" variant="flat">
 <div className="flex flex-row justify-between items-center mb-4">
 <div className="flex flex-row items-center gap-3">
 <div className="w-8 h-8 bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20">
 <Moon size={15} className="text-awan-gold" />
 </div>
 <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase">SOMMEIL</span>
 </div>
 <ChevronRight size={16} className="text-awan-tx-mute" />
 </div>
 <div className="flex flex-row gap-4">
 <div className="flex flex-col">
 <span className="text-awan-sm font-black text-awan-tx-mute tracking-widest uppercase mb-1">MOY. 7J</span>
 <span className="font-mono font-black text-2xl"
 style={{ color: sleepStore.avgDurationH >= 7 ? 'var(--color-awan-status-ok)' : sleepStore.avgDurationH >= 6 ? 'var(--color-awan-status-warn)' : sleepStore.avgDurationH > 0 ? 'var(--color-awan-status-error)' : 'var(--color-awan-tx-mute)' }}>
 {sleepStore.avgDurationH > 0 ? `${sleepStore.avgDurationH.toFixed(1)}h` : '—'}
 </span>
 <span className="text-awan-sm text-awan-tx-mute mt-1">
 {sleepStore.avgDurationH > 0
 ? sleepStore.avgDurationH >= 7 ? 'objectif OMS atteint' : `${(7 - sleepStore.avgDurationH).toFixed(1)}h sous OMS`
 : 'aucune donnée'}
 </span>
 </div>
 </div>
 </Card>
 </Touch>

 {/* COACH */}
 <Touch onPress={() => navigate('Coach')} className="mb-4 block">
 <Card className="p-5 bg-white/3 border-white/5" variant="flat">
 <div className="flex flex-row justify-between items-center mb-4">
 <div className="flex flex-row items-center gap-3">
 <div className="w-8 h-8 bg-awan-gold/10 flex items-center justify-center border border-awan-gold/20">
 <Brain size={15} className="text-awan-gold" />
 </div>
 <span className="text-awan-sm font-black text-awan-gold tracking-widest uppercase">COACH</span>
 </div>
 <ChevronRight size={16} className="text-awan-tx-mute" />
 </div>
 {topAdvice ? (
 <div>
 <span className="text-awan-sm font-black uppercase tracking-widest block mb-1"
 style={{ color: COACH_COLOR[topAdvice.severity] }}>
 {topAdvice.severity.toUpperCase()}
 </span>
 <span className="text-sm font-bold text-awan-tx block">{getAdviceText(topAdvice.key).title}</span>
 <span className="text-xs text-awan-tx-dim mt-0.5 block leading-relaxed">{getAdviceText(topAdvice.key).advice}</span>
 </div>
 ) : (
 <span className="text-awan-md font-black text-awan-tx-mute uppercase tracking-widest opacity-40">Analyse non effectuée</span>
 )}
 </Card>
 </Touch>
 </ScrollView>
 );
}
