import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  startOfDay, endOfDay, subDays, subMonths,
  parseISO, format, startOfWeek, eachDayOfInterval,
} from 'date-fns';
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
  Activity, Dumbbell, Ruler, Flame, TrendingUp,
  Trophy, Heart, BarChart2, Zap, Moon, Clock, Star,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Touch } from '../components/ui/Touch';
import { BilanZen } from '../components/BilanZen';
import { motion } from 'motion/react';
import type { SleepEntryLatest } from '../data/schemas/sleep/sleepEntry';
import TempsTab from './analyse/TempsTab';
import ScanTab from './analyse/ScanTab';

// ─── Tab components ───────────────────────────────────────────────────────────
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

const FREE_KEY = '_free';
const FREE_COLOR = 'rgba(212, 175, 55, 0.05)';
const FREE_LABEL = 'Temps libre';

const TABS = [
  { id: 'temps',      label: 'TEMPS',    Icon: Clock },
  { id: 'activity',   label: 'FLUX',     Icon: Activity },
  { id: 'nutrition',  label: 'NUTR.',    Icon: Flame },
  { id: 'wn1',        label: 'DENSITÉ',  Icon: TrendingUp },
  { id: 'wn4',        label: 'SYNOPT.',  Icon: BarChart2 },
  { id: 'wn5',        label: 'MÉTABO',   Icon: Zap },
  { id: 'muscu',      label: 'MUSCU',    Icon: Dumbbell },
  { id: 'perf',       label: 'PERF',     Icon: Trophy },
  { id: 'recup',      label: 'RÉCUP',    Icon: Heart },
  { id: 'measures',   label: 'CORPO',    Icon: Ruler },
  { id: 'scan',       label: 'SCAN',     Icon: Ruler },
  { id: 'ortho',      label: 'ORTHO',    Icon: Ruler },
  { id: 'cross',      label: 'CORRÉLA.', Icon: TrendingUp },
  { id: 'islam',      label: 'ISLAM',    Icon: Star },
];

const RANGES = [
  { id: 'week', label: '07D' },
  { id: 'month', label: '30D' },
  { id: 'quarter', label: '90D' },
];

// Tabs that use the range selector
const RANGE_TABS = new Set(['activity', 'nutrition', 'muscu', 'measures']);

export default function AnalyseScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const today = ds(new Date());
  const [tab, setTab] = useState('temps');
  const [range, setRange] = useState('week');
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
    SleepService.getAll().then(setSleepEntries).catch(() => {});
  }, [dataVersion]);

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
    if (!RANGE_TABS.has(tab)) return;
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
  }, [interval, tab]);

  const weightTrend = useMemo(() => {
    const sortedWeights = [...weightStore.entries].sort((a, b) => a.date.localeCompare(b.date));
    const filtered = measureStore.history
      .filter(m => { const d = parseISO(m.date); return d >= interval.start && d <= interval.end; })
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    return filtered.map(m => {
      // Binary search: last weight entry with date <= m.date — O(log n) vs O(n²)
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
    const weightTrend = latest && prev
      ? latest.weightKg > prev.weightKg ? 'up' : latest.weightKg < prev.weightKg ? 'down' : 'stable'
      : null;
    setAiLoading(true);
    LocalAIService.generateZenSummary({
      kcalToday: mealsByDay.at(-1)?.kcal,
      prayersDone: prayerStore.doneCount,
      prayersTotal: prayerStore.total,
      lastWorkoutName: workoutStore.sessions.at(-1)?.name ?? null,
      weightKg: latest?.weightKg ?? null,
      weightTrend,
    }).then(s => { setAiSummary(s); setAiLoading(false); });
  }, [weightStore.entries, mealsByDay, workoutStore.sessions, prayerStore.doneCount]);

  // Poids pour EAT (FluxDensiteTab)
  const bodyWeightKg = weightStore.avg7d ?? weightStore.entries[0]?.weightKg ?? null;

  // activityData: pie-chart slices from workout + meals + prayers + sleep
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

  return (
    <PageWrapper style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
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

        {/* Tab bar — horizontalement scrollable */}
        <div className="mb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            <div className="border-b border-white/10 flex flex-row">
              {TABS.map(({ id, label, Icon }) => (
                <Touch
                  key={id}
                  className={`px-3 py-3 items-center justify-center border-b-2 transition-all min-w-[56px] ${tab === id ? 'border-awan-gold' : 'border-transparent opacity-40'}`}
                  onPress={() => setTab(id)}
                >
                  <Icon size={16} className={tab === id ? 'text-awan-gold' : 'text-awan-tx-mute'} />
                  <span className={`awan-label-sm mt-1 ${tab === id ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>{label}</span>
                </Touch>
              ))}
            </div>
          </ScrollView>
        </div>

        {/* Range selector — only for relevant tabs */}
        {RANGE_TABS.has(tab) && (
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
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={tab + range}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-6"
          >
            {tab === 'temps' && <TempsTab />}

            {tab === 'activity' && <ActivityTab data={activityData} />}

            {tab === 'nutrition' && (
              <NutritionTab
                mealsByDay={mealsByDay}
                mealsLoading={mealsLoading}
                todayKcal={mealStoreToday.totals.kcal}
                todayP={mealStoreToday.totals.p}
                todayC={mealStoreToday.totals.c}
                todayF={mealStoreToday.totals.f}
              />
            )}

            {tab === 'wn1' && (
              <FluxDensiteTab
                sessions={workoutStore.sessions}
                weightKg={bodyWeightKg}
              />
            )}

            {tab === 'wn4' && <SynoptiqueTab sessions={workoutStore.sessions} />}

            {tab === 'wn5' && <MetaboliqueTab />}

            {tab === 'muscu' && (
              <MuscuTab stats={muscuStats} loading={workoutStore.loading} />
            )}

            {tab === 'perf' && <PerformanceTab sessions={workoutStore.sessions} />}

            {tab === 'recup' && <RecoveryTab sessions={workoutStore.sessions} />}

            {tab === 'scan' && <ScanTab />}

            {tab === 'measures' && (
              <BiometrieTab
                weightTrend={weightTrend}
                history={measureStore.history}
                loading={measureStore.loading}
              />
            )}

            {tab === 'ortho' && (
              <OrthometryTab
                history={measureStore.history}
                loading={measureStore.loading}
              />
            )}

            {tab === 'cross' && (
              <CorrelationTab
                sessions={workoutStore.sessions}
                history={measureStore.history}
                weightEntries={weightStore.entries}
                todayKcal={mealStoreToday.totals.kcal}
              />
            )}

            {tab === 'islam' && <IslamTab />}
          </motion.div>
        </AnimatePresence>
      </ScrollView>
    </PageWrapper>
  );
}
