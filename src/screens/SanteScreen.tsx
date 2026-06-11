import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import Svg, { Ellipse, Rect, Path } from 'react-native-svg';
import { useTheme, type AwanTheme } from '../hooks/useTheme';
import { ChevronRight, Activity, Utensils, Ruler, Brain, Moon } from 'lucide-react-native';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Touch } from '../components/ui/Touch';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { useMealStore } from '../hooks/useMealStore';
import { useMeasurementStore } from '../hooks/useMeasurementStore';
import { useWeightStore } from '../hooks/useWeightStore';
import { useSleepStore } from '../hooks/useSleepStore';
import { useCoach } from '../hooks/useCoach';
import { ds } from '../utils/storage';
import { sessionsThisWeek } from '../hooks/useAwanScore';
import { getAdviceText } from '../constants/coachAdvice';
import { DEFAULT_KCAL_TARGET } from '../constants/app';
import { safeStorage } from '../utils/safeStorage';
import { Fs, Fw, Clr } from '../theme/tokens';
import { FontMono } from '../constants/typography';
import type { Severity } from '../data/schemas/coach/rule';
import type { Advice } from '../data/schemas/coach/assessment';

const SvgEllipse_ = Ellipse as any;
const SvgRect_ = Rect as any;
const SvgPath_ = Path as any;

function BodySilhouette() {
  const theme = useTheme();
  const s = theme.mute;
  return (
    <Svg width={48} height={96} viewBox="0 0 48 96">
      <SvgEllipse_ cx="24" cy="9" rx="7" ry="8" stroke={s} strokeWidth="1" opacity="0.45"/>
      <SvgRect_ x="21" y="16" width="6" height="4" rx="1" stroke={s} strokeWidth="0.8" opacity="0.35"/>
      <SvgPath_ d="M 10 22 Q 18 18 24 19 Q 30 18 38 22 L 37 50 Q 30 54 24 54 Q 18 54 11 50 Z" stroke={s} strokeWidth="1" fill="none" opacity="0.4"/>
      <SvgPath_ d="M 10 22 L 3 44 L 6 46 L 13 24" stroke={s} strokeWidth="0.8" opacity="0.35" strokeLinejoin="round"/>
      <SvgPath_ d="M 38 22 L 45 44 L 42 46 L 35 24" stroke={s} strokeWidth="0.8" opacity="0.35" strokeLinejoin="round"/>
      <SvgPath_ d="M 17 54 L 15 82 L 19 82 L 22 54" stroke={s} strokeWidth="0.9" opacity="0.4"/>
      <SvgPath_ d="M 31 54 L 33 82 L 29 82 L 26 54" stroke={s} strokeWidth="0.9" opacity="0.4"/>
    </Svg>
  );
}

function getCoachColor(t: Pick<AwanTheme, 'selected' | 'statusOk' | 'statusWarn' | 'danger'>): Record<Severity, string> {
  return { info: t.selected, good: t.statusOk, warn: t.statusWarn, alert: t.danger };
}

export default function SanteScreen({ navigate }: any) {
  const theme = useTheme();
  const COACH_COLOR = getCoachColor(theme);
  const today = ds(new Date());
  const workoutStore = useWorkoutStore();
  const mealStore = useMealStore(today);
  const measureStore = useMeasurementStore();
  const weightStore = useWeightStore();
  const sleepStore = useSleepStore();
  const { assessments: coachAssessments } = useCoach(today);

  const KCAL_TARGET = useMemo(() => {
    try {
      const profile = JSON.parse(safeStorage.get('awan.nutrition.profile') ?? '{}');
      return typeof profile.targetKcal === 'number' ? profile.targetKcal : DEFAULT_KCAL_TARGET;
    } catch { return DEFAULT_KCAL_TARGET; }
  }, []);

  const sessCount = sessionsThisWeek(workoutStore.sessions as Array<{ date?: string; startTime?: number }>);

  // Tendance sport : sessions cette semaine vs semaine précédente
  const sessCountPrevWeek = useMemo(() => {
    const now = Date.now();
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return (workoutStore.sessions as Array<{ startTime?: number }>)
      .filter(s => { const t = s.startTime ?? 0; return t >= twoWeeksAgo && t < oneWeekAgo; }).length;
  }, [workoutStore.sessions]);
  const sportDelta = sessCount - sessCountPrevWeek;

  const lastSession = useMemo(() =>
    [...(workoutStore.sessions as Array<{ startTime?: number }>)]
      .sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))[0],
    [workoutStore.sessions]);

  const daysSince = lastSession?.startTime
    ? Math.floor((Date.now() - (lastSession.startTime as number)) / 86_400_000)
    : null;

  const kcal = mealStore.totals.kcal;
  const kcalPct = Math.min(100, Math.round((kcal / KCAL_TARGET) * 100));

  const latestMeasure = measureStore.history
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);

  // Tendance poids : delta 7 jours
  const weightDelta = useMemo(() => {
    const sorted = weightStore.entries.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 2) return null;
    const last = sorted.at(-1)!;
    const sevenDaysAgo = new Date(last.date); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenStr = sevenDaysAgo.toISOString().slice(0, 10);
    const baseline = [...sorted].reverse().find(e => e.date <= sevenStr);
    if (!baseline) return null;
    return last.weight - baseline.weight;
  }, [weightStore.entries]);

  const topAdvice = useMemo<Advice | null>(() => {
    const order: Record<Severity, number> = { alert: 0, warn: 1, good: 2, info: 3 };
    const all: Advice[] = coachAssessments.flatMap((a) => a.advices);
    if (all.length === 0) return null;
    return [...all].sort((a, b) => order[a.severity] - order[b.severity])[0] ?? null;
  }, [coachAssessments]);

  return (
    <ScrollView
      style={{ flex: 1, width: '100%', maxWidth: '100%', backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader tag="SANTÉ" title="SANTÉ" />

      {/* SPORT */}
      <Touch onPress={() => navigate('Sport')} style={{ marginBottom: 16 }}>
        <Card variant="flat">
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconWrapper}>
                  <Activity size={15} color={theme.selected} />
                </View>
                <Text style={[styles.sectionLabel, { color: theme.selected }]}>SPORT</Text>
              </View>
              <ChevronRight size={16} color={theme.mute} />
            </View>
            <View style={styles.statsRow}>
              <View>
                <Text style={[styles.smallLabel, { color: theme.mute }]}>SÉANCES / SEM</Text>
                <View style={styles.valueWithDelta}>
                  <Text style={[styles.bigNumber, { color: theme.title }]}>{sessCount}</Text>
                  {sportDelta !== 0 && (
                    <Text style={[styles.deltaText, { color: sportDelta > 0 ? theme.statusOk : theme.danger }]}>
                      {sportDelta > 0 ? '▲' : '▼'} {Math.abs(sportDelta)} vs S-1
                    </Text>
                  )}
                </View>
              </View>
              {daysSince !== null && (
                <View>
                  <Text style={[styles.smallLabel, { color: theme.mute }]}>DERNIÈRE SÉANCE</Text>
                  <Text style={[styles.bigNumber, { color: theme.title }]}>
                    {daysSince === 0 ? "AUJOURD'HUI" : `J-${daysSince}`}
                  </Text>
                </View>
              )}
            </View>
            {sessCount > 0 && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { backgroundColor: theme.selected, width: `${Math.min(100, sessCount * 25)}%` }]} />
              </View>
            )}
          </View>
        </Card>
      </Touch>

      {/* NUTRITION */}
      <Touch onPress={() => navigate('Nutrition')} style={{ marginBottom: 16 }}>
        <Card variant="flat">
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconWrapper}>
                  <Utensils size={15} color={theme.selected} />
                </View>
                <Text style={[styles.sectionLabel, { color: theme.selected }]}>NUTRITION</Text>
              </View>
              <ChevronRight size={16} color={theme.mute} />
            </View>
            <View style={styles.nutritionRow}>
              <View>
                <Text style={[styles.smallLabel, { color: theme.mute }]}>KCAL</Text>
                <Text style={[styles.bigNumber, { color: theme.title }]}>
                  {kcal}<Text style={{ fontSize: Fs.sm, marginLeft: 4, opacity: 0.5, color: theme.selected }}>/{KCAL_TARGET}</Text>
                </Text>
              </View>
              {(['p', 'c', 'f'] as const).map(m => (
                <View key={m}>
                  <Text style={[styles.smallLabel, { color: theme.mute }]}>
                    {m === 'p' ? 'PROT' : m === 'c' ? 'GLUC' : 'LIP'}
                  </Text>
                  <Text style={[styles.medNumber, { color: theme.title }]}>
                    {mealStore.totals[m]}<Text style={{ fontSize: Fs.md, marginLeft: 2, opacity: 0.5, color: theme.selected }}>g</Text>
                  </Text>
                </View>
              ))}
            </View>
            {kcal > 0 && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { backgroundColor: (kcalPct >= 90 && kcalPct <= 110) ? theme.statusOk : theme.selected, width: `${kcalPct}%` }]} />
              </View>
            )}
          </View>
        </Card>
      </Touch>

      {/* MENSURATION */}
      <Touch onPress={() => navigate('Mensuration')} style={{ marginBottom: 16 }}>
        <Card variant="flat">
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconWrapper}>
                  <Ruler size={15} color={theme.selected} />
                </View>
                <Text style={[styles.sectionLabel, { color: theme.selected }]}>MENSURATION</Text>
              </View>
              <ChevronRight size={16} color={theme.mute} />
            </View>
            <View style={styles.mensuRow}>
              <BodySilhouette />
              <View style={styles.mensuDetails}>
                {latestMeasure ? (
                  <>
                    <View>
                      <Text style={[styles.smallLabel, { color: theme.mute }]}>POIDS</Text>
                      <View style={styles.valueWithDelta}>
                        <Text style={[styles.medNumber, { color: theme.title }]}>
                          {weightStore.entries.filter(e => e.date <= (latestMeasure?.date ?? '')).sort((a,b)=>b.date.localeCompare(a.date))[0]?.weight ?? '—'}
                          <Text style={{ fontSize: Fs.xs, marginLeft: 4, color: theme.selected }}>kg</Text>
                        </Text>
                        {weightDelta !== null && (
                          <Text style={[styles.deltaText, { color: weightDelta < 0 ? theme.statusOk : weightDelta > 0 ? theme.statusWarn : theme.mute }]}>
                            {weightDelta > 0 ? '▲' : weightDelta < 0 ? '▼' : '–'} {Math.abs(weightDelta).toFixed(1)} kg/sem
                          </Text>
                        )}
                      </View>
                    </View>
                    {latestMeasure.body_fat_pct > 0 && (
                      <View>
                        <Text style={[styles.smallLabel, { color: theme.mute }]}>MASSE GRASSE</Text>
                        <Text style={[styles.medNumber, { color: theme.title }]}>
                          {latestMeasure.body_fat_pct.toFixed(1)}<Text style={{ fontSize: Fs.xs, marginLeft: 4, color: theme.selected }}>%</Text>
                        </Text>
                      </View>
                    )}
                    {latestMeasure.bpm_rest > 0 && (
                      <View>
                        <Text style={[styles.smallLabel, { color: theme.mute }]}>BPM REPOS</Text>
                        <Text style={[styles.medNumber, { color: theme.title }]}>{latestMeasure.bpm_rest}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={[styles.emptyLabel, { color: theme.mute }]}>Aucune mesure</Text>
                )}
              </View>
            </View>
          </View>
        </Card>
      </Touch>

      {/* SOMMEIL */}
      <Touch onPress={() => navigate('Sleep')} style={{ marginBottom: 16 }}>
        <Card variant="flat">
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconWrapper}>
                  <Moon size={15} color={theme.selected} />
                </View>
                <Text style={[styles.sectionLabel, { color: theme.selected }]}>SOMMEIL</Text>
              </View>
              <ChevronRight size={16} color={theme.mute} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.sleepCol}>
                <Text style={[styles.smallLabel, { color: theme.mute }]}>MOY. 7J</Text>
                <Text style={[styles.medNumber, { color: sleepStore.avgDurationH >= 7 ? theme.statusOk : sleepStore.avgDurationH >= 6 ? theme.statusWarn : sleepStore.avgDurationH > 0 ? theme.danger : theme.mute }]}>
                  {sleepStore.avgDurationH > 0 ? `${sleepStore.avgDurationH.toFixed(1)}h` : '—'}
                </Text>
                <Text style={[styles.sleepSubtitle, { color: theme.mute }]}>
                  {sleepStore.avgDurationH > 0
                    ? sleepStore.avgDurationH >= 7 ? 'objectif OMS atteint' : `${(7 - sleepStore.avgDurationH).toFixed(1)}h sous OMS`
                    : 'aucune donnée'}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </Touch>

      {/* COACH */}
      <Touch onPress={() => navigate('Coach')} style={{ marginBottom: 16 }}>
        <Card variant="flat">
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconWrapper}>
                  <Brain size={15} color={theme.selected} />
                </View>
                <Text style={[styles.sectionLabel, { color: theme.selected }]}>COACH</Text>
              </View>
              <ChevronRight size={16} color={theme.mute} />
            </View>
            {topAdvice ? (
              <View>
                <Text style={[styles.coachSeverity, { color: COACH_COLOR[topAdvice.severity] }]}>
                  {topAdvice.severity.toUpperCase()}
                </Text>
                <Text style={[styles.coachTitle, { color: theme.text }]}>{getAdviceText(topAdvice.key).title}</Text>
                <Text style={[styles.coachAdvice, { color: theme.text }]}>{getAdviceText(topAdvice.key).advice}</Text>
              </View>
            ) : (
              <Text style={[styles.emptyLabel, { color: theme.mute }]}>Analyse non effectuée</Text>
            )}
          </View>
        </Card>
      </Touch>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardInner: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    backgroundColor: Clr.gold10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Clr.gold20,
  },
  sectionLabel: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'flex-end',
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  smallLabel: {
    fontFamily: FontMono,
    fontSize: Fs.xxs,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  valueWithDelta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  bigNumber: {
    fontFamily: FontMono,
    fontSize: 30,
    fontWeight: Fw.display,
    letterSpacing: -0.6,
  },
  medNumber: {
    fontFamily: FontMono,
    fontSize: 24,
    fontWeight: Fw.display,
    letterSpacing: -0.5,
  },
  deltaText: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.display,
  },
  progressTrack: {
    marginTop: 12,
    height: 2,
    backgroundColor: Clr.white5,
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
  },
  mensuRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  mensuDetails: {
    flexDirection: 'column',
    gap: 12,
    flex: 1,
  },
  sleepCol: {
    flexDirection: 'column',
  },
  sleepSubtitle: {
    fontSize: Fs.sm,
    marginTop: 4,
  },
  emptyLabel: {
    fontFamily: FontMono,
    fontSize: Fs.md,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    opacity: 0.4,
  },
  coachSeverity: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  coachTitle: {
    fontSize: 14,
    fontWeight: Fw.value,
    marginBottom: 2,
  },
  coachAdvice: {
    fontSize: Fs.xs,
    marginTop: 2,
    lineHeight: 16,
    opacity: 0.7,
  },
});
