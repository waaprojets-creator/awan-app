import React, { useState, useMemo } from 'react';
import { ScrollView, TextInput as RNTextInput } from 'react-native';
import { Upload, X, Info } from 'lucide-react';
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
import { useHealthScore } from '../hooks/useHealthScore';
import { useTemporalMode } from '../hooks/useTemporalMode';
import { useCoach } from '../hooks/useCoach';
import { useDaily } from '../context/DailyContext';
import type { Severity } from '../data/schemas/coach/rule';
import type { Advice } from '../data/schemas/coach/assessment';
import type { NavProps } from '../types/nav';
import arabicData from '../assets/data/1.json';

const KCAL_TARGET_DEFAULT = 2000;
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

  const score = useAwanScore({
    prayersDone:      prayerStore.doneCount,
    kcalLogged:       mealStore.totals.kcal,
    kcalTarget:       KCAL_TARGET_DEFAULT,
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

  const dateLabel = new Date().toLocaleDateString('fr-FR', DATE_FORMAT_BANNER as Intl.DateTimeFormatOptions);

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

      {/* Score AWAN — widget principal avec ⓘ */}
      <div className="mb-4 relative">
        <AwanScoreDisplay score={score} temporal={temporal} />
        <Touch
          onPress={() => setShowScoreInfo(v => !v)}
          className="absolute top-3 right-3 p-1"
        >
          <Info size={14} color="var(--color-awan-tx-mute)" />
        </Touch>
        {showScoreInfo && (
          <div
            className="mt-2 p-3 border"
            style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--color-awan-tx-dim)', lineHeight: 1.5 }}>
              {dash.widgets.scoreInfo}
            </span>
          </div>
        )}
      </div>

      {/* Transport — 2e widget */}
      <div className="p-4 border mb-4" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'rgba(255,255,255,0.06)' }}>
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
                style={{ backgroundColor: active ? 'rgba(212,175,55,0.08)' : 'transparent', borderColor: active ? 'var(--color-awan-gold)' : 'rgba(255,255,255,0.06)' }}
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
        style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col">
          <span className="uppercase block mb-1" style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.3em' }}>
            HEALTH SCORE
          </span>
          <span className="font-mono font-bold uppercase" style={{ fontSize: '10px', color: HEALTH_COLOR[health.scoreLabel], letterSpacing: '0.2em' }}>
            {health.scoreLabel}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono font-bold" style={{ fontSize: '32px', color: 'var(--color-awan-tx)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {health.score}
          </span>
          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--color-awan-tx-mute)' }}>/100</span>
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
          style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'rgba(255,255,255,0.06)' }}>
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

      {/* Macros */}
      {mealStore.totals.kcal > 0 && (
        <div className="p-4 border mb-4" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'rgba(255,255,255,0.06)' }}>
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
          style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: topAdvice ? `${COACH_COLOR[topAdvice.severity]}33` : 'rgba(255,255,255,0.06)' }}>
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
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 'var(--fw-body)' as any, color: 'var(--color-awan-tx)' }}>
            {topAdvice ? topAdvice.key : coachAnalyzed ? 'Aucune anomalie détectée.' : 'Analyse non effectuée'}
          </span>
        </div>
      </Touch>

      {/* Import JSON */}
      <Touch onPress={() => { setImportResult(null); setImportText(''); setImportModal(true); }} className="block w-full text-left mb-4">
        <div className="p-4 border flex flex-row items-center gap-3"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }}>
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
          <div className="w-full max-w-xl border rounded-awan-xl flex flex-col" style={{ backgroundColor: 'var(--color-awan-surface)', borderColor: 'rgba(255,255,255,0.05)', maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-row items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <span className="uppercase" style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', fontWeight: 'var(--fw-mute)' as any, color: 'var(--color-awan-tx-mute)', letterSpacing: '0.4em' }}>
                {common.import_json}
              </span>
              <Touch onPress={() => setImportModal(false)} className="p-1">
                <X size={18} color="var(--color-awan-tx-mute)" />
              </Touch>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <TextInput value={importText} onChangeText={(v: string) => setImportText(v)} multiline numberOfLines={10}
                placeholder={'{ "type": "sport.routine", "data": { ... } }'}
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-awan-tx)', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, minHeight: 200, textAlignVertical: 'top' }} />
              {importResult && (
                <div className="p-3 border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span className="font-mono" style={{ fontSize: '11px', color: importResult.success ? 'var(--color-awan-status-ok)' : 'var(--color-awan-status-error)' }}>
                    {importResult.message}
                  </span>
                </div>
              )}
              <Touch onPress={async () => { const res = await importFromJson(importText); setImportResult(res); }} className="block w-full">
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
