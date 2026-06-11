import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { View, Text, ScrollView, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  startOfDay, endOfDay, subDays,
  addDays, addWeeks, addMonths, addYears,
  subWeeks, subMonths, subYears,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  getISOWeek, parseISO, format, eachDayOfInterval,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../hooks/useTheme';
import { FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Clr } from '../theme/tokens';
import { ds } from '../utils/storage';
import { LocalAIService } from '../services/localAIService';
import { MealService } from '../services/mealService';
import { SleepService } from '../services/sleepService';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useWeightStore } from '../hooks/useWeightStore';
import { useMealStore } from '../hooks/useMealStore';
import { usePrayerStore } from '../hooks/usePrayerStore';
import { useAppStore } from '../data/store/appStore';
import {
  Activity, Dumbbell, Flame, TrendingUp,
  Trophy, Heart, BarChart2, Zap, Clock, Star, ScanLine,
} from 'lucide-react-native';
import { Card } from '../components/ui/Card';
import { Touch } from '../components/ui/Touch';
import { BilanZen } from '../components/BilanZen';
import { DateSelectPopup } from '../components/ui/DateSelectPopup';
import type { SleepEntryLatest } from '../data/schemas/sleep/sleepEntry';

const TempsTab       = lazy(() => import('./analyse/TempsTab'));
const ScanTab        = lazy(() => import('./analyse/ScanTab'));
const ActivityTab    = lazy(() => import('./analyse/ActivityTab').then(m => ({ default: m.ActivityTab })));
const NutritionTab   = lazy(() => import('./analyse/NutritionTab').then(m => ({ default: m.NutritionTab })));
const MuscuTab       = lazy(() => import('./analyse/MuscuTab').then(m => ({ default: m.MuscuTab })));
const BiometrieTab   = lazy(() => import('./analyse/BiometrieTab').then(m => ({ default: m.BiometrieTab })));
const CorrelationTab = lazy(() => import('./analyse/CorrelationTab').then(m => ({ default: m.CorrelationTab })));
const PerformanceTab = lazy(() => import('./analyse/PerformanceTab').then(m => ({ default: m.PerformanceTab })));
const RecoveryTab    = lazy(() => import('./analyse/RecoveryTab').then(m => ({ default: m.RecoveryTab })));
const OrthometryTab  = lazy(() => import('./analyse/OrthometryTab').then(m => ({ default: m.OrthometryTab })));
const FluxDensiteTab = lazy(() => import('./analyse/FluxDensiteTab').then(m => ({ default: m.FluxDensiteTab })));
const SynoptiqueTab  = lazy(() => import('./analyse/SynoptiqueTab').then(m => ({ default: m.SynoptiqueTab })));
const MetaboliqueTab = lazy(() => import('./analyse/MetaboliqueTab').then(m => ({ default: m.MetaboliqueTab })));
const IslamTab       = lazy(() => import('./analyse/IslamTab').then(m => ({ default: m.IslamTab })));
const BudgetTab      = lazy(() => import('./analyse/BudgetTab').then(m => ({ default: m.BudgetTab })));
const ReadinessTab   = lazy(() => import('./analyse/ReadinessTab').then(m => ({ default: m.ReadinessTab })));

const FREE_KEY = '_free';
const FREE_COLOR = 'rgba(212, 175, 55, 0.05)';
const FREE_LABEL = 'Temps libre';

type DomainId = 'temps' | 'corps' | 'energie' | 'ame' | 'systeme';
interface SubTab { id: string; label: string; Icon: React.ComponentType<any> }

const DOMAINS: Array<{
  id: DomainId;
  label: string;
  Icon: React.ComponentType<any>;
  subs: SubTab[];
}> = [
  {
    id: 'temps', label: 'TEMPS', Icon: Clock,
    subs: [
      { id: 'budget', label: 'RATIO', Icon: BarChart2 },
      { id: 'repartition', label: 'RÉPARTITION', Icon: Clock },
    ],
  },
  {
    id: 'corps', label: 'CORPS', Icon: Dumbbell,
    subs: [
      { id: 'readiness',   label: 'READINESS',   Icon: Activity },
      { id: 'charge',      label: 'CHARGE',      Icon: Heart },
      { id: 'performance', label: 'PERFORMANCE', Icon: Trophy },
      { id: 'volume',      label: 'VOLUME',      Icon: Dumbbell },
      { id: 'morphologie', label: 'MORPHOLOGIE', Icon: BarChart2 },
      { id: 'symetrie',    label: 'SYMÉTRIE',    Icon: ScanLine },
    ],
  },
  {
    id: 'energie', label: 'ÉNERGIE', Icon: Flame,
    subs: [
      { id: 'nutrition',   label: 'NUTRITION',   Icon: Flame },
      { id: 'disponible',  label: 'DISPONIBLE',  Icon: TrendingUp },
      { id: 'synoptique',  label: 'SYNOPTIQUE',  Icon: BarChart2 },
      { id: 'metabolisme', label: 'MÉTABOLISME', Icon: Zap },
    ],
  },
  {
    id: 'ame', label: 'ÂME', Icon: Star,
    subs: [{ id: 'islam', label: 'ISLAM', Icon: Star }],
  },
  {
    id: 'systeme', label: 'SYSTÈME', Icon: TrendingUp,
    subs: [
      { id: 'activite',     label: 'ACTIVITÉ',     Icon: Activity },
      { id: 'correlations', label: 'CORRÉLATIONS', Icon: TrendingUp },
      { id: 'adiposite',    label: 'ADIPOSITÉ',    Icon: ScanLine },
    ],
  },
];

const RANGE_SUB_TABS = new Set(['nutrition', 'volume', 'morphologie', 'performance', 'charge', 'activite']);
type RangeId = 'day' | 'week' | 'month' | 'quarter' | 'year';

const RANGES: Array<{ id: RangeId; label: string; sublabel: string }> = [
  { id: 'day',     label: 'JOUR',  sublabel: 'COURT' },
  { id: 'week',    label: 'HEBDO', sublabel: 'COURT' },
  { id: 'month',   label: 'MOIS',  sublabel: 'MOYEN' },
  { id: 'quarter', label: 'TRIM.', sublabel: 'MOYEN' },
  { id: 'year',    label: 'AN',    sublabel: 'LONG'  },
];

interface PeriodOption { label: string; sublabel: string; anchorDate: Date }

const DROPDOWN_COUNTS: Record<RangeId, number> = {
  day: 0, week: 26, month: 24, quarter: 12, year: 10,
};

function buildPeriodOptions(range: RangeId): PeriodOption[] {
  const now = new Date();
  const count = DROPDOWN_COUNTS[range];
  const opts: PeriodOption[] = [];

  for (let i = 0; i < count; i++) {
    let label = '';
    let sublabel = '';
    let anchorDate: Date;

    if (range === 'day') {
      const d = subDays(now, i);
      label = i === 0 ? "AUJOURD'HUI" : format(d, 'EEE d', { locale: fr }).toUpperCase();
      sublabel = format(d, 'MMM yyyy', { locale: fr }).toUpperCase();
      anchorDate = d;
    } else if (range === 'week') {
      const base = subWeeks(now, i);
      const sun  = endOfWeek(base, { weekStartsOn: 1 });
      const mon  = startOfWeek(base, { weekStartsOn: 1 });
      label = `S${getISOWeek(mon)}`;
      sublabel = format(mon, 'MMM yyyy', { locale: fr }).toUpperCase();
      anchorDate = sun < now ? sun : now;
    } else if (range === 'month') {
      const d = subMonths(now, i);
      label = format(d, 'MMM', { locale: fr }).toUpperCase();
      sublabel = String(d.getFullYear());
      anchorDate = i === 0 ? now : endOfMonth(d);
    } else if (range === 'quarter') {
      const d = subMonths(now, i * 3);
      const q = Math.floor(d.getMonth() / 3);
      const qEnd = endOfMonth(new Date(d.getFullYear(), q * 3 + 2, 1));
      label = `T${q + 1}`;
      sublabel = String(d.getFullYear());
      anchorDate = qEnd < now ? qEnd : now;
    } else {
      const d = subYears(now, i);
      label = String(d.getFullYear());
      sublabel = '';
      anchorDate = i === 0 ? now : endOfYear(d);
    }
    opts.push({ label, sublabel, anchorDate });
  }
  return opts;
}

function periodButtonLabel(range: RangeId, anchor: Date): string {
  const now = new Date();
  const isToday = ds(anchor) === ds(now);
  if (range === 'day')     return isToday ? "AUJOURD'HUI" : format(anchor, 'EEE d MMM yyyy', { locale: fr }).toUpperCase();
  if (range === 'week') {
    const mon = startOfWeek(anchor, { weekStartsOn: 1 });
    return `S${getISOWeek(mon)} · ${format(mon, 'MMM yyyy', { locale: fr }).toUpperCase()}`;
  }
  if (range === 'month')   return format(anchor, 'MMMM yyyy', { locale: fr }).toUpperCase();
  if (range === 'quarter') {
    const q = Math.floor(anchor.getMonth() / 3) + 1;
    return `T${q} ${anchor.getFullYear()}`;
  }
  return String(anchor.getFullYear());
}

function computeInterval(range: RangeId, anchor: Date): { start: Date; end: Date } {
  const now = new Date();
  const isCurrentPeriod = anchor >= startOfDay(now);

  if (range === 'day') return { start: startOfDay(anchor), end: endOfDay(anchor) };

  const naturalEnd = range === 'week'    ? endOfWeek(anchor, { weekStartsOn: 1 })
                   : range === 'month'   ? endOfMonth(anchor)
                   : range === 'quarter' ? endOfMonth(new Date(anchor.getFullYear(), Math.floor(anchor.getMonth() / 3) * 3 + 2, 1))
                   :                      endOfYear(anchor);

  const end = isCurrentPeriod ? endOfDay(subDays(now, 1)) : endOfDay(naturalEnd);
  const start = range === 'week'    ? startOfWeek(anchor, { weekStartsOn: 1 })
              : range === 'month'   ? startOfMonth(anchor)
              : range === 'quarter' ? startOfDay(new Date(anchor.getFullYear(), Math.floor(anchor.getMonth() / 3) * 3, 1))
              :                      startOfYear(anchor);

  return { start, end };
}

export default function AnalyseScreen() {
  const theme = useTheme();
  const today = ds(new Date());

  const [domain, setDomain] = useState<DomainId>('temps');
  const [subTab, setSubTab] = useState<string>('budget');
  const [range, setRange] = useState<RangeId>('week');
  const [anchorDates, setAnchorDates] = useState<Record<RangeId, Date>>({
    day: new Date(), week: new Date(), month: new Date(), quarter: new Date(), year: new Date(),
  });
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [mealsByDay, setMealsByDay] = useState<Array<{ label: string; kcal: number; p: number }>>([]);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [sleepEntries, setSleepEntries] = useState<SleepEntryLatest[]>([]);

  const workoutStore = useWorkoutStore();
  const measureStore = useMeasurementStore();
  const weightStore = useWeightStore();
  const prayerStore = usePrayerStore(today);
  const mealStoreToday = useMealStore(today);
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    const d = DOMAINS.find(d => d.id === domain);
    if (d && d.subs[0]) setSubTab(d.subs[0].id);
  }, [domain]);

  useEffect(() => {
    SleepService.getAll().then(setSleepEntries).catch(() => {});
  }, [dataVersion]);

  const interval = useMemo(
    () => computeInterval(range, anchorDates[range] ?? new Date()),
    [range, anchorDates],
  );

  const muscuStats = useMemo(() => {
    return workoutStore.sessions
      .filter(s => { const d = parseISO(s.date); return d >= interval.start && d <= interval.end; })
      .map(s => {
        let weight = 0; let sets = 0;
        s.exercises.forEach((ex: any) => {
          (ex.sets as any[] | undefined ?? []).forEach((set: any) => {
            weight += (parseFloat(set.weight) || set.weightKg || 0) * (parseInt(set.reps) || 0);
            sets += 1;
          });
        });
        return { label: format(parseISO(s.date), 'dd/MM'), weight, sets };
      });
  }, [workoutStore.sessions, interval]);

  useEffect(() => {
    if (!RANGE_SUB_TABS.has(subTab)) return;
    let active = true;
    setMealsLoading(true);
    const days = eachDayOfInterval(interval);
    Promise.all(
      days.map(async day => {
        const tot = await MealService.getDailyTotals(ds(day));
        return { label: format(day, 'dd/MM'), kcal: tot.kcal, p: tot.p };
      }),
    ).then(results => {
      if (!active) return;
      setMealsByDay(results);
      setMealsLoading(false);
    }).catch(() => { if (active) setMealsLoading(false); });
    return () => { active = false; };
  }, [interval, subTab]);

  const weightTrend = useMemo(() => {
    const sortedWeights = [...weightStore.entries].sort((a, b) => a.date.localeCompare(b.date));
    return measureStore.history
      .filter(m => { const d = parseISO(m.date); return d >= interval.start && d <= interval.end; })
      .slice().sort((a, b) => a.date.localeCompare(b.date))
      .map(m => {
        let lo = 0; let hi = sortedWeights.length - 1; let w: typeof sortedWeights[0] | undefined;
        while (lo <= hi) {
          const mid = (lo + hi) >>> 1;
          const entry = sortedWeights[mid];
          if (entry && entry.date <= m.date) { w = entry; lo = mid + 1; }
          else hi = mid - 1;
        }
        return { label: format(parseISO(m.date), 'dd/MM'), weight: w?.weight ?? null };
      });
  }, [measureStore.history, weightStore.entries, interval]);

  useEffect(() => {
    const sorted = weightStore.entries.slice().sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted.at(-1) ?? null;
    const prev = sorted.at(-2) ?? null;
    const wt = latest && prev
      ? (latest.weight ?? 0) > (prev.weight ?? 0) ? 'up' : (latest.weight ?? 0) < (prev.weight ?? 0) ? 'down' : 'stable'
      : null;
    setAiLoading(true);
    LocalAIService.generateZenSummary({
      kcalToday: mealsByDay.at(-1)?.kcal,
      prayersDone: prayerStore.doneCount,
      prayersTotal: prayerStore.total,
      lastWorkoutName: workoutStore.sessions.at(-1)?.name ?? null,
      weightKg: latest?.weight ?? null,
      weightTrend: wt,
    }).then(s => { setAiSummary(s); setAiLoading(false); });
  }, [weightStore.entries, mealsByDay, workoutStore.sessions, prayerStore.doneCount]);

  const bodyWeightKg = weightStore.avg7d ?? weightStore.entries[0]?.weight ?? null;

  const activityData = useMemo(() => {
    const workoutMins = workoutStore.sessions
      .filter(s => { const d = parseISO(s.date); return d >= interval.start && d <= interval.end; })
      .reduce((acc, s) => acc + ((s as any).durationMin ?? 60), 0);
    const sleepMins = sleepEntries
      .filter(e => { const d = parseISO(e.date); return d >= interval.start && d <= interval.end; })
      .reduce((acc, e) => acc + Math.round(e.durationH * 60), 0);
    const totalMins = 24 * 60 * Math.max(1, eachDayOfInterval(interval).length);
    const used = workoutMins + sleepMins;
    const free = Math.max(0, totalMins - used);
    const entries = [
      workoutMins > 0 && { key: 'sport', value: workoutMins, color: theme.selected, label: 'Sport' },
      sleepMins > 0 && { key: 'sleep', value: sleepMins, color: 'rgba(78,205,196,0.8)', label: 'Sommeil' },
      { key: FREE_KEY, value: free, color: FREE_COLOR, label: FREE_LABEL },
    ].filter(Boolean);
    return entries as { key: string; value: number; color: string; label: string }[];
  }, [workoutStore.sessions, sleepEntries, interval]);

  const currentDomain = DOMAINS.find(d => d.id === domain)!;

  function renderContent() {
    switch (subTab) {
      case 'budget':       return <BudgetTab />;
      case 'repartition':  return <TempsTab />;
      case 'readiness':    return <ReadinessTab />;
      case 'charge':       return <RecoveryTab sessions={workoutStore.sessions} />;
      case 'performance':  return <PerformanceTab sessions={workoutStore.sessions} />;
      case 'volume':       return <MuscuTab stats={muscuStats} loading={workoutStore.loading} />;
      case 'morphologie':  return <BiometrieTab weightTrend={weightTrend} history={measureStore.history} loading={measureStore.loading} />;
      case 'symetrie':     return <OrthometryTab history={measureStore.history} loading={measureStore.loading} />;
      case 'nutrition':    return <NutritionTab mealsByDay={mealsByDay} mealsLoading={mealsLoading} todayKcal={mealStoreToday.totals.kcal} todayP={mealStoreToday.totals.p} todayC={mealStoreToday.totals.c} todayF={mealStoreToday.totals.f} />;
      case 'disponible':   return <FluxDensiteTab sessions={workoutStore.sessions} weightKg={bodyWeightKg} />;
      case 'synoptique':   return <SynoptiqueTab sessions={workoutStore.sessions} />;
      case 'metabolisme':  return <MetaboliqueTab />;
      case 'islam':        return <IslamTab />;
      case 'activite':     return <ActivityTab data={activityData} />;
      case 'correlations': return <CorrelationTab sessions={workoutStore.sessions} history={measureStore.history} weightEntries={weightStore.entries} todayKcal={mealStoreToday.totals.kcal} />;
      case 'adiposite':    return <ScanTab />;
      default: return null;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
          <View>
            <Text style={[s.titleMain, { color: theme.title }]}>ANALYSE TACTIQUE</Text>
            <Text style={[s.titleSub, { color: theme.mute }]}>Intelligence de Situation</Text>
          </View>

          <View style={[s.deviseBar, { borderLeftColor: `${theme.selected}66` }]}>
            <Text style={[s.deviseText, { color: theme.title }]}>
              « L'avenir s'esquisse en encrant aujourd'hui dans les lignes du passé. »
            </Text>
            <Text style={[s.deviseLabel, { color: theme.mute }]}>— Devise AWAN</Text>
          </View>

          <View style={{ marginTop: 32 }}>
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
                  weightKg: weightStore.entries.at(-1)?.weight ?? null,
                }).then(s => { setAiSummary(s); setAiLoading(false); });
              }}
            />
          </View>
        </View>

        {/* L1 — Domain bar */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}>
            <View style={{ flexDirection: 'row' }}>
              {DOMAINS.map(({ id, label, Icon }) => (
                <Touch
                  key={id}
                  onPress={() => setDomain(id)}
                  style={[s.domainTab, { opacity: domain === id ? 1 : 0.4 }]}
                >
                  <Icon size={16} color={domain === id ? theme.selected : theme.mute} />
                  <Text style={[s.domainLabel, { color: domain === id ? theme.selected : theme.mute }]}>
                    {label}
                  </Text>
                  {domain === id && (
                    <View style={[s.activeIndicator, { backgroundColor: theme.selected }]} />
                  )}
                </Touch>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* L2 — Sub-tab bar */}
        {currentDomain.subs.length > 1 && (
          <View style={{ borderBottomWidth: 1, borderBottomColor: Clr.white5 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}>
              <View style={{ flexDirection: 'row' }}>
                {currentDomain.subs.map(({ id, label, Icon }) => (
                  <Touch
                    key={id}
                    onPress={() => setSubTab(id)}
                    style={[s.subTab, { opacity: subTab === id ? 1 : 0.3 }]}
                  >
                    <Icon size={13} color={subTab === id ? theme.selected : theme.mute} />
                    <Text style={[s.subTabLabel, { color: subTab === id ? theme.selected : theme.mute }]}>
                      {label}
                    </Text>
                    {subTab === id && (
                      <View style={[s.subActiveIndicator, { backgroundColor: `${theme.selected}B3` }]} />
                    )}
                  </Touch>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Range selector */}
        {RANGE_SUB_TABS.has(subTab) && (
          <View style={{ marginTop: 20, marginBottom: 8, paddingHorizontal: 24, gap: 12 }}>
            {/* L1 — granularity */}
            <View style={s.rangeRow}>
              {RANGES.map(r => {
                const active = range === r.id;
                return (
                  <Touch
                    key={r.id}
                    onPress={() => setRange(r.id)}
                    style={[s.rangeBtn, {
                      backgroundColor: active ? 'rgba(212,175,55,0.2)' : 'transparent',
                      borderColor: active ? theme.selected : 'rgba(255,255,255,0.1)',
                    }]}
                  >
                    <Text style={[s.rangeLabelMain, { color: active ? theme.selected : theme.mute }]}>
                      {r.label}
                    </Text>
                    <Text style={[s.rangeLabelSub, { color: active ? theme.selected : theme.mute, opacity: 0.5 }]}>
                      {r.sublabel}
                    </Text>
                  </Touch>
                );
              })}
            </View>

            {/* L2 — period selector */}
            {range === 'day' ? (
              <DateSelectPopup
                value={format(anchorDates.day ?? new Date(), 'yyyy-MM-dd')}
                onChange={(d) => {
                  const date = new Date(d + 'T12:00:00');
                  if (!isNaN(date.getTime()))
                    setAnchorDates((prev: Record<RangeId, Date>) => ({ ...prev, day: date }));
                }}
                max={format(new Date(), 'yyyy-MM-dd')}
                label="JOUR"
              />
            ) : (
              <Touch
                onPress={() => setShowPeriodPicker(true)}
                style={s.periodBtn}
              >
                <Text style={[s.periodBtnLabel, { color: theme.title }]}>
                  {periodButtonLabel(range, anchorDates[range] ?? new Date())}
                </Text>
                <Text style={[s.periodBtnChevron, { color: theme.mute }]}>▾</Text>
              </Touch>
            )}
          </View>
        )}

        {/* Period picker modal */}
        <Modal visible={showPeriodPicker} transparent animationType="slide">
          <View style={[s.modalOverlay]}>
            <View style={[s.modalSheet, { backgroundColor: theme.surface }]}>
              <View style={[s.modalHeader, { borderBottomColor: Clr.white5 }]}>
                <Text style={[s.modalTitle, { color: theme.title }]}>SÉLECTIONNER LA PÉRIODE</Text>
                <Touch onPress={() => setShowPeriodPicker(false)} style={[s.modalClose, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[s.modalCloseLabel, { color: theme.mute }]}>FERMER</Text>
                </Touch>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {buildPeriodOptions(range).map((opt, i) => {
                  const anchor = anchorDates[range] ?? new Date();
                  const active = i === 0
                    ? ds(anchor) === ds(opt.anchorDate)
                    : Math.abs(opt.anchorDate.getTime() - anchor.getTime()) < 86400000;
                  return (
                    <Touch
                      key={i}
                      onPress={() => {
                        setAnchorDates((prev: Record<RangeId, Date>) => ({ ...prev, [range]: opt.anchorDate }));
                        setShowPeriodPicker(false);
                      }}
                      style={[s.periodOption, {
                        backgroundColor: active ? 'rgba(212,175,55,0.1)' : 'transparent',
                        borderBottomColor: active ? 'rgba(212,175,55,0.2)' : Clr.white5,
                      }]}
                    >
                      <View>
                        <Text style={[s.periodOptLabel, { color: active ? theme.selected : theme.title }]}>
                          {opt.label}
                        </Text>
                        {opt.sublabel ? (
                          <Text style={[s.periodOptSub, { color: active ? theme.selected : theme.mute, opacity: active ? 0.6 : 1 }]}>
                            {opt.sublabel}
                          </Text>
                        ) : null}
                      </View>
                      {active && <Text style={[s.periodOptDot, { color: theme.selected }]}>●</Text>}
                    </Touch>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Content */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <Suspense fallback={
            <View style={s.suspenseFallback}>
              <ActivityIndicator size="small" color={theme.selected} />
            </View>
          }>
            {renderContent()}
          </Suspense>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  titleMain: { fontFamily: FontMono, fontSize: 18, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.md_03 },
  titleSub: { fontFamily: FontMono, fontSize: Fs.sm, textTransform: 'uppercase', letterSpacing: Ls.sm_02, marginTop: 4 },
  deviseBar: { marginTop: 24, borderLeftWidth: 2, paddingLeft: 16 },
  deviseText: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.value, fontStyle: 'italic', lineHeight: 22 },
  deviseLabel: { fontFamily: FontMono, fontSize: Fs.xs, textTransform: 'uppercase', letterSpacing: Ls.sm_02, marginTop: 8 },
  domainTab: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', minWidth: 64 },
  domainLabel: { fontFamily: FontMono, fontSize: 8, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02, marginTop: 4 },
  activeIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  subTab: { paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', minWidth: 64 },
  subTabLabel: { fontFamily: FontMono, fontSize: 9, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02, marginTop: 4 },
  subActiveIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  rangeRow: { flexDirection: 'row', gap: 8 },
  rangeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  rangeLabelMain: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, letterSpacing: Ls.sm_02 },
  rangeLabelSub: { fontFamily: FontMono, fontSize: 8 },
  periodBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodBtnLabel: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, letterSpacing: Ls.sm_02 },
  periodBtnChevron: { fontFamily: FontMono, fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', maxHeight: '60%' },
  modalHeader: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  modalClose: { paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  modalCloseLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display },
  periodOption: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodOptLabel: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, letterSpacing: Ls.sm_02 },
  periodOptSub: { fontFamily: FontMono, fontSize: Fs.xs, marginTop: 2 },
  periodOptDot: { fontFamily: FontMono, fontSize: Fs.md },
  suspenseFallback: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, opacity: 0.4 },
});
