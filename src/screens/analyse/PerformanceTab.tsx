import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import { WidgetInfo } from '../../components/ui/WidgetInfo';
import { Touch } from '../../components/ui/Touch';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import {
  bestOneRmFromSession,
  sessionDensity,
  sessionAdherence,
  oneRmTrendPerExercise,
  tonnageByChain,
} from '../../services/workoutAnalysisService';
import type { ChainKey } from '../../constants/exerciseChains';
import { computeWeeklyTonnage } from '../../services/analyticsService';
import { PeriodizationService } from '../../services/periodizationService';
import { BarChart, EmptyState } from './shared';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Clr } from '../../theme/tokens';

const SvgPath_ = Path as any;
const SvgCircle_ = Circle as any;

interface PerformanceTabProps {
  sessions: WorkoutSessionLatest[];
  assessments?: Array<{ forecasts?: Array<{ kind: string; horizonDays?: number }> }>;
}

interface OneRMEntry { exerciseId: string; name: string; rm: number; date: string }
interface WeekTonnage { label: string; weight: number }

function OneRMSparkline({ points }: { points: Array<{ date: string; oneRm: number }> }) {
  const theme = useTheme();
  if (points.length < 2) return null;
  const W = Dimensions.get('window').width - 88;
  const H = 56;
  const pad = { l: 4, r: 4, t: 4, b: 4 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const minRm = Math.min(...points.map(p => p.oneRm));
  const maxRm = Math.max(...points.map(p => p.oneRm));
  const range = maxRm - minRm || 1;
  const toX = (i: number) => pad.l + (i / (points.length - 1)) * cw;
  const toY = (v: number) => pad.t + ch - ((v - minRm) / range) * ch;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.oneRm)}`).join(' ');
  const last = points[points.length - 1]!;
  return (
    <Svg width={W} height={H}>
      <SvgPath_ d={d} fill="none" stroke={theme.selected} strokeWidth="1.5" />
      <SvgCircle_ cx={toX(points.length - 1)} cy={toY(last.oneRm)} r={3} fill={theme.selected} />
    </Svg>
  );
}

export function PerformanceTab({ sessions, assessments = [] }: PerformanceTabProps) {
  const theme = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const perio = useMemo(() => PeriodizationService.getCurrent(), []);

  const hasDeloadForecast = useMemo(() =>
    assessments.some(a =>
      a.forecasts?.some(f => f.kind === 'deload' && (f.horizonDays ?? 99) <= 7)
    ), [assessments]);

  const top5 = useMemo((): OneRMEntry[] => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
    const best: Record<string, OneRMEntry> = {};
    for (const session of sessions) {
      if (session.date < cutStr) continue;
      const rms = bestOneRmFromSession(session);
      for (const ex of session.exercises) {
        const rm = rms[ex.exerciseId];
        if (!rm) continue;
        const existing = best[ex.exerciseId];
        if (!existing || rm > existing.rm) {
          best[ex.exerciseId] = { exerciseId: ex.exerciseId, name: ex.name, rm, date: session.date };
        }
      }
    }
    return Object.values(best).sort((a, b) => b.rm - a.rm).slice(0, 5);
  }, [sessions]);

  const oneRmTrend = useMemo(() => oneRmTrendPerExercise(sessions, 90), [sessions]);

  const weeklyTonnage = useMemo((): WeekTonnage[] =>
    Array.from({ length: 8 }, (_, i) => {
      const offset = -(7 - i);
      return { label: offset === 0 ? 'S0' : `S${offset}`, weight: computeWeeklyTonnage(sessions, offset) };
    }), [sessions]);

  const hasPRthisWeek = useMemo(() => {
    const day = new Date().getDay() || 7;
    const monday = new Date();
    monday.setDate(monday.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    const weekStr = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
    for (const session of sessions) {
      if (session.date < weekStr) continue;
      const rms = bestOneRmFromSession(session);
      for (const [exId, rm] of Object.entries(rms)) {
        const allTimeBest = sessions
          .filter(s => s.date < weekStr)
          .reduce((best, s) => Math.max(best, bestOneRmFromSession(s)[exId] ?? 0), 0);
        if (rm > allTimeBest && allTimeBest > 0) return true;
      }
    }
    return false;
  }, [sessions]);

  const chainTonnage = useMemo(() => tonnageByChain(sessions, 28), [sessions]);
  const chainTotals = useMemo((): Record<ChainKey, number> => ({
    push: chainTonnage.push.reduce((s: number, v: number) => s + v, 0),
    pull: chainTonnage.pull.reduce((s: number, v: number) => s + v, 0),
    legs: chainTonnage.legs.reduce((s: number, v: number) => s + v, 0),
    core: chainTonnage.core.reduce((s: number, v: number) => s + v, 0),
  }), [chainTonnage]);
  const chainTotal = (Object.values(chainTotals) as number[]).reduce((s, v) => s + v, 0);

  const sessionMetrics = useMemo(() =>
    sessions.slice(-7).map(s => ({
      date: s.date,
      density: sessionDensity(s),
      adherence: sessionAdherence(s),
      tonnage: s.tonnage ?? 0,
    })), [sessions]);

  const lastDensity = sessionMetrics[sessionMetrics.length - 1]?.density ?? null;
  const lastAdherence = sessionMetrics[sessionMetrics.length - 1]?.adherence ?? null;

  if (sessions.length === 0) return <EmptyState Icon={Dumbbell} label="Aucune séance enregistrée" />;

  return (
    <View style={{ gap: 32 }}>
      <WidgetInfo
        id="W2"
        title="PERFORMANCE MÉCANIQUE"
        content="Tonnage par chaîne cinétique (Push / Pull / Legs). 1RM estimé via formule Brzycki. 3 échelles temporelles : séance (intensité/chaîne), cycle (densité 2 mois), tendance (progression hebdo). SMA_7 par chaîne pour seuils de tolérance."
      />
      {hasPRthisWeek && (
        <Card variant="flat" style={{ borderColor: theme.selected, backgroundColor: 'rgba(212,175,55,0.1)' }}>
          <View style={s.row}>
            <Text style={{ fontSize: 20 }}>🏆</Text>
            <Text style={[s.prLabel, { color: theme.selected }]}>
              Nouveau Record Personnel cette semaine
            </Text>
          </View>
        </Card>
      )}

      {perio && (
        <Card variant="flat">
          <Heading level={4} mono subtitle="État du mésocycle courant">PÉRIODISATION</Heading>
          <View style={s.grid3}>
            <View style={{ flex: 1 }}>
              <InstrumentCard label="PHASE" value={`P${perio.phase}`} status="mute" delta={PeriodizationService.getPhaseLabel(perio.phase)} index={1} />
            </View>
            <View style={{ flex: 1 }}>
              <InstrumentCard label="SEMAINE MÉSO" value={perio.mesoWeek} status={perio.mesoWeek >= 6 ? 'warn' : 'ok'} index={2} />
            </View>
            <View style={{ flex: 1 }}>
              <InstrumentCard label="DÉCHARGE" value={perio.deloadTriggered || hasDeloadForecast ? 'OUI' : 'N/A'} status={perio.deloadTriggered || hasDeloadForecast ? 'warn' : 'mute'} index={3} />
            </View>
          </View>
        </Card>
      )}

      <Card variant="flat">
        <Heading level={4} mono subtitle="Dernière séance enregistrée">INTENSITÉ & ADHÉRENCE</Heading>
        <View style={s.grid2}>
          <View style={s.gridCell}>
            <InstrumentCard label="DENSITÉ" value={lastDensity !== null ? lastDensity.toFixed(0) : '—'} unit="kg/min" status={lastDensity !== null ? (lastDensity >= 300 ? 'ok' : lastDensity >= 150 ? 'warn' : 'error') : 'mute'} index={1} />
          </View>
          <View style={s.gridCell}>
            <InstrumentCard label="ADHÉRENCE PLAN" value={lastAdherence !== null ? `${(lastAdherence * 100).toFixed(0)}` : '—'} unit="%" status={lastAdherence !== null ? (lastAdherence >= 0.9 ? 'ok' : lastAdherence >= 0.7 ? 'warn' : 'error') : 'mute'} {...(lastAdherence !== null ? { progress: lastAdherence * 100 } : {})} index={2} />
          </View>
        </View>
      </Card>

      <Card variant="flat">
        <Heading level={4} mono subtitle="Estimations · reps ≤ 12 · Brzycki·Epley·O'Conner">
          1RM ESTIMÉ · TOP 5
        </Heading>
        <View style={{ gap: 12, marginTop: 20 }}>
          {top5.length === 0 ? (
            <Text style={[s.mutedText, { color: theme.mute }]}>Pas de données sur 90 jours</Text>
          ) : top5.map((entry, i) => (
            <Touch
              key={entry.exerciseId}
              onPress={() => setSelectedExercise(selectedExercise === entry.exerciseId ? null : entry.exerciseId)}
              style={[s.exerciseRow, {
                borderBottomColor: selectedExercise === entry.exerciseId ? theme.selected : Clr.white5,
              }]}
            >
              <View style={s.row}>
                <Text style={[s.indexNum, { color: theme.mute }]}>{i + 1}</Text>
                <Text style={[s.exerciseName, { color: theme.title }]}>{entry.name}</Text>
              </View>
              <View style={s.row}>
                <Text style={[s.dateText, { color: theme.mute }]}>{entry.date}</Text>
                <Text style={[s.rmNum, { color: theme.selected }]}>
                  {entry.rm}<Text style={s.unitSm}>kg</Text>
                </Text>
              </View>
            </Touch>
          ))}
        </View>

        {selectedExercise && oneRmTrend[selectedExercise] && (
          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: Clr.white5, paddingTop: 16 }}>
            <Text style={[s.sparklineLabel, { color: theme.mute }]}>
              ÉVOLUTION 90J · {top5.find(e => e.exerciseId === selectedExercise)?.name ?? ''}
            </Text>
            <View style={{ marginTop: 8 }}>
              <OneRMSparkline points={oneRmTrend[selectedExercise]!} />
            </View>
            <View style={s.sparklineDates}>
              <Text style={[s.dateText, { color: theme.mute }]}>
                {oneRmTrend[selectedExercise]?.[0]?.date ?? ''}
              </Text>
              <Text style={[s.dateText, { color: theme.selected, fontWeight: Fw.display }]}>
                {oneRmTrend[selectedExercise]?.[oneRmTrend[selectedExercise]!.length - 1]?.oneRm.toFixed(1)}kg
              </Text>
            </View>
          </View>
        )}
      </Card>

      {chainTotal > 0 && (
        <Card variant="flat">
          <Heading level={4} mono subtitle="Équilibre cinétique · 28 jours">CHAÎNES MUSCULAIRES</Heading>
          <View style={{ gap: 12, marginTop: 16 }}>
            {(['push', 'pull', 'legs', 'core'] as ChainKey[]).map(key => {
              const kg = chainTotals[key];
              const pct = chainTotal > 0 ? (kg / chainTotal) * 100 : 0;
              const color = key === 'push' ? theme.statusOk
                : key === 'pull' ? theme.selected
                : key === 'legs' ? theme.statusInfo
                : theme.mute;
              return (
                <View key={key}>
                  <View style={s.chainHeader}>
                    <Text style={[s.chainLabel, { color }]}>{key.toUpperCase()}</Text>
                    <Text style={[s.dateText, { color: theme.mute }]}>
                      {kg > 0 ? `${(kg / 1000).toFixed(1)}t` : '—'} · {pct.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={[s.barTrack, { backgroundColor: theme.borderSoft }]}>
                    <View style={{ width: `${pct}%`, height: 6, backgroundColor: color, opacity: 0.8 }} />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      <Card variant="flat">
        <Heading level={4} mono subtitle="Charge totale · 8 semaines glissantes">TONNAGE HEBDOMADAIRE</Heading>
        <View style={{ height: 200, marginTop: 24 }}>
          <BarChart data={weeklyTonnage} dataKey="weight" color={theme.title} yUnit="kg" xLabels={weeklyTonnage.map(w => w.label)} />
        </View>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  grid3: { flexDirection: 'row', gap: 12, marginTop: 16 },
  gridCell: { width: '47%' },
  prLabel: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02, flex: 1 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: 12 },
  indexNum: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, width: 16 },
  exerciseName: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: 1.8 },
  dateText: { fontFamily: FontMono, fontSize: Fs.xs },
  rmNum: { fontFamily: FontMono, fontSize: 20, fontWeight: Fw.display },
  unitSm: { fontFamily: FontMono, fontSize: Fs.sm, opacity: 0.5 },
  sparklineLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  sparklineDates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chainHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chainLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase' },
  barTrack: { height: 6, width: '100%' },
  mutedText: { fontFamily: FontMono, fontSize: Fs.md },
});
