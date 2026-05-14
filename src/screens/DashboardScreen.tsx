import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { TRANSPORT_ICONS } from '../constants/icons';
import { L, TRANSPORT_OPTIONS } from '../constants/labels';
import { ds } from '../utils/storage';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { Touch } from '../components/ui/Touch';
import { QuickActions } from '../components/ui/QuickActions';
import { BilanZen } from '../components/BilanZen';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { AwanScoreDisplay } from '../components/AwanScoreDisplay';
import { SpiritualService } from '../utils/spiritualService';
import { LocalAIService } from '../services/localAIService';
import { useMealStore } from '../hooks/useMealStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { usePrayerStore } from '../hooks/usePrayerStore';
import { useAwanScore, sessionsThisWeek } from '../hooks/useAwanScore';
import { useHealthScore } from '../hooks/useHealthScore';
import { useTemporalMode } from '../hooks/useTemporalMode';
import { useCoach } from '../hooks/useCoach';
import type { Severity } from '../data/schemas/coach/rule';
import type { Advice } from '../data/schemas/coach/assessment';
import type { NavProps } from '../types/nav';
import arabicData from '../assets/data/1.json';

// ── Constantes ─────────────────────────────────────────────────────────────────

const KCAL_TARGET_DEFAULT = 2000;

interface PrayerInfo {
  next: string;
  timeForNext: Date | null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigate }: NavProps) {
  const theme = useTheme();
  const today = ds(new Date());
  const [transportMode, setTransportMode] = useState<string>('car');
  const [aiSummary, setAiSummary] = useState('');

  // Stores existants — conservés intégralement
  const mealStore    = useMealStore(today);
  const measureStore = useMeasurementStore();
  const workoutStore = useWorkoutStore();
  const prayerStore  = usePrayerStore(today);

  // Mode temporel adaptatif
  const temporal = useTemporalMode();

  // Coach — conseil de plus haute sévérité du jour
  const { assessments: coachAssessments } = useCoach(today);
  const topAdvice = useMemo<Advice | null>(() => {
    const order: Record<Severity, number> = { alert: 0, warn: 1, good: 2, info: 3 };
    const all: Advice[] = coachAssessments.flatMap((a) => a.advices);
    if (all.length === 0) return null;
    return [...all].sort((a, b) => order[a.severity] - order[b.severity])[0] ?? null;
  }, [coachAssessments]);
  const coachAnalyzed = coachAssessments.length > 0;
  const COACH_SEVERITY_COLOR: Record<Severity, string> = {
    info:  'var(--color-awan-gold)',
    good:  'rgb(34,197,94)',
    warn:  'rgb(251,191,36)',
    alert: 'rgb(239,68,68)',
  };

  // Score global AWAN — calculé à partir des données réelles
  const sessionsCount = useMemo(
    () => sessionsThisWeek(workoutStore.sessions as Array<{ date?: string; startTime?: number }>),
    [workoutStore.sessions],
  );

  const score = useAwanScore({
    prayersDone:     prayerStore.doneCount,
    kcalLogged:      mealStore.totals.kcal,
    kcalTarget:      KCAL_TARGET_DEFAULT,
    sessionsThisWeek: sessionsCount,
    mentalScore:     null, // v2 : données mentales pas encore branchées
    tasksDone:       0,
    tasksTotal:      0,
  });

  // Health Score composite — Sport/Nutrition/Mensuration/Mental/Islam
  const health = useHealthScore();
  const HEALTH_LABEL_COLOR: Record<typeof health.scoreLabel, string> = {
    CRITIQUE: 'var(--color-awan-status-error)',
    MOYEN:    'var(--color-awan-status-warn)',
    BON:      'var(--color-awan-status-ok)',
    OPTIMAL:  'var(--color-awan-gold)',
  };

  // Prochaine prière
  const prayerInfo = useMemo<PrayerInfo>(() => {
    const pt = SpiritualService.getPrayerTimes() as { next: string; timeForNext: Date | null };
    return { next: pt.next, timeForNext: pt.timeForNext };
  }, []);
  const nextPrayerName = SpiritualService.translatePrayer(prayerInfo.next) as string;
  const timeDiff = prayerInfo.timeForNext
    ? Math.floor((prayerInfo.timeForNext.getTime() - Date.now()) / 60_000)
    : 0;
  const prayerH = Math.floor(timeDiff / 60);
  const prayerM = timeDiff % 60;

  // AI Summary
  useEffect(() => {
    const latestMeasure = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
    LocalAIService.generateZenSummary({
      kcalToday:       mealStore.totals.kcal,
      prayersDone:     prayerStore.doneCount,
      prayersTotal:    prayerStore.total,
      lastWorkoutName: workoutStore.sessions.at(-1)?.name ?? null,
      weightKg:        latestMeasure?.weight ?? null,
    }).then(setAiSummary);
  }, [mealStore.totals.kcal, prayerStore.doneCount, workoutStore.sessions.length, measureStore.history.length]);

  // Mot arabe du jour
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  const word = (arabicData as Array<{ ar: string; fr: string }>)[dayOfYear % arabicData.length] ?? { ar: '', fr: '' };

  // Dernière mesure
  const latestMeasure = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const lastSession   = workoutStore.sessions.at(-1);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header sobre — date + statut ─────────────────────────────────────── */}
      <div className="flex justify-between items-baseline mb-6">
        <div className="flex flex-col">
          <span
            className="uppercase block mb-1"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '8px',
              fontWeight: 'var(--fw-mute)' as any,
              color: 'var(--color-awan-tx-mute)',
              letterSpacing: '0.4em',
            }}
          >
            TERMINAL · {today}
          </span>
          <span
            className="capitalize"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: 'var(--fw-label)' as any,
              color: 'var(--color-awan-tx)',
              letterSpacing: '0.05em',
            }}
          >
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            fontWeight: 400,
            color: 'var(--color-awan-status-ok)',
            letterSpacing: '0.2em',
          }}
        >
          ● LIVE
        </span>
      </div>

      {/* ── Score global AWAN — instrument principal ─────────────────────────── */}
      <div className="mb-4">
        <AwanScoreDisplay score={score} temporal={temporal} />
      </div>

      {/* ── Health Score composite — synthèse Sport/Nutri/Mensu/Mental/Islam ── */}
      <div
        className="p-4 border mb-4 flex flex-row items-center justify-between"
        style={{
          backgroundColor: 'var(--color-awan-surface)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex flex-col">
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
            HEALTH SCORE [00]
          </span>
          <span
            className="font-mono font-bold uppercase"
            style={{
              fontSize: '10px',
              color: HEALTH_LABEL_COLOR[health.scoreLabel],
              letterSpacing: '0.2em',
            }}
          >
            {health.scoreLabel}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="font-mono font-bold"
            style={{
              fontSize: '32px',
              color: 'var(--color-awan-tx)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {health.score}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: '10px',
              color: 'var(--color-awan-tx-mute)',
            }}
          >
            /100
          </span>
        </div>
      </div>

      {/* ── Grille 2×2 — cadrans des 4 domaines ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <InstrumentCard
          label="SPIRIT"
          value={prayerStore.doneCount}
          unit={`/${prayerStore.total}`}
          status={score.spirit.status}
          progress={score.spirit.value}
          index={1}
          onPress={() => navigate('Islam')}
        />
        <InstrumentCard
          label="BODY"
          value={mealStore.totals.kcal}
          unit="kcal"
          status={score.body.status}
          progress={score.body.value}
          index={2}
          onPress={() => navigate('Sante')}
        />
        {score.mind.value > 0 ? (
          <InstrumentCard
            label="MIND"
            value={score.mind.value}
            status={score.mind.status}
            progress={score.mind.value}
            index={3}
            onPress={() => navigate('Mental')}
          />
        ) : (
          <InstrumentCard
            label="MIND"
            value="—"
            status={score.mind.status}
            index={3}
            onPress={() => navigate('Mental')}
          />
        )}
        <InstrumentCard
          label="TIME"
          value={`${prayerH}h${String(prayerM).padStart(2, '0')}`}
          unit={`→ ${nextPrayerName}`}
          status={score.time.status}
          index={4}
          onPress={() => navigate('Planning')}
        />
      </div>

      {/* ── Section Islam — mot arabe + prière ────────────────────────────────── */}
      <Touch onPress={() => navigate('Islam')} className="block w-full text-left mb-4">
        <div
          className="p-4 border flex flex-row items-center gap-4"
          style={{
            backgroundColor: 'var(--color-awan-surface)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex-1">
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
              MOT DU JOUR [{String((dayOfYear % arabicData.length) + 1).padStart(3, '0')}]
            </span>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                fontWeight: 'var(--fw-body)' as any,
                color: 'var(--color-awan-tx-dim)',
              }}
            >
              {word.fr}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '32px',
              fontWeight: 'var(--fw-value)' as any,
              color: 'var(--color-awan-gold)',
              lineHeight: 1,
            }}
          >
            {word.ar}
          </span>
        </div>
      </Touch>

      {/* ── Modules — mesures + nutrition condensées ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <InstrumentCard
          label="POIDS"
          value={latestMeasure?.weight ?? '—'}
          unit={latestMeasure ? 'kg' : ''}
          status={latestMeasure ? 'ok' : 'mute'}
          index={5}
          onPress={() => navigate('Mensuration')}
        />
        <InstrumentCard
          label="DERNIÈRE SÉANCE"
          value={lastSession?.name ? lastSession.name.slice(0, 8).toUpperCase() : '—'}
          status={lastSession ? 'spirit' : 'mute'}
          index={6}
          onPress={() => navigate('Sport')}
        />
      </div>

      {/* ── Macros détaillées si présentes ────────────────────────────────────── */}
      {mealStore.totals.kcal > 0 && (
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
            MACROS DU JOUR [07]
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
                  }}
                  className="uppercase"
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

      {/* ── Transport — mode rapide ───────────────────────────────────────────── */}
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
          MODE TRANSPORT [08]
        </span>
        <div className="flex flex-row gap-2">
          {(TRANSPORT_OPTIONS as Array<{ key: string; label: string }>).map((opt) => {
            const icons  = TRANSPORT_ICONS as Record<string, React.ComponentType<{ size: number; color: string }>>;
            const Icon   = icons[opt.key];
            const active = transportMode === opt.key;
            return (
              <Touch
                key={opt.key}
                className="flex-1 flex flex-col items-center p-3 border transition-all"
                style={{
                  backgroundColor: active ? 'rgba(212,175,55,0.08)' : 'transparent',
                  borderColor: active ? 'var(--color-awan-gold)' : 'rgba(255,255,255,0.06)',
                }}
                onPress={() => setTransportMode(opt.key)}
              >
                {Icon && <Icon size={18} color={active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)'} />}
                <span
                  className="mt-1 uppercase"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '7px',
                    fontWeight: active ? 'var(--fw-value)' : 'var(--fw-label)',
                    color: active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)',
                    letterSpacing: '0.2em',
                  } as any}
                >
                  {opt.label}
                </span>
              </Touch>
            );
          })}
        </div>
      </div>

      {/* ── Coach — conseil prioritaire ───────────────────────────────────────── */}
      <Touch onPress={() => navigate('Coach')} className="block w-full text-left mb-4">
        <div
          className="p-4 border flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--color-awan-surface)',
            borderColor: topAdvice
              ? `${COACH_SEVERITY_COLOR[topAdvice.severity]}33`
              : 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex flex-row justify-between items-baseline">
            <span
              className="uppercase block"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '7px',
                fontWeight: 'var(--fw-mute)' as any,
                color: 'var(--color-awan-tx-mute)',
                letterSpacing: '0.3em',
              }}
            >
              COACH · IA
            </span>
            {topAdvice && (
              <span
                className="font-mono font-bold uppercase"
                style={{
                  fontSize: '8px',
                  color: COACH_SEVERITY_COLOR[topAdvice.severity],
                  letterSpacing: '0.2em',
                }}
              >
                {topAdvice.severity}
              </span>
            )}
          </div>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              fontWeight: 'var(--fw-body)' as any,
              color: 'var(--color-awan-tx)',
            }}
          >
            {topAdvice
              ? topAdvice.key
              : coachAnalyzed
                ? 'Aucune anomalie détectée.'
                : 'Analyse non effectuée'}
          </span>
        </div>
      </Touch>

      {/* ── BilanZen — synthèse IA en pied de page (mode SOIR/NUIT prioritaire) ── */}
      {(temporal.mode === 'SOIR' || temporal.mode === 'NUIT' || aiSummary) && (
        <div className="mt-2 mb-2">
          <BilanZen summary={aiSummary || 'Chargement...'} loading={!aiSummary} />
        </div>
      )}

      <QuickActions onNavigate={navigate} />
    </ScrollView>
  );
}
