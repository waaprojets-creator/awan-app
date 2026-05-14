import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { useMealStore } from '../hooks/useMealStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { ds } from '../utils/storage';
import { sessionsThisWeek } from '../hooks/useAwanScore';

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

  const sessCount     = sessionsThisWeek(workoutStore.sessions as any);
  const latestMeasure = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const kcal          = mealStore.totals.kcal;
  const kcalPct       = Math.min(100, Math.round((kcal / KCAL_TARGET) * 100));
  const sportPct      = Math.min(100, sessCount * 25);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
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
        />
        <InstrumentCard
          label="NUTRITION"
          value={kcal}
          unit="kcal"
          status={toStatus(kcalPct)}
          progress={kcalPct}
          index={2}
          onPress={() => navigate('Nutrition')}
        />
        <InstrumentCard
          label="MENSURATION"
          value={latestMeasure?.weight ?? '—'}
          unit={latestMeasure ? 'kg' : ''}
          status={latestMeasure ? 'ok' : 'mute'}
          index={3}
          onPress={() => navigate('Mensuration')}
        />
        <InstrumentCard
          label="MENTAL"
          value="—"
          status="mute"
          index={4}
          onPress={() => navigate('Mental')}
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
