import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  startOfDay, endOfDay, subDays, subMonths,
  parseISO, format, startOfWeek, eachDayOfInterval,
} from 'date-fns';
import { CATS } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { ds } from '../utils/storage';
import { eventsForDate } from '../utils/recurrence';
import { LocalAIService } from '../services/localAIService';
import { MealService } from '../services/mealService';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useMealStore } from '../hooks/useMealStore';
import { usePrayerStore } from '../hooks/usePrayerStore';
import { useWeightStore } from '../hooks/useWeightStore';
import { PageWrapper, AnimatePresence } from '../components/Animated';
import {
  Activity, Dumbbell, Ruler, Flame, TrendingUp,
  Trophy, Heart, BarChart2, Zap,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Touch } from '../components/ui/Touch';
import { BilanZen } from '../components/BilanZen';
import { motion } from 'motion/react';

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

const FREE_KEY = '_free';
const FREE_COLOR = 'rgba(212, 175, 55, 0.05)';
const FREE_LABEL = 'Temps libre';

const TABS = [
  { id: 'activity',  label: 'FLUX',    Icon: Activity },
  { id: 'nutrition', label: 'NUTR.',   Icon: Flame },
  { id: 'wn1',       label: 'DENSITÉ', Icon: TrendingUp },
  { id: 'wn4',       label: 'SYNOPT.', Icon: BarChart2 },
  { id: 'wn5',       label: 'MÉTABO',  Icon: Zap },
  { id: 'muscu',     label: 'MUSCU',   Icon: Dumbbell },
  { id: 'perf',      label: 'PERF',    Icon: Trophy },
  { id: 'recup',     label: 'RÉCUP',   Icon: Heart },
  { id: 'measures',  label: 'CORPO',   Icon: Ruler },
  { id: 'ortho',     label: 'ORTHO',   Icon: Ruler },
  { id: 'cross',     label: 'CORRÉLA.',Icon: TrendingUp },
];

const RANGES = [
  { id: 'day', label: '24H' },
  { id: 'week', label: '07D' },
  { id: 'month', label: '30D' },
];

// Tabs that use the range selector
const RANGE_TABS = new Set(['activity', 'nutrition', 'muscu', 'measures']);

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

  const workoutStore = useWorkoutStore();
  const measureStore = useMeasurementStore();
  const prayerStore = usePrayerStore(today);
  const mealStoreToday = useMealStore(today);
  const weightStore = useWeightStore();

  const categories = useMemo((): Record<string, { l: string; c: string }> => ({ ...CATS }), []);
  const getColorForKey = (key: string) => (key === FREE_KEY ? FREE_COLOR : categories[key]?.c ?? theme.title);
  const getLabelForKey = (key: string) => (key === FREE_KEY ? FREE_LABEL : categories[key]?.l ?? key);

  const interval = useMemo(() => {
    const now = new Date();
    let start = startOfDay(now);
    const end = endOfDay(now);
    if (range === 'week') start = startOfWeek(subDays(now, 6), { weekStartsOn: 1 });
    if (range === 'month') start = subMonths(now, 1);
    return { start, end };
  }, [range]);

  const activityData = useMemo(() => {
    const totals: Record<string, number> = {};
    let totalMinutes = 0;
    const days = eachDayOfInterval(interval);
    days.forEach(day => {
      const evs = eventsForDate(null, ds(day));
      evs.forEach((ev: any) => {
        if (!ev.time) return;
        totals[ev.category || 'perso'] = (totals[ev.category || 'perso'] ?? 0) + (ev.duration || 30);
        totalMinutes += (ev.duration || 30);
      });
    });
    totals[FREE_KEY] = Math.max(0, days.length * 1440 - totalMinutes);
    return Object.entries(totals).map(([key, value]) => ({
      key, value, color: getColorForKey(key), label: getLabelForKey(key),
    })).sort((a, b) => b.value - a.value);
  }, [categories, interval]);

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
    return measureStore.history
      .filter(m => { const d = parseISO(m.date); return d >= interval.start && d <= interval.end; })
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(m => ({ label: format(parseISO(m.date), 'dd/MM'), weight: m.weight }));
  }, [measureStore.history, interval]);

  useEffect(() => {
    const sorted = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted.at(-1) ?? null;
    const prev = sorted.at(-2) ?? null;
    const wTrend = latest && prev
      ? latest.weight > prev.weight ? 'up' : latest.weight < prev.weight ? 'down' : 'stable'
      : null;
    setAiLoading(true);
    LocalAIService.generateZenSummary({
      kcalToday: mealsByDay.at(-1)?.kcal,
      prayersDone: prayerStore.doneCount,
      prayersTotal: prayerStore.total,
      lastWorkoutName: workoutStore.sessions.at(-1)?.name ?? null,
      weightKg: latest?.weight ?? null,
      weightTrend: wTrend,
    }).then(s => { setAiSummary(s); setAiLoading(false); });
  }, [measureStore.history, mealsByDay, workoutStore.sessions, prayerStore.doneCount]);

  // Poids pour EAT (FluxDensiteTab)
  const bodyWeightKg = weightStore.avg7d ?? weightStore.entries[0]?.weightKg ?? null;

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
                  weightKg: measureStore.history.at(-1)?.weight ?? null,
                }).then(s => { setAiSummary(s); setAiLoading(false); });
              }}
            />
          </div>
        </div>

        {/* Tab bar — horizontalement scrollable (11 tabs) */}
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
                  <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${tab === id ? 'text-awan-gold' : 'text-awan-tx-mute'}`}>{label}</span>
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
                todayKcal={mealStoreToday.totals.kcal}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </ScrollView>
    </PageWrapper>
  );
}
