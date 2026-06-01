import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  startOfDay, endOfDay, subDays,
  addDays, addWeeks, addMonths, addYears,
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
  { id: 'day',     label: 'JOUR',   sublabel: 'AUJ.'  },
  { id: 'week',    label: 'HEBDO',  sublabel: 'COURT' },
  { id: 'month',   label: 'MOIS',   sublabel: 'MOYEN' },
  { id: 'quarter', label: 'TRIM.',  sublabel: 'MOYEN' },
  { id: 'year',    label: 'AN',     sublabel: 'LONG'  },
];

// Number of past periods shown in the scrollable picker per range type
const RANGE_CHIP_COUNTS: Record<RangeId, number> = {
  day: 14, week: 12, month: 18, quarter: 8, year: 5,
};

interface PeriodChip { offset: number; label: string; sublabel: string }

function buildPeriodChips(range: RangeId): PeriodChip[] {
  const now = new Date();
  const count = RANGE_CHIP_COUNTS[range];
  const chips: PeriodChip[] = [];

  for (let i = -(count - 1); i <= 0; i++) {
    let label = '';
    let sublabel = '';

    if (range === 'day') {
      const d = addDays(now, i);
      label  = i === 0 ? 'AUJ.' : format(d, 'EEE d', { locale: fr }).toUpperCase();
      sublabel = format(d, 'MMM', { locale: fr }).toUpperCase();
    } else if (range === 'week') {
      const base = addWeeks(now, i);
      const mon  = startOfWeek(base, { weekStartsOn: 1 });
      label    = `S${getISOWeek(mon)}`;
      sublabel = format(mon, 'MMM', { locale: fr }).toUpperCase();
    } else if (range === 'month') {
      const d  = addMonths(now, i);
      label    = format(d, 'MMM', { locale: fr }).toUpperCase();
      sublabel = String(d.getFullYear());
    } else if (range === 'quarter') {
      const d = addMonths(now, i * 3);
      const q = Math.ceil((d.getMonth() + 1) / 3);
      label    = `T${q}`;
      sublabel = String(d.getFullYear());
    } else {
      const d  = addYears(now, i);
      label    = String(d.getFullYear());
      sublabel = '';
    }

    chips.push({ offset: i, label, sublabel });
  }
  return chips;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AnalyseScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const today = ds(new Date());

  const [domain, setDomain] = useState<DomainId>('temps');
  const [subTab, setSubTab] = useState<string>('budget');
  const [range, setRange] = useState<RangeId>('week');
  // Per-range offsets: 0 = most recent, -1 = one period back, etc. Persists across sub-tab switches.
  const [rangeOffsets, setRangeOffsets] = useState<Record<RangeId, number>>({
    day: 0, week: 0, month: 0, quarter: 0, year: 0,
  });
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

  const interval = useMemo(() => {
    const now  = new Date();
    const off  = rangeOffsets[range] ?? 0;
    const yesterday = subDays(now, 1);

    if (range === 'day') {
      // JOUR offset=0 → aujourd'hui (j+0 inclus) ; offset<0 → jour passé complet
      const d = addDays(now, off);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    if (range === 'week') {
      const base  = addWeeks(now, off);
      const start = startOfWeek(base, { weekStartsOn: 1 });
      const end   = off === 0 ? endOfDay(yesterday) : endOfWeek(base, { weekStartsOn: 1 });
      return { start, end };
    }
    if (range === 'month') {
      const d   = addMonths(now, off);
      const end = off === 0 ? endOfDay(yesterday) : endOfMonth(d);
      return { start: startOfMonth(d), end };
    }
    if (range === 'quarter') {
      const d   = addMonths(now, off * 3);
      const q   = Math.floor(d.getMonth() / 3);
      const qs  = new Date(d.getFullYear(), q * 3, 1);
      const qe  = new Date(d.getFullYear(), q * 3 + 3, 0);
      const end = off === 0 ? endOfDay(yesterday) : endOfDay(qe);
      return { start: startOfDay(qs), end };
    }
    // year
    const d   = addYears(now, off);
    const end = off === 0 ? endOfDay(yesterday) : endOfYear(d);
    return { start: startOfYear(d), end };
  }, [range, rangeOffsets]);

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

        {/* Range selector — L1 type + L2 période défilante */}
        {RANGE_SUB_TABS.has(subTab) && (
          <div className="mt-5 mb-2">
            {/* L1 — type de granularité */}
            <div className="px-6 flex flex-row gap-2 mb-3">
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
                    <span className={`text-awan-xs font-mono opacity-50 ${active ? 'text-awan-gold' : 'text-awan-tx-mute'}`} style={{ fontSize: 8 }}>
                      {r.sublabel}
                    </span>
                  </Touch>
                );
              })}
            </div>

            {/* L2 — périodes défilantes (mémorisées par type) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
              {buildPeriodChips(range).map(chip => {
                const active = (rangeOffsets[range] ?? 0) === chip.offset;
                return (
                  <Touch
                    key={chip.offset}
                    className={`px-3 py-2 border items-center min-w-[48px] ${active ? 'bg-awan-gold/20 border-awan-gold' : 'border-white/5 bg-white/3'}`}
                    onPress={() => setRangeOffsets((prev: Record<RangeId, number>) => ({ ...prev, [range]: chip.offset }))}
                  >
                    <span className={`text-awan-sm font-black font-mono tracking-wider ${active ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>
                      {chip.label}
                    </span>
                    {chip.sublabel ? (
                      <span className={`font-mono opacity-50 ${active ? 'text-awan-gold' : 'text-awan-tx-mute'}`} style={{ fontSize: 8 }}>
                        {chip.sublabel}
                      </span>
                    ) : null}
                  </Touch>
                );
              })}
            </ScrollView>
          </div>
        )}

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
