import React, { useState, useMemo, useEffect } from 'react';
import { ScrollView, TextInput as RNTextInput } from 'react-native';
import { Upload, X } from 'lucide-react';
import { getAdviceText } from '../constants/coachAdvice';
import { DEFAULT_KCAL_TARGET } from '../constants/app';
import { safeStorage } from '../utils/safeStorage';
import { L, DATE_FORMAT_BANNER, TRANSPORT_OPTIONS } from '../constants/labels';
import { TRANSPORT_ICONS } from '../constants/icons';
import { ds } from '../utils/storage';
import { Card } from '../components/ui/Card';
import { Touch } from '../components/ui/Touch';
import { InstrumentCard } from '../components/ui/InstrumentCard';
import { AwanScoreDisplay } from '../components/AwanScoreDisplay';
import { SpiritualService } from '../utils/spiritualService';
import { importFromJson } from '../utils/importJson';
import { useMealStore } from '../hooks/useMealStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { usePrayerStore } from '../hooks/usePrayerStore';
import { useAwanScore, sessionsThisWeek } from '../hooks/useAwanScore';
import { WorkoutService } from '../services/workoutService';
import { useHealthScore } from '../hooks/useHealthScore';
import { useTemporalMode } from '../hooks/useTemporalMode';
import { useCoach } from '../hooks/useCoach';
import { useDaily } from '../context/DailyContext';
import type { Severity } from '../data/schemas/coach/rule';
import type { Advice } from '../data/schemas/coach/assessment';
import type { NavProps } from '../types/nav';
import arabicData from '../assets/data/1.json';
import { useToast } from '../components/ui/Toast';

const KCAL_TARGET_DEFAULT = DEFAULT_KCAL_TARGET;
const TextInput = RNTextInput as React.ComponentType<any>;

const dash = (L as any).dash as any;
const common = (L as any).common as any;

interface PrayerInfo { next: string; timeForNext: Date | null; }

export default function DashboardScreen({ navigate }: NavProps) {
  const today = ds(new Date());
  const [transportMode, setTransportMode] = useState<string>('car');
  const [importModal, setImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const { toast } = useToast();

  const mealStore    = useMealStore(today);
  const measureStore = useMeasurementStore();
  const workoutStore = useWorkoutStore();
  const prayerStore  = usePrayerStore(today);
  const temporal     = useTemporalMode();

  const { getEntriesByDate } = useDaily();
  const trajetEntries = useMemo(
    () => (getEntriesByDate(today) as any[]).filter((e: any) => e.module === 'trajet'),
    [today, getEntriesByDate]
  );

  const { assessments: coachAssessments } = useCoach(today);
  const topAdvice = useMemo<Advice | null>(() => {
    const order: Record<Severity, number> = { alert: 0, warn: 1, good: 2, info: 3 };
    const all: Advice[] = coachAssessments.flatMap((a) => a.advices);
    if (all.length === 0) return null;
    return [...all].sort((a, b) => order[a.severity] - order[b.severity])[0] ?? null;
  }, [coachAssessments]);
  const coachAnalyzed = coachAssessments.length > 0;
  const COACH_COLOR: Record<Severity, string> = {
    info:  'var(--color-awan-gold)',
    good:  'rgb(34,197,94)',
    warn:  'rgb(251,191,36)',
    alert: 'rgb(239,68,68)',
  };

  const sessionsCount = useMemo(
    () => sessionsThisWeek(workoutStore.sessions as Array<{ date?: string; startTime?: number }>),
    [workoutStore.sessions],
  );

  const kcalTargetScore = useMemo(() => {
    try { const p = JSON.parse(safeStorage.get('awan.nutrition.profile') ?? '{}'); return typeof p.targetKcal === 'number' ? p.targetKcal : KCAL_TARGET_DEFAULT; }
    catch { return KCAL_TARGET_DEFAULT; }
  }, []);

  const score = useAwanScore({
    prayersDone:      prayerStore.doneCount,
    kcalLogged:       mealStore.totals.kcal,
    kcalTarget:       kcalTargetScore,
    sessionsThisWeek: sessionsCount,
    tasksDone:        0,
    tasksTotal:       0,
  });

  const health = useHealthScore();
  const HEALTH_COLOR: Record<typeof health.scoreLabel, string> = {
    CRITIQUE: 'var(--color-awan-status-error)',
    MOYEN:    'var(--color-awan-status-warn)',
    BON:      'var(--color-awan-status-ok)',
    OPTIMAL:  'var(--color-awan-gold)',
  };

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

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  const word = (arabicData as Array<{ ar: string; fr: string }>)[dayOfYear % arabicData.length] ?? { ar: '', fr: '' };

  const latestMeasure = measureStore.history.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const lastSession   = workoutStore.sessions.at(-1);

  const [nextRoutine, setNextRoutine] = useState<{ id: string; name: string; cycleLetter: string | null } | null>(null);
  useEffect(() => {
    void WorkoutService.computeNextRoutine(
      workoutStore.routines as Parameters<typeof WorkoutService.computeNextRoutine>[0],
      workoutStore.sessions as Parameters<typeof WorkoutService.computeNextRoutine>[1],
    ).then(r => setNextRoutine(r ? { id: r.id, name: r.name, cycleLetter: r.cycleLetter ?? null } : null));
  }, [workoutStore.routines, workoutStore.sessions]);

  const dateLabel = new Date().toLocaleDateString('fr-FR', DATE_FORMAT_BANNER as Intl.DateTimeFormatOptions);

  // Weekly retrospective computations
  const kcalTarget = useMemo(() => {
    try { const p = JSON.parse(safeStorage.get('awan.nutrition.profile') ?? '{}'); return p.targetKcal ?? KCAL_TARGET_DEFAULT; }
    catch { return KCAL_TARGET_DEFAULT; }
  }, []);

  const weeklyWeightDelta = useMemo(() => {
    const sorted = measureStore.history.filter(e => e.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 2) return null;
    const last = sorted.at(-1)!;
    const sevenDaysAgo = new Date(last.date);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenStr = sevenDaysAgo.toISOString().slice(0, 10);
    const baseline = [...sorted].reverse().find(e => e.date <= sevenStr);
    if (!baseline) return null;
    return last.weight - baseline.weight;
  }, [measureStore.history]);

  const isEarlyMorning = useMemo(() => new Date().getHours() < 10, []);

  return (
    <ScrollView
      style={{ flex: 1, width: '100%', maxWidth: '100%' }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100, width: '100%', maxWidth: '100%' }}
      showsVerticalScrollIndicator={false}
    >
      {/* Date — pas de titre de page */}
      <div className="flex justify-between items-baseline mb-6">
        <span
          className="capitalize"
          style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 'var(--fw-label)' as any, color: 'var(--color-awan-tx)', letterSpacing: '0.05em' }}
        >
          {dateLabel}
        </span>
      </div>

      {/* Score AWAN — widget principal avec ⓘ intégré */}
      <div className="mb-4">
        <AwanScoreDisplay score={score} temporal={temporal} onInfo={() => setShowScoreInfo(v => !v)} />
        {showScoreInfo && (
          <div
            className="mt-2 p-3 border"
            style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border)' }}
          >
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--color-awan-tx-dim)', lineHeight: 1.5 }}>
              {dash.widgets.scoreInfo}
            </span>
          </div>
        )}
      </div>

      {/* Transport — 2e widget */}
      <div className="p-4 border mb-4" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border)' }}>
        <span className="uppercase block mb-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
          {dash.widgets.transport}
        </span>
        <div className="flex flex-row gap-2">
          {(TRANSPORT_OPTIONS as Array<{ key: string; label: string }>).map((opt) => {
            const icons = TRANSPORT_ICONS as Record<string, React.ComponentType<{ size: number; color: string }>>;
            const Icon  = icons[opt.key];
            const active = transportMode === opt.key;
            return (
              <Touch key={opt.key} className="flex-1 flex flex-col items-center p-3 border transition-all"
                style={{ backgroundColor: active ? 'rgba(212,175,55,0.08)' : 'transparent', borderColor: active ? 'var(--color-awan-gold)' : 'var(--color-awan-border)' }}
                onPress={() => setTransportMode(opt.key)}>
                {Icon && <Icon size={18} color={active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)'} />}
                <span className="mt-1 uppercase" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: active ? 'var(--fw-value)' : 'var(--fw-label)', color: active ? 'var(--color-awan-gold)' : 'var(--color-awan-tx-mute)', letterSpacing: '0.2em' } as any}>
                  {opt.label}
                </span>
              </Touch>
            );
          })}
        </div>
      </div>

      {/* Health Score */}
      <div className="p-4 border mb-4 flex flex-row items-center justify-between"
        style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border)' }}>
        {health.loading ? (
          <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-awan-tx-dim)' }}>—</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              <span className="uppercase block mb-1" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
                HEALTH SCORE
              </span>
              <span className="font-mono font-bold uppercase" style={{ fontSize: '10px', color: HEALTH_COLOR[health.scoreLabel], letterSpacing: '0.2em' }}>
                {health.scoreLabel}
              </span>
              {health.scoreLabel === 'CRITIQUE' && isEarlyMorning && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', color: 'var(--color-awan-tx-mute)', marginTop: 2 }}>
                  Normal en début de journée
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono font-bold" style={{ fontSize: '32px', color: 'var(--color-awan-tx)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {health.score}
              </span>
              <span className="font-mono" style={{ fontSize: '10px', color: 'var(--color-awan-tx-mute)' }}>/100</span>
            </div>
          </>
        )}
      </div>

      {/* Rétrospective semaine + Objectifs jour */}
      <div className="p-4 border mb-4" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border)' }}>
        <div className="flex flex-row justify-between items-baseline mb-3">
          <span className="uppercase" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
            SEMAINE EN COURS
          </span>
          {isEarlyMorning && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', color: 'var(--color-awan-tx-mute)' }}>
              données d'hier
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* Sport */}
          <div className="flex flex-col">
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>SPORT</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: sessionsCount >= 3 ? 'var(--color-awan-status-ok)' : sessionsCount >= 1 ? 'var(--color-awan-gold)' : 'var(--color-awan-status-error)', letterSpacing: '-0.02em' }}>
              {sessionsCount}<span style={{ fontSize: '10px', opacity: 0.5, marginLeft: 2 }}>/4</span>
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', color: 'var(--color-awan-tx-mute)' }}>séances</span>
          </div>
          {/* Poids */}
          <div className="flex flex-col">
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>POIDS</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '-0.02em' }}>
              {weeklyWeightDelta != null
                ? `${weeklyWeightDelta >= 0 ? '+' : ''}${weeklyWeightDelta.toFixed(1)}`
                : latestMeasure?.weight?.toFixed(1) ?? '—'}
              <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: 2 }}>{weeklyWeightDelta != null ? 'kg' : 'kg'}</span>
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', color: 'var(--color-awan-tx-mute)' }}>
              {weeklyWeightDelta != null ? '7 derniers j.' : 'dernière mesure'}
            </span>
          </div>
          {/* Nutrition objectif */}
          <div className="flex flex-col">
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>KCAL</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: mealStore.totals.kcal > 0 ? 'var(--color-awan-tx)' : 'var(--color-awan-tx-mute)', letterSpacing: '-0.02em' }}>
              {mealStore.totals.kcal > 0 ? mealStore.totals.kcal : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', color: 'var(--color-awan-tx-mute)' }}>
              objectif {kcalTarget}
            </span>
          </div>
        </div>
        {/* Objectifs jour */}
        <div className="mt-3 pt-3 border-t flex flex-row gap-4" style={{ borderColor: 'var(--color-awan-border-soft)' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em', textTransform: 'uppercase', marginRight: 4 }}>OBJECTIFS JOUR ·</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', color: 'var(--color-awan-tx-dim)' }}>
            {prayerStore.doneCount}/{prayerStore.total} prières · {kcalTarget} kcal · séance {sessionsCount < 4 ? 'conseillée' : 'facultative'}
          </span>
        </div>
      </div>

      {/* Grille 2×2 — 4 cadrans */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <InstrumentCard
          label="ISLAM"
          value={prayerStore.doneCount}
          unit={`/${prayerStore.total}`}
          status={score.spirit.status}
          progress={score.spirit.value}
          index={1}
          onPress={() => navigate('Islam')}
        />
        <InstrumentCard
          label="SANTÉ"
          value={mealStore.totals.kcal}
          unit="kcal"
          status={score.body.status}
          progress={score.body.value}
          index={2}
          onPress={() => navigate('Sante')}
        />
        <InstrumentCard
          label="PLANNING"
          value={`${prayerH}h${String(prayerM).padStart(2, '0')}`}
          unit={`→ ${nextPrayerName}`}
          status={score.time.status}
          index={3}
          onPress={() => navigate('Planning')}
        />
        <InstrumentCard
          label="TRAJET"
          value={trajetEntries.length > 0 ? trajetEntries.length : '—'}
          unit={trajetEntries.length > 0 ? 'points' : ''}
          status={trajetEntries.length > 0 ? 'ok' : 'mute'}
          index={4}
          onPress={() => navigate('Trajet')}
        />
      </div>

      {/* Mot arabe du jour */}
      <Touch onPress={() => navigate('Islam')} className="block w-full text-left mb-4">
        <div className="p-4 border flex flex-row items-center gap-4"
          style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border)' }}>
          <div className="flex-1">
            <span className="uppercase block mb-1" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
              {dash.widgets.islam}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 'var(--fw-body)' as any, color: 'var(--color-awan-tx-dim)' }}>
              {word.fr}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '32px', fontWeight: 'var(--fw-value)' as any, color: 'var(--color-awan-gold)', lineHeight: 1 }}>
            {word.ar}
          </span>
        </div>
      </Touch>

      {/* Mesures + Séance */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <InstrumentCard label={dash.biometrics ?? 'POIDS'} value={latestMeasure?.weight ?? '—'} unit={latestMeasure ? 'kg' : ''} status={latestMeasure ? 'ok' : 'mute'} index={5} onPress={() => navigate('Mensuration')} />
        <InstrumentCard label={dash.sport?.last ?? 'SÉANCE'} value={lastSession?.name ? lastSession.name.slice(0, 8).toUpperCase() : '—'} status={lastSession ? 'spirit' : 'mute'} index={6} onPress={() => navigate('Sport')} />
      </div>

      {/* Prochaine séance enregistrée — Niveau 2.b */}
      {nextRoutine && (
        <Touch onPress={() => navigate('Sport')} className="block w-full text-left mb-4">
          <div className="p-4 border flex flex-row items-center justify-between"
            style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'rgba(212,175,55,0.15)' }}>
            <div className="flex flex-col gap-0.5">
              <span className="uppercase" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
                PROCHAIN{nextRoutine.cycleLetter ? ` · ${nextRoutine.cycleLetter}` : ''}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '0.05em' }}>
                {nextRoutine.name.toUpperCase()}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--color-awan-gold)' }}>▶</span>
          </div>
        </Touch>
      )}

      {/* Macros */}
      {mealStore.totals.kcal > 0 && (
        <div className="p-4 border mb-4" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border)' }}>
          <span className="uppercase block mb-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
            {dash.widgets.macros}
          </span>
          <div className="grid grid-cols-3 gap-4">
            {([['P', mealStore.totals.p], ['G', mealStore.totals.c], ['L', mealStore.totals.f]] as const).map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--color-awan-tx)', letterSpacing: '-0.02em' }}>
                  {v}<span style={{ fontSize: '10px', opacity: 0.5, marginLeft: 2 }}>g</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach */}
      <Touch onPress={() => navigate('Coach')} className="block w-full text-left mb-4">
        <div className="p-4 border flex flex-col gap-2"
          style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: topAdvice ? `${COACH_COLOR[topAdvice.severity]}33` : 'var(--color-awan-border)' }}>
          <div className="flex flex-row justify-between items-baseline">
            <span className="uppercase block" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
              COACH
            </span>
            {topAdvice && (
              <span className="font-mono font-bold uppercase" style={{ fontSize: '8px', color: COACH_COLOR[topAdvice.severity], letterSpacing: '0.2em' }}>
                {topAdvice.severity}
              </span>
            )}
          </div>
          {topAdvice ? (
            <>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700, color: 'var(--color-awan-tx)' }}>
                {getAdviceText(topAdvice.key).title}
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--color-awan-tx-dim)', marginTop: 2, lineHeight: 1.4 }}>
                {getAdviceText(topAdvice.key).advice}
              </span>
            </>
          ) : (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 'var(--fw-body)' as any, color: 'var(--color-awan-tx)' }}>
              {coachAnalyzed ? 'Aucune anomalie détectée.' : 'Analyse non effectuée'}
            </span>
          )}
        </div>
      </Touch>

      {/* Import JSON */}
      <Touch onPress={() => { setImportResult(null); setImportText(''); setImportModal(true); }} className="block w-full text-left mb-4">
        <div className="p-4 border flex flex-row items-center gap-3"
          style={{ backgroundColor: 'var(--color-awan-border-soft)', borderColor: 'var(--color-awan-border-soft)' }}>
          <Upload size={16} color="var(--color-awan-tx-mute)" />
          <div className="flex flex-col flex-1">
            <span className="uppercase block" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
              {common.import_json}
            </span>
            <span className="font-mono font-bold uppercase" style={{ fontSize: '11px', color: 'var(--color-awan-tx)', letterSpacing: '0.1em' }}>
              {common.import}
            </span>
          </div>
        </div>
      </Touch>

      {/* Modal IMPORT */}
      {importModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={() => setImportModal(false)}>
          <div className="w-full max-w-xl border rounded-awan-xl flex flex-col" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'var(--color-awan-border-soft)', maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-row items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-awan-border-soft)' }}>
              <span className="uppercase" style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.4em' }}>
                {common.import_json}
              </span>
              <Touch onPress={() => setImportModal(false)} className="p-1">
                <X size={18} color="var(--color-awan-tx-mute)" />
              </Touch>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {/* File upload */}
              <label className="flex flex-row items-center gap-3 p-3 border cursor-pointer hover:bg-white/5 transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>
                <Upload size={16} color="var(--color-awan-gold)" />
                <span className="font-mono font-bold uppercase flex-1" style={{ fontSize: '11px', color: 'var(--color-awan-gold)', letterSpacing: '0.2em' }}>
                  CHARGER UN FICHIER .JSON
                </span>
                <input type="file" accept=".json,application/json" className="hidden"
                  onChange={async (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const text = ev.target?.result as string;
                      if (!text) return;
                      setImportText(text);
                      const res = await importFromJson(text);
                      setImportResult(res);
                      if (res.success) {
                        toast('Importation réussie', 'success');
                        setTimeout(() => setImportModal(false), 800);
                      } else {
                        toast(res.message || 'Échec importation', 'error');
                      }
                    };
                    reader.readAsText(file);
                  }} />
              </label>
              <TextInput value={importText} onChangeText={(v: string) => setImportText(v)} multiline numberOfLines={6}
                placeholder={'{ "type": "sport.routine", "data": { ... } }'}
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-awan-tx)', backgroundColor: 'var(--color-awan-border-soft)', borderWidth: 1, borderColor: 'var(--color-awan-border-soft)', borderRadius: 8, padding: 12, minHeight: 140, textAlignVertical: 'top' }} />
              {importResult && (
                <div className="p-3 border" style={{ backgroundColor: 'var(--color-awan-border-soft)', borderColor: 'var(--color-awan-border-soft)' }}>
                  <span className="font-mono" style={{ fontSize: '11px', color: importResult.success ? 'var(--color-awan-status-ok)' : 'var(--color-awan-status-error)' }}>
                    {importResult.message}
                  </span>
                </div>
              )}
              <Touch onPress={async () => {
                const res = await importFromJson(importText);
                setImportResult(res);
                if (res.success) {
                  toast('Importation réussie', 'success');
                  setTimeout(() => setImportModal(false), 800);
                } else {
                  toast(res.message || 'Échec importation', 'error');
                }
              }} className="block w-full">
                <div className="p-3 border flex items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.08)', borderColor: 'var(--color-awan-gold)' }}>
                  <span className="font-mono font-bold uppercase" style={{ fontSize: '11px', color: 'var(--color-awan-gold)', letterSpacing: '0.3em' }}>
                    {common.import}
                  </span>
                </div>
              </Touch>
            </div>
          </div>
        </div>
      )}
    </ScrollView>
  );
}
