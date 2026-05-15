import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { useMealStore } from '../hooks/useMealStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { ds } from '../utils/storage';
import { sessionsThisWeek } from '../hooks/useAwanScore';
import { MealService } from '../services/mealService';

function toStatus(pct: number) {
  if (pct >= 75) return 'ok' as const;
  if (pct >= 40) return 'warn' as const;
  return 'error' as const;
}

export default function SanteScreen({ navigate }: any) {
  const workoutStore  = useWorkoutStore();
  const mealStore     = useMealStore(ds(new Date()));
  const measureStore  = useMeasurementStore();

  const KCAL_TARGET = useMemo(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('awan.nutrition.profile') ?? '{}');
      return typeof profile.targetKcal === 'number' ? profile.targetKcal : 2000;
    } catch { return 2000; }
  }, []);

  const sessCount     = sessionsThisWeek(workoutStore.sessions as Array<{ date?: string; startTime?: number }>);
  const latestMeasure = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const kcal          = mealStore.totals.kcal;
  const kcalPct       = Math.min(100, Math.round((kcal / KCAL_TARGET) * 100));
  const sportPct      = Math.min(100, sessCount * 25);

  // ── Trend Sport — séances semaine N-1 ───────────────────────────────────────
  const sessPrevWeek = useMemo(() => {
    const now = Date.now();
    const weekAgo  = now - 7  * 24 * 60 * 60 * 1000;
    const twoWeeks = now - 14 * 24 * 60 * 60 * 1000;
    return (workoutStore.sessions as Array<{ startTime?: number }>).filter(s => {
      const t = s.startTime ?? 0;
      return t >= twoWeeks && t < weekAgo;
    }).length;
  }, [workoutStore.sessions]);

  const sportDelta = useMemo<string | undefined>(() => {
    const d = sessCount - sessPrevWeek;
    if (d === 0) return '= séances';
    return `${d > 0 ? '+' : ''}${d} séance${Math.abs(d) > 1 ? 's' : ''}`;
  }, [sessCount, sessPrevWeek]);

  // ── Trend Nutrition — kcal moyen 7j vs 7j précédents ────────────────────────
  const [nutritionDelta, setNutritionDelta] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const recent: string[] = [];
    const prior:  string[] = [];
    for (let i = 0; i < 7;  i++) recent.push(ds(new Date(now.getTime() - i * dayMs)));
    for (let i = 7; i < 14; i++) prior.push(ds(new Date(now.getTime() - i * dayMs)));

    Promise.all([
      Promise.all(recent.map(d => MealService.getByDate(d))),
      Promise.all(prior.map(d  => MealService.getByDate(d))),
    ]).then(([recentMeals, priorMeals]) => {
      if (!active) return;
      const sumKcal = (days: Awaited<ReturnType<typeof MealService.getByDate>>[]) =>
        days.reduce((s, ms) => s + MealService.totals(ms).kcal, 0);
      const avgRecent = sumKcal(recentMeals) / 7;
      const avgPrior  = sumKcal(priorMeals)  / 7;
      if (avgRecent === 0 && avgPrior === 0) {
        setNutritionDelta(undefined);
        return;
      }
      const d = Math.round(avgRecent - avgPrior);
      if (d === 0) setNutritionDelta('= kcal');
      else setNutritionDelta(`${d > 0 ? '+' : ''}${d} kcal`);
    });

    return () => { active = false; };
  }, []);

  // ── Trend Mensuration — delta poids 7j vs 7j précédents ─────────────────────
  const weightDelta = useMemo<string | undefined>(() => {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const recent = measureStore.history.filter(m => {
      const diff = now.getTime() - new Date(m.date).getTime();
      return diff >= 0 && diff < 7 * dayMs;
    });
    const prior = measureStore.history.filter(m => {
      const diff = now.getTime() - new Date(m.date).getTime();
      return diff >= 7 * dayMs && diff < 14 * dayMs;
    });
    if (recent.length === 0 || prior.length === 0) return undefined;
    const avg = (arr: typeof recent) => arr.reduce((s, m) => s + m.weight, 0) / arr.length;
    const d = avg(recent) - avg(prior);
    if (Math.abs(d) < 0.05) return '= kg';
    return `${d > 0 ? '+' : ''}${d.toFixed(1)} kg`;
  }, [measureStore.history]);

  return (
    <ScrollView
      style={{ flex: 1, width: '100%', maxWidth: '100%' }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100, width: '100%', maxWidth: '100%' }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader tag="BODY" title="SANTÉ" />

      {/* ── 2×2 modules ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <InstrumentCard
          label="SPORT"
          value={sessCount}
          unit="séances/sem"
          status={toStatus(sportPct)}
          progress={sportPct}
          index={1}
          onPress={() => navigate('Sport')}
          {...(sportDelta ? { delta: sportDelta } : {})}
        />
        <InstrumentCard
          label="NUTRITION"
          value={kcal}
          unit="kcal"
          status={toStatus(kcalPct)}
          progress={kcalPct}
          index={2}
          onPress={() => navigate('Nutrition')}
          {...(nutritionDelta ? { delta: nutritionDelta } : {})}
        />
        <InstrumentCard
          label="MENSURATION"
          value={latestMeasure?.weight ?? '—'}
          unit={latestMeasure ? 'kg' : ''}
          status={latestMeasure ? 'ok' : 'mute'}
          index={3}
          onPress={() => navigate('Mensuration')}
          {...(weightDelta ? { delta: weightDelta } : {})}
        />
      </div>

      {/* ── Macros résumé ──────────────────────────────────────────────────────── */}
      {kcal > 0 && (
        <div
          className="p-4 border mb-4"
          style={{
            backgroundColor: 'var(--color-awan-surface)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <span
            className="uppercase block mb-3"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '7px',
              fontWeight: 'var(--fw-mute)' as any,
              color: 'var(--color-awan-tx-mute)',
              letterSpacing: '0.3em',
            }}
          >
            MACROS [05]
          </span>
          <div className="grid grid-cols-3 gap-4">
            {([['P', mealStore.totals.p], ['G', mealStore.totals.c], ['L', mealStore.totals.f]] as const).map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '7px',
                    fontWeight: 'var(--fw-mute)' as any,
                    color: 'var(--color-awan-tx-mute)',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--color-awan-tx)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {v}<span style={{ fontSize: '10px', opacity: 0.5, marginLeft: 2 }}>g</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Statut système ─────────────────────────────────────────────────────── */}
      <div
        className="p-4 border"
        style={{
          backgroundColor: 'var(--color-awan-surface)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <span
          className="uppercase block mb-1"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '7px',
            fontWeight: 'var(--fw-mute)' as any,
            color: 'var(--color-awan-tx-mute)',
            letterSpacing: '0.3em',
          }}
        >
          MONITORING BIOSPHÈRE [06]
        </span>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 'var(--fw-body)' as any,
            color: 'var(--color-awan-tx-dim)',
          }}
        >
          {sessCount} séance{sessCount !== 1 ? 's' : ''} cette semaine · {kcalPct}% objectif calorique
        </span>
      </div>
    </ScrollView>
  );
}
