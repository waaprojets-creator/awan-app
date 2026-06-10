import React, { useState, useMemo, useEffect } from 'react';
import { ScrollView, View, Text, TextInput as RNTextInput, Modal, TouchableWithoutFeedback } from 'react-native';
import { Upload, X } from 'lucide-react-native';
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
import { useWeightStore } from '../hooks/useWeightStore';
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
import { useTheme } from '../hooks/useTheme';
import { FontSans, FontMono, FwMute, FwBody, FwLabel, FwValue } from '../constants/typography';

const KCAL_TARGET_DEFAULT = DEFAULT_KCAL_TARGET;
const TextInput = RNTextInput as React.ComponentType<any>;

const dash = (L as any).dash as any;
const common = (L as any).common as any;

interface PrayerInfo { next: string; timeForNext: Date | null; }

export default function DashboardScreen({ navigate }: NavProps) {
  const theme = useTheme();
  const today = ds(new Date());
  const [transportMode, setTransportMode] = useState<string>('car');
  const [importModal, setImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const { toast } = useToast();

  const mealStore    = useMealStore(today);
  const measureStore = useMeasurementStore();
  const weightStore  = useWeightStore();
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
    info:  theme.selected,
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
    CRITIQUE: theme.danger,
    MOYEN:    theme.statusWarn,
    BON:      theme.statusOk,
    OPTIMAL:  theme.selected,
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
    const sorted = weightStore.entries.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 2) return null;
    const last = sorted.at(-1)!;
    const sevenDaysAgo = new Date(last.date);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenStr = sevenDaysAgo.toISOString().slice(0, 10);
    const baseline = [...sorted].reverse().find(e => e.date <= sevenStr);
    if (!baseline) return null;
    return last.weightKg - baseline.weightKg;
  }, [weightStore.entries]);

  const isEarlyMorning = useMemo(() => new Date().getHours() < 10, []);

  return (
    <ScrollView
      style={{ flex: 1, width: '100%', maxWidth: '100%', backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100, width: '100%', maxWidth: '100%' }}
      showsVerticalScrollIndicator={false}
    >
      {/* Date — pas de titre de page */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
        <Text
          style={{ fontFamily: FontSans, fontSize: 14, fontWeight: FwLabel as any, color: theme.title, letterSpacing: 0.7, textTransform: 'capitalize' }}
        >
          {dateLabel}
        </Text>
      </View>

      {/* Score AWAN — widget principal avec ⓘ intégré */}
      <View style={{ marginBottom: 16 }}>
        <AwanScoreDisplay score={score} temporal={temporal} onInfo={() => setShowScoreInfo(v => !v)} />
        {showScoreInfo && (
          <View style={{ marginTop: 8, padding: 12, borderWidth: 1, backgroundColor: theme.surface, borderColor: theme.border }}>
            <Text style={{ fontFamily: FontSans, fontSize: 11, color: theme.text, lineHeight: 17 }}>
              {dash.widgets.scoreInfo}
            </Text>
          </View>
        )}
      </View>

      {/* Transport — 2e widget */}
      <View style={{ padding: 16, borderWidth: 1, marginBottom: 16, backgroundColor: theme.surface, borderColor: theme.border }}>
        <Text style={{ fontFamily: FontSans, fontSize: 7, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase', marginBottom: 12 }}>
          {dash.widgets.transport}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(TRANSPORT_OPTIONS as Array<{ key: string; label: string }>).map((opt) => {
            const icons = TRANSPORT_ICONS as Record<string, React.ComponentType<{ size: number; color: string }>>;
            const Icon  = icons[opt.key];
            const active = transportMode === opt.key;
            return (
              <Touch key={opt.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, height: 44, backgroundColor: active ? 'rgba(212,175,55,0.08)' : 'transparent', borderColor: active ? theme.selected : theme.border }}
                onPress={() => setTransportMode(opt.key)}>
                {Icon && <Icon size={18} color={active ? theme.selected : theme.mute} />}
              </Touch>
            );
          })}
        </View>
      </View>

      {/* Health Score */}
      <View style={{ padding: 16, borderWidth: 1, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderColor: theme.border }}>
        {health.loading ? (
          <View style={{ height: 52, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Text style={{ fontFamily: FontMono, fontSize: 11, color: theme.text }}>—</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'column' }}>
              <Text style={{ fontFamily: FontSans, fontSize: 7, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase', marginBottom: 4 }}>
                HEALTH SCORE
              </Text>
              <Text style={{ fontFamily: FontMono, fontWeight: FwValue as any, fontSize: 10, color: HEALTH_COLOR[health.scoreLabel], letterSpacing: 2.0, textTransform: 'uppercase' }}>
                {health.scoreLabel}
              </Text>
              {health.scoreLabel === 'CRITIQUE' && isEarlyMorning && (
                <Text style={{ fontFamily: FontSans, fontSize: 8, color: theme.mute, marginTop: 2 }}>
                  Normal en début de journée
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontFamily: FontMono, fontWeight: FwValue as any, fontSize: 32, color: theme.title, letterSpacing: -0.64, lineHeight: 32 }}>
                {health.score}
              </Text>
              <Text style={{ fontFamily: FontMono, fontSize: 10, color: theme.mute }}>/100</Text>
            </View>
          </>
        )}
      </View>

      {/* Rétrospective semaine + Objectifs jour */}
      <View style={{ padding: 16, borderWidth: 1, marginBottom: 16, backgroundColor: theme.surface, borderColor: theme.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <Text style={{ fontFamily: FontSans, fontSize: 7, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase' }}>
            SEMAINE EN COURS
          </Text>
          {isEarlyMorning && (
            <Text style={{ fontFamily: FontSans, fontSize: 8, color: theme.mute }}>
              données d'hier
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {/* Sport */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <Text style={{ fontFamily: FontSans, fontSize: 7, color: theme.mute, letterSpacing: 1.6, textTransform: 'uppercase' }}>SPORT</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ fontFamily: FontMono, fontSize: 20, fontWeight: 700, color: sessionsCount >= 3 ? theme.statusOk : sessionsCount >= 1 ? theme.selected : theme.danger, letterSpacing: -0.4 }}>
                {sessionsCount}
              </Text>
              <Text style={{ fontFamily: FontMono, fontSize: 10, opacity: 0.5, marginLeft: 2 }}>/4</Text>
            </View>
            <Text style={{ fontFamily: FontSans, fontSize: 8, color: theme.mute }}>séances</Text>
          </View>
          {/* Poids */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <Text style={{ fontFamily: FontSans, fontSize: 7, color: theme.mute, letterSpacing: 1.6, textTransform: 'uppercase' }}>POIDS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ fontFamily: FontMono, fontSize: 20, fontWeight: 700, color: theme.title, letterSpacing: -0.4 }}>
                {weeklyWeightDelta != null
                  ? `${weeklyWeightDelta >= 0 ? '+' : ''}${weeklyWeightDelta.toFixed(1)}`
                  : weightStore.avg7d?.toFixed(1) ?? '—'}
              </Text>
              <Text style={{ fontFamily: FontMono, fontSize: 10, opacity: 0.5, marginLeft: 2 }}>{weeklyWeightDelta != null ? 'kg' : 'kg'}</Text>
            </View>
            <Text style={{ fontFamily: FontSans, fontSize: 8, color: theme.mute }}>
              {weeklyWeightDelta != null ? '7 derniers j.' : 'dernière mesure'}
            </Text>
          </View>
          {/* Nutrition objectif */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <Text style={{ fontFamily: FontSans, fontSize: 7, color: theme.mute, letterSpacing: 1.6, textTransform: 'uppercase' }}>KCAL</Text>
            <Text style={{ fontFamily: FontMono, fontSize: 20, fontWeight: 700, color: mealStore.totals.kcal > 0 ? theme.title : theme.mute, letterSpacing: -0.4 }}>
              {mealStore.totals.kcal > 0 ? mealStore.totals.kcal : '—'}
            </Text>
            <Text style={{ fontFamily: FontSans, fontSize: 8, color: theme.mute }}>
              objectif {kcalTarget}
            </Text>
          </View>
        </View>
        {/* Objectifs jour */}
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, flexDirection: 'row', gap: 16, borderColor: theme.borderSoft }}>
          <Text style={{ fontFamily: FontSans, fontSize: 7, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase', marginRight: 4 }}>OBJECTIFS JOUR ·</Text>
          <Text style={{ fontFamily: FontSans, fontSize: 8, color: theme.text }}>
            {prayerStore.doneCount}/{prayerStore.total} prières · {kcalTarget} kcal · séance {sessionsCount < 4 ? 'conseillée' : 'facultative'}
          </Text>
        </View>
      </View>

      {/* Grille 2×2 — 4 cadrans */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <View style={{ width: '47%' }}>
          <InstrumentCard
            label="ISLAM"
            value={prayerStore.doneCount}
            unit={`/${prayerStore.total}`}
            status={score.spirit.status}
            progress={score.spirit.value}
            index={1}
            onPress={() => navigate('Islam')}
          />
        </View>
        <View style={{ width: '47%' }}>
          <InstrumentCard
            label="SANTÉ"
            value={mealStore.totals.kcal}
            unit="kcal"
            status={score.body.status}
            progress={score.body.value}
            index={2}
            onPress={() => navigate('Sante')}
          />
        </View>
        <View style={{ width: '47%' }}>
          <InstrumentCard
            label="PLANNING"
            value={`${prayerH}h${String(prayerM).padStart(2, '0')}`}
            unit={`→ ${nextPrayerName}`}
            status={score.time.status}
            index={3}
            onPress={() => navigate('Planning')}
          />
        </View>
        <View style={{ width: '47%' }}>
          <InstrumentCard
            label="TRAJET"
            value={trajetEntries.length > 0 ? trajetEntries.length : '—'}
            unit={trajetEntries.length > 0 ? 'points' : ''}
            status={trajetEntries.length > 0 ? 'ok' : 'mute'}
            index={4}
            onPress={() => navigate('Trajet')}
          />
        </View>
      </View>

      {/* Mot arabe du jour */}
      <Touch onPress={() => navigate('Islam')} style={{ width: '100%', marginBottom: 16 }}>
        <View style={{ padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: theme.surface, borderColor: theme.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FontSans, fontSize: 7, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase', marginBottom: 4 }}>
              {dash.widgets.islam}
            </Text>
            <Text style={{ fontFamily: FontSans, fontSize: 11, fontWeight: FwBody as any, color: theme.text }}>
              {word.fr}
            </Text>
          </View>
          <Text style={{ fontFamily: FontSans, fontSize: 32, fontWeight: FwValue as any, color: theme.selected, lineHeight: 32 }}>
            {word.ar}
          </Text>
        </View>
      </Touch>

      {/* Mesures + Séance */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <View style={{ width: '47%' }}>
          <InstrumentCard label={dash.biometrics ?? 'POIDS'} value={weightStore.todayEntry?.weightKg ?? weightStore.avg7d?.toFixed(1) ?? '—'} unit={weightStore.entries.length ? 'kg' : ''} status={weightStore.entries.length ? 'ok' : 'mute'} index={5} onPress={() => navigate('Mensuration')} />
        </View>
        <View style={{ width: '47%' }}>
          <InstrumentCard label={dash.sport?.last ?? 'SÉANCE'} value={lastSession?.name ? lastSession.name.slice(0, 8).toUpperCase() : '—'} status={lastSession ? 'spirit' : 'mute'} index={6} onPress={() => navigate('Sport')} />
        </View>
      </View>

      {/* Prochaine séance enregistrée — Niveau 2.b */}
      {nextRoutine && (
        <Touch onPress={() => navigate('Sport')} style={{ width: '100%', marginBottom: 16 }}>
          <View style={{ padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderColor: 'rgba(212,175,55,0.15)' }}>
            <View style={{ flexDirection: 'column', gap: 2 }}>
              <Text style={{ fontFamily: FontSans, fontSize: 7, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase' }}>
                PROCHAIN{nextRoutine.cycleLetter ? ` · ${nextRoutine.cycleLetter}` : ''}
              </Text>
              <Text style={{ fontFamily: FontMono, fontSize: 14, fontWeight: 700, color: theme.title, letterSpacing: 0.7 }}>
                {nextRoutine.name.toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontFamily: FontMono, fontSize: 18, color: theme.selected }}>▶</Text>
          </View>
        </Touch>
      )}

      {/* Macros */}
      {mealStore.totals.kcal > 0 && (
        <View style={{ padding: 16, borderWidth: 1, marginBottom: 16, backgroundColor: theme.surface, borderColor: theme.border }}>
          <Text style={{ fontFamily: FontSans, fontSize: 7, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase', marginBottom: 12 }}>
            {dash.widgets.macros}
          </Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {([['P', mealStore.totals.p], ['G', mealStore.totals.c], ['L', mealStore.totals.f]] as const).map(([k, v]) => (
              <View key={k} style={{ flex: 1, flexDirection: 'column' }}>
                <Text style={{ fontFamily: FontSans, fontSize: 7, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase' }}>{k}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontFamily: FontMono, fontSize: 20, fontWeight: 700, color: theme.title, letterSpacing: -0.4 }}>
                    {v}
                  </Text>
                  <Text style={{ fontFamily: FontMono, fontSize: 10, opacity: 0.5, marginLeft: 2 }}>g</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Coach */}
      <Touch onPress={() => navigate('Coach')} style={{ width: '100%', marginBottom: 16 }}>
        <View style={{ padding: 16, borderWidth: 1, flexDirection: 'column', gap: 8, backgroundColor: theme.surface, borderColor: topAdvice ? `${COACH_COLOR[topAdvice.severity]}33` : theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: FontSans, fontSize: 7, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase' }}>
              COACH
            </Text>
            {topAdvice && (
              <Text style={{ fontFamily: FontMono, fontWeight: FwValue as any, fontSize: 8, color: COACH_COLOR[topAdvice.severity], letterSpacing: 1.6, textTransform: 'uppercase' }}>
                {topAdvice.severity}
              </Text>
            )}
          </View>
          {topAdvice ? (
            <>
              <Text style={{ fontFamily: FontSans, fontSize: 12, fontWeight: 700, color: theme.title }}>
                {getAdviceText(topAdvice.key).title}
              </Text>
              <Text style={{ fontFamily: FontSans, fontSize: 10, color: theme.text, marginTop: 2, lineHeight: 14 }}>
                {getAdviceText(topAdvice.key).advice}
              </Text>
            </>
          ) : (
            <Text style={{ fontFamily: FontSans, fontSize: 12, fontWeight: FwBody as any, color: theme.title }}>
              {coachAnalyzed ? 'Aucune anomalie détectée.' : 'Analyse non effectuée'}
            </Text>
          )}
        </View>
      </Touch>

      {/* Import JSON */}
      <Touch onPress={() => { setImportResult(null); setImportText(''); setImportModal(true); }} style={{ width: '100%', marginBottom: 16 }}>
        <View style={{ padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.borderSoft, borderColor: theme.borderSoft }}>
          <Upload size={16} color={theme.mute} />
          <View style={{ flexDirection: 'column', flex: 1 }}>
            <Text style={{ fontFamily: FontSans, fontSize: 7, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 2.1, textTransform: 'uppercase' }}>
              {common.import_json}
            </Text>
            <Text style={{ fontFamily: FontMono, fontWeight: FwValue as any, fontSize: 11, color: theme.title, letterSpacing: 1.1, textTransform: 'uppercase' }}>
              {common.import}
            </Text>
          </View>
        </View>
      </Touch>

      {/* Modal IMPORT */}
      <Modal visible={importModal} transparent animationType="slide" onRequestClose={() => setImportModal(false)}>
        <TouchableWithoutFeedback onPress={() => setImportModal(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{ borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, maxHeight: '88%' }}>
                {/* header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: theme.borderSoft }}>
                  <Text style={{ fontFamily: FontSans, fontSize: 8, fontWeight: FwMute as any, color: theme.mute, letterSpacing: 3.2, textTransform: 'uppercase' }}>
                    {common.import_json}
                  </Text>
                  <Touch onPress={() => setImportModal(false)} style={{ padding: 4 }}>
                    <X size={18} color={theme.mute} />
                  </Touch>
                </View>
                {/* content */}
                <View style={{ padding: 16, flexDirection: 'column', gap: 12 }}>
                  <TextInput value={importText} onChangeText={(v: string) => setImportText(v)} multiline numberOfLines={6}
                    placeholder={'{ "type": "sport.routine", "data": { ... } }'}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={{ fontFamily: FontMono, fontSize: 12, color: theme.title, backgroundColor: theme.borderSoft, borderWidth: 1, borderColor: theme.borderSoft, borderRadius: 8, padding: 12, minHeight: 140, textAlignVertical: 'top' }} />
                  {importResult && (
                    <View style={{ padding: 12, borderWidth: 1, backgroundColor: theme.borderSoft, borderColor: theme.borderSoft }}>
                      <Text style={{ fontFamily: FontMono, fontSize: 11, color: importResult.success ? theme.statusOk : theme.danger }}>
                        {importResult.message}
                      </Text>
                    </View>
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
                  }} style={{ width: '100%' }}>
                    <View style={{ padding: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,175,55,0.08)', borderColor: theme.selected }}>
                      <Text style={{ fontFamily: FontMono, fontWeight: FwValue as any, fontSize: 11, color: theme.selected, letterSpacing: 2.1, textTransform: 'uppercase' }}>
                        {common.import}
                      </Text>
                    </View>
                  </Touch>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}
