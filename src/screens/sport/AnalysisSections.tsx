import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Card } from '../../components/ui/Card';
import { BodySvg } from '../../components/BodySvg';
import type { MuscleId } from '../../components/BodySvg';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import { WorkoutService } from '../../services/workoutService';
import { VOLUME_LANDMARKS } from '../../constants/volumeLandmarks';
import { computeCycleScore } from '../../services/cycleScoreService';
import { useTheme } from '../../hooks/useTheme';
import { FontSans, FontMono } from '../../constants/typography';
import { Fs, Fw, Clr } from '../../theme/tokens';
import { ss, volumeToMuscleValues } from './shared';

export function CycleScoreSection({ sessions }: { sessions: WorkoutSessionLatest[] }) {
  const result = useMemo(() => computeCycleScore(sessions), [sessions]);
  const theme = useTheme();
  if (result.sessionsCount === 0) return null;
  const status = result.score >= 80 ? 'ok' : result.score >= 60 ? 'warn' : 'error';
  const statusVar = status === 'ok' ? theme.statusOk : status === 'warn' ? theme.statusWarn : theme.danger;
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>NOTE CYCLE — 4 SEMAINES</Text>
      <Card style={{ padding: 20, backgroundColor: Clr.white5 }}>
        <View style={[ss.row, { alignItems: 'baseline', gap: 12, marginBottom: 12 }]}>
          <Text style={{ fontSize: 36, fontFamily: FontMono, fontWeight: Fw.value, color: statusVar }}>{result.score}</Text>
          <Text style={[ss.sm, { color: theme.mute }]}>/ 100</Text>
          <Text style={[ss.sm, { color: theme.mute, marginLeft: 'auto' }]}>{result.sessionsCount} séances · {result.weeksObserved}/4 sem</Text>
        </View>
        <Text style={{ fontSize: Fs.md, fontWeight: Fw.value, color: theme.title, fontFamily: FontSans, lineHeight: Math.round(Fs.md * 1.5) }}>{result.diagnostic}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <BreakdownChip label="ADH." value={result.breakdown.adherence} max={20} />
          <BreakdownChip label="FRÉQ." value={result.breakdown.frequency} max={20} />
          <BreakdownChip label="PROG." value={result.breakdown.progression} max={20} />
          <BreakdownChip label="PLATE." value={result.breakdown.plateau} max={15} />
          <BreakdownChip label="RÉCUP." value={result.breakdown.recovery} max={15} />
          <BreakdownChip label="CONST." value={result.breakdown.consistency} max={10} />
        </View>
      </Card>
    </View>
  );
}

function BreakdownChip({ label, value, max }: { label: string; value: number; max: number }) {
  const theme = useTheme();
  const ratio = max > 0 ? value / max : 0;
  const color = ratio >= 0.8 ? theme.statusOk : ratio >= 0.5 ? theme.statusWarn : theme.danger;
  return (
    <View style={{ width: '31%', flexGrow: 1, backgroundColor: Clr.white5, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' }}>
      <Text style={[ss.xs, { color: theme.mute }]}>{label}</Text>
      <Text style={{ fontSize: Fs.md, fontFamily: FontMono, fontWeight: Fw.value, color }}>{value}/{max}</Text>
    </View>
  );
}

export function VolumeHeatmapSection({ sessions }: { sessions: WorkoutSessionLatest[] }) {
  const theme = useTheme();
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const vol = WorkoutService.getWeeklyVolumeByMuscle(sessions, weekStart);
  if (Object.values(vol).every(v => v === 0)) return null;
  const muscleValues = volumeToMuscleValues(vol);
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>HEATMAP MUSCULAIRE — SEMAINE</Text>
      <BodySvg mode="heatmap" muscleValues={muscleValues as Record<MuscleId, number>} />
    </View>
  );
}

export function VolumeWeekSection({ sessions }: { sessions: WorkoutSessionLatest[] }) {
  const theme = useTheme();
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const vol = WorkoutService.getWeeklyVolumeByMuscle(sessions, weekStart);
  const entries = Object.entries(VOLUME_LANDMARKS).filter(([k]) => (vol[k] ?? 0) > 0 || true);
  if (entries.every(([k]) => (vol[k] ?? 0) === 0)) return null;
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[ss.label, { color: theme.mute, marginBottom: 12 }]}>VOLUME SEMAINE</Text>
      <View style={{ gap: 8 }}>
        {entries.map(([muscle, lm]) => {
          const sets = vol[muscle] ?? 0;
          if (sets === 0) return null;
          const pct = Math.min(100, (sets / lm.mrv) * 100);
          const barColor = sets < lm.mev ? theme.danger : sets <= lm.mav[1] ? theme.statusOk : sets >= lm.mrv * 0.8 ? theme.statusWarn : theme.statusOk;
          return (
            <View key={muscle} style={[ss.row, { gap: 12 }]}>
              <Text style={[ss.xs, { color: theme.mute, width: 80, flexShrink: 0 }]}>{lm.label}</Text>
              <View style={{ flex: 1, height: 3, backgroundColor: Clr.white5 }}>
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct}%`, backgroundColor: barColor }} />
              </View>
              <Text style={{ fontSize: Fs.md, fontWeight: Fw.value, fontFamily: FontMono, color: barColor, minWidth: 32, textAlign: 'right' }}>{sets}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
