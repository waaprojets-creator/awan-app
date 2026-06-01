import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, Modal } from 'react-native';
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
import { PageWrapper, AnimatePresence } from '../components/Animated';
import {
  Activity, Dumbbell, Flame, TrendingUp,
  Trophy, Heart, BarChart2, Zap, Clock, Star, ScanLine,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Touch } from '../components/ui/Touch';
import { BilanZen } from '../components/BilanZen';
import { motion } from 'motion/react';
import type { SleepEntryLatest } from '../data/schemas/sleep/sleepEntry';

// ─── Tab components ───────────────────────────────────────────────────────────
import TempsTab from './analyse/TempsTab';
import ScanTab from './analyse/ScanTab';
import { ActivityTab } from './analyse/ActivityTab';
import { NutritionTab } from './analyse/NutritionTab';
import { MuscuTab } from './analyse/MuscuTab';
import { BiometrieTab } from './analyse/BiometrieTab';
import { CorrelationTab } from './analyse/CorrelationTab';
import { PerformanceTab } from './analyse/PerformanceTab';
import { RecoveryTab } from './analyse/RecoveryTab';
import { OrthometryTab } from './analyse/OrthometryTab';
import { FluxDensiteTab } from './analyse/FluxDensiteTab';
import { SynoptiqueTab } from './analyse/SynoptiqueTab';
import { MetaboliqueTab } from './analyse/MetaboliqueTab';
import { IslamTab } from './analyse/IslamTab';
import { BudgetTab } from './analyse/BudgetTab';
import { ReadinessTab } from './analyse/ReadinessTab';

const FREE_KEY = '_free';
const FREE_COLOR = 'rgba(212, 175, 55, 0.05)';
const FREE_LABEL = 'Temps libre';

// ─── 2-level navigation ───────────────────────────────────────────────────────

type DomainId = 'temps' | 'corps' | 'energie' | 'ame' | 'systeme';

interface SubTab { id: string; label: string; Icon: React.ComponentType<any> }

const DOMAINS: Array<{
  id: DomainId;
  label: string;
  Icon: React.ComponentType<any>;
  subs: SubTab[];
}> = [
  {
    id: 'temps',
    label: 'TEMPS',
    Icon: Clock,
    subs: [
      { id: 'budget',     label: 'BUDGET',     Icon: BarChart2 },
      { id: 'repartition',label: 'RÉPARTITION',Icon: Clock },
    ],
  },
  {
    id: 'corps',
    label: 'CORPS',
    Icon: Dumbbell,
    subs: [
      { id: 'readiness',    label: 'READINESS',   Icon: Activity },
      { id: 'charge',       label: 'CHARGE',      Icon: Heart },
      { id: 'performance',  label: 'PERFORMANCE', Icon: Trophy },
      { id: 'volume',       label: 'VOLUME',      Icon: Dumbbell },
      { id: 'morphologie',  label: 'MORPHOLOGIE', Icon: BarChart2 },
      { id: 'symetrie',     label: 'SYMÉTRIE',    Icon: ScanLine },
    ],
  },
  {
    id: 'energie',
    label: 'ÉNERGIE',
    Icon: Flame,
    subs: [
      { id: 'nutrition',  label: 'NUTRITION',  Icon: Flame },
      { id: 'disponible', label: 'DISPONIBLE', Icon: TrendingUp },
      { id: 'synoptique', label: 'SYNOPTIQUE', Icon: BarChart2 },
      { id: 'metabolisme',label: 'MÉTABOLISME',Icon: Zap },
    ],
  },
  {
    id: 'ame',
    label: 'ÂME',
    Icon: Star,
    subs: [
      { id: 'islam', label: 'ISLAM', Icon: Star },
    ],
  },
  {
    id: 'systeme',
    label: 'SYSTÈME',
    Icon: TrendingUp,
    subs: [
      { id: 'activite',     label: 'ACTIVITÉ',     Icon: Activity },
      { id: 'correlations', label: 'CORRÉLATIONS', Icon: TrendingUp },
      { id: 'adiposite',    label: 'ADIPOSITÉ',    Icon: ScanLine },
    ],
  },
];

// Sub-tabs that use the range selector
const RANGE_SUB_TABS = new Set(['nutrition', 'volume', 'morphologie', 'performance', 'charge', 'activite']);

type RangeId = 'day' | 'week' | 'month' | 'quarter' | 'year';

const RANGES: Array<{ id: RangeId; label: string; sublabel: string }> = [
  { id: 'day',     label: 'JOUR',   sublabel: 'COURT' },
  { id: 'week',    label: 'HEBDO',  sublabel: 'COURT' },
  { id: 'month',   label: 'MOIS',   sublabel: 'MOYEN' },
  { id: 'quarter', label: 'TRIM.',  sublabel: 'MOYEN' },
  { id: 'year',    label: 'AN',     sublabel: 'LONG'  },
];

// ─── Dropdown period options ──────────────────────────────────────────────────

interface PeriodOption { label: string; sublabel: string; anchorDate: Date }

const DROPDOWN_COUNTS: Record<RangeId, number> = {
  day: 60, week: 26, month: 24, quarter: 12, year: 10,
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
      label      = i === 0 ? "AUJOURD'HUI" : format(d, 'EEE d', { locale: fr }).toUpperCase();
      sublabel   = format(d, 'MMM yyyy', { locale: fr }).toUpperCase();
      anchorDate = d;
    } else if (range === 'week') {
      const base = subWeeks(now, i);
      const sun  = endOfWeek(base, { weekStartsOn: 1 });
      const mon  = startOfWeek(base, { weekStartsOn: 1 });
      label      = `S${getISOWeek(mon)}`;
      sublabel   = format(mon, 'MMM yyyy', { locale: fr }).toUpperCase();
      anchorDate = sun < now ? sun : now;
    } else if (range === 'month') {
      const d    = subMonths(now, i);
      label      = format(d, 'MMM', { locale: fr }).toUpperCase();
      sublabel   = String(d.getFullYear());
      anchorDate = i === 0 ? now : endOfMonth(d);
    } else if (range === 'quarter') {
      const d    = subMonths(now, i * 3);
      const q    = Math.floor(d.getMonth() / 3);
      const qEnd = endOfMonth(new Date(d.getFullYear(), q * 3 + 2, 1));
      label      = `T${q + 1}`;
      sublabel   = String(d.getFullYear());
      anchorDate = qEnd < now ? qEnd : now;
    } else {
      const d    = subYears(now, i);
      label      = String(d.getFullYear());
      sublabel   = '';
      anchorDate = i === 0 ? now : endOfYear(d);
    }

    opts.push({ label, sublabel, anchorDate });
  }
  return opts;
}

/** Label shown on the dropdown button for the current anchor date + range */
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

/** Compute interval from anchor date + range type, applying j-1 rule for non-day ranges */
function computeInterval(range: RangeId, anchor: Date): { start: Date; end: Date } {
  const now  = new Date();
  const isCurrentPeriod = anchor >= startOfDay(now);

  if (range === 'day') {
    // JOUR : inclut la journée en cours si c'est aujourd'hui
    return { start: startOfDay(anchor), end: endOfDay(anchor) };
  }

  // Pour tous les autres types : si période en cours → fin = hier (j-1), sinon fin naturelle
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AnalyseScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const today = ds(new Date());

  const [domain, setDomain] = useState<DomainId>('temps');
  const [subTab, setSubTab] = useState<string>('budget');
  const [range, setRange] = useState<RangeId>('week');
  // anchorDates: last selected end-date anchor per range type — persists across sub-tab switches
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

  // Reset sub-tab to first when domain changes
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
    const filtered = measureStore.history
      .filter(m => { const d = parseISO(m.date); return d >= interval.start && d <= interval.end; })
      .slice().sort((a, b) => a.date.localeCompare(b.date));
    return filtered.map(m => {
      let lo = 0; let hi = sortedWeights.length - 1; let w: typeof sortedWeights[0] | undefined;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const entry = sortedWeights[mid];
        if (entry && entry.date <= m.date) { w = entry; lo = mid + 1; }
        else hi = mid - 1;
      }
      return { label: format(parseISO(m.date), 'dd/MM'), weight: w?.weightKg ?? null };
    });
  }, [measureStore.history, weightStore.entries, interval]);

  useEffect(() => {
    const sorted = weightStore.entries.slice().sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted.at(-1) ?? null;
    const prev = sorted.at(-2) ?? null;
    const wt = latest && prev
      ? latest.weightKg > prev.weightKg ? 'up' : latest.weightKg < prev.weightKg ? 'down' : 'stable'
      : null;
    setAiLoading(true);
    LocalAIService.generateZenSummary({
      kcalToday: mealsByDay.at(-1)?.kcal,
      prayersDone: prayerStore.doneCount,
      prayersTotal: prayerStore.total,
      lastWorkoutName: workoutStore.sessions.at(-1)?.name ?? null,
      weightKg: latest?.weightKg ?? null,
      weightTrend: wt,
    }).then(s => { setAiSummary(s); setAiLoading(false); });
  }, [weightStore.entries, mealsByDay, workoutStore.sessions, prayerStore.doneCount]);

  const bodyWeightKg = weightStore.avg7d ?? weightStore.entries[0]?.weightKg ?? null;

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
      workoutMins > 0 && { key: 'sport', value: workoutMins, color: 'var(--color-awan-gold)', label: 'Sport' },
      sleepMins > 0 && { key: 'sleep', value: sleepMins, color: 'rgba(78,205,196,0.8)', label: 'Sommeil' },
      { key: FREE_KEY, value: free, color: FREE_COLOR, label: FREE_LABEL },
    ].filter(Boolean);
    return entries as { key: string; value: number; color: string; label: string }[];
  }, [workoutStore.sessions, sleepEntries, interval]);

  const currentDomain = DOMAINS.find(d => d.id === domain)!;

  // ─── Content renderer ────────────────────────────────────────────────────────

  function renderContent() {
    switch (subTab) {
      // ── TEMPS ──────────────────────────────────────────────────────────────
      case 'budget':       return <BudgetTab />;
      case 'repartition':  return <TempsTab />;

      // ── CORPS ──────────────────────────────────────────────────────────────
      case 'readiness':    return <ReadinessTab />;
      case 'charge':       return <RecoveryTab sessions={workoutStore.sessions} />;
      case 'performance':  return <PerformanceTab sessions={workoutStore.sessions} />;
      case 'volume':       return <MuscuTab stats={muscuStats} loading={workoutStore.loading} />;
      case 'morphologie':  return (
        <BiometrieTab
          weightTrend={weightTrend}
          history={measureStore.history}
          loading={measureStore.loading}
        />
      );
      case 'symetrie':     return (
        <OrthometryTab
          history={measureStore.history}
          loading={measureStore.loading}
        />
      );

      // ── ÉNERGIE ────────────────────────────────────────────────────────────
      case 'nutrition':    return (
        <NutritionTab
          mealsByDay={mealsByDay}
          mealsLoading={mealsLoading}
          todayKcal={mealStoreToday.totals.kcal}
          todayP={mealStoreToday.totals.p}
          todayC={mealStoreToday.totals.c}
          todayF={mealStoreToday.totals.f}
        />
      );
      case 'disponible':   return (
        <FluxDensiteTab sessions={workoutStore.sessions} weightKg={bodyWeightKg} />
      );
      case 'synoptique':   return <SynoptiqueTab sessions={workoutStore.sessions} />;
      case 'metabolisme':  return <MetaboliqueTab />;

      // ── ÂME ────────────────────────────────────────────────────────────────
      case 'islam':        return <IslamTab />;

      // ── SYSTÈME ────────────────────────────────────────────────────────────
      case 'activite':     return <ActivityTab data={activityData} />;
      case 'correlations': return (
        <CorrelationTab
          sessions={workoutStore.sessions}
          history={measureStore.history}
          weightEntries={weightStore.entries}
          todayKcal={mealStoreToday.totals.kcal}
        />
      );
      case 'adiposite':    return <ScanTab />;

      default: return null;
    }
  }

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <div className="px-6 pt-4 pb-4">
          <div className="mt-0">
            <span className="text-awan-xl font-black text-awan-tx tracking-[0.15em] uppercase block">ANALYSE TACTIQUE</span>
            <span className="text-awan-sm text-awan-tx-mute tracking-widest uppercase mt-1 block">Intelligence de Situation</span>
          </div>

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
                  weightKg: weightStore.entries.at(-1)?.weightKg ?? null,
                }).then(s => { setAiSummary(s); setAiLoading(false); });
              }}
            />
          </div>
        </div>

        {/* L1 — Domain bar */}
        <div className="mb-0">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}>
            <div className="border-b border-white/10 flex flex-row">
              {DOMAINS.map(({ id, label, Icon }) => (
                <Touch
                  key={id}
                  className={`px-4 py-3 items-center justify-center border-b-2 transition-all min-w-[64px] ${
                    domain === id ? 'border-awan-gold' : 'border-transparent opacity-40'
                  }`}
                  onPress={() => setDomain(id)}
                >
                  <Icon size={16} className={domain === id ? 'text-awan-gold' : 'text-awan-tx-mute'} />
                  <span className={`awan-label-sm mt-1 ${domain === id ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
                    {label}
                  </span>
                </Touch>
              ))}
            </div>
          </ScrollView>
        </div>

        {/* L2 — Sub-tab bar (hidden when domain has only 1 sub-tab) */}
        {currentDomain.subs.length > 1 && (
          <div className="mb-0">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}>
              <div className="border-b border-white/5 flex flex-row">
                {currentDomain.subs.map(({ id, label, Icon }) => (
                  <Touch
                    key={id}
                    className={`px-3 py-2.5 items-center justify-center border-b-2 transition-all min-w-[64px] ${
                      subTab === id ? 'border-awan-gold/70' : 'border-transparent opacity-30'
                    }`}
                    onPress={() => setSubTab(id)}
                  >
                    <Icon size={13}
                      className={subTab === id ? 'text-awan-gold' : 'text-awan-tx-mute'}
                      style={{ opacity: subTab === id ? 1 : 0.5 }}
                    />
                    <span className={`mt-1 uppercase font-black tracking-[0.15em] ${
                      subTab === id ? 'text-awan-gold' : 'text-awan-tx-mute'
                    }`}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 9 }}>
                      {label}
                    </span>
                  </Touch>
                ))}
              </div>
            </ScrollView>
          </div>
        )}

        {/* Range selector — L1 type + dropdown période */}
        {RANGE_SUB_TABS.has(subTab) && (
          <div className="mt-5 mb-2 px-6 space-y-3">

            {/* L1 — granularité */}
            <div className="flex flex-row gap-2">
              {RANGES.map(r => {
                const active = range === r.id;
                return (
                  <Touch
                    key={r.id}
                    className={`flex-1 py-2 border items-center ${active ? 'bg-awan-gold/20 border-awan-gold' : 'border-white/10'}`}
                    onPress={() => setRange(r.id)}
                  >
                    <span className={`text-awan-xs font-black tracking-widest font-mono ${active ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
                      {r.label}
                    </span>
                    <span className={`font-mono opacity-50 ${active ? 'text-awan-gold' : 'text-awan-tx-mute'}`} style={{ fontSize: 8 }}>
                      {r.sublabel}
                    </span>
                  </Touch>
                );
              })}
            </div>

            {/* L2 — bouton dropdown période */}
            <Touch
              className="w-full border border-white/10 bg-white/3 py-3 px-4 flex flex-row items-center justify-between"
              onPress={() => setShowPeriodPicker(true)}
            >
              <span className="text-awan-sm font-black font-mono tracking-widest text-awan-tx">
                {periodButtonLabel(range, anchorDates[range] ?? new Date())}
              </span>
              <span className="text-awan-tx-mute font-mono text-lg">▾</span>
            </Touch>
          </div>
        )}

        {/* Period picker modal */}
        <Modal visible={showPeriodPicker} transparent animationType="slide">
          <div className="flex-1 bg-black/70 justify-end backdrop-blur-sm">
            <div className="bg-awan-surface border-t border-white/10 max-h-[60vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 flex flex-row items-center justify-between">
                <span className="text-awan-sm font-black uppercase tracking-widest font-mono text-awan-tx">
                  SÉLECTIONNER LA PÉRIODE
                </span>
                <Touch onPress={() => setShowPeriodPicker(false)} className="px-3 py-1 border border-white/10">
                  <span className="text-awan-xs font-black font-mono text-awan-tx-mute">FERMER</span>
                </Touch>
              </div>
              {/* Options */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {buildPeriodOptions(range).map((opt, i) => {
                  const anchor = anchorDates[range] ?? new Date();
                  const active = i === 0
                    ? ds(anchor) === ds(opt.anchorDate)
                    : Math.abs(opt.anchorDate.getTime() - anchor.getTime()) < 86400000;
                  return (
                    <Touch
                      key={i}
                      className={`px-6 py-4 border-b flex flex-row items-center justify-between ${
                        active ? 'bg-awan-gold/10 border-awan-gold/20' : 'border-white/5'
                      }`}
                      onPress={() => {
                        setAnchorDates((prev: Record<RangeId, Date>) => ({ ...prev, [range]: opt.anchorDate }));
                        setShowPeriodPicker(false);
                      }}
                    >
                      <div>
                        <span className={`text-awan-md font-black font-mono tracking-widest ${active ? 'text-awan-gold' : 'text-awan-tx'}`}>
                          {opt.label}
                        </span>
                        {opt.sublabel ? (
                          <span className={`text-awan-xs font-mono block mt-0.5 ${active ? 'text-awan-gold opacity-60' : 'text-awan-tx-mute'}`}>
                            {opt.sublabel}
                          </span>
                        ) : null}
                      </div>
                      {active && <span className="text-awan-gold font-mono text-sm">●</span>}
                    </Touch>
                  );
                })}
              </ScrollView>
            </div>
          </div>
        </Modal>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={subTab + range}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-6 mt-6"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </ScrollView>
    </PageWrapper>
  );
}
