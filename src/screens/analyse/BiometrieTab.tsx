import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ruler } from 'lucide-react-native';
import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import type { MeasurementLatest } from '../../data/schemas/anthropo/measurement';
import { BarChart, EmptyState, LoadingState } from './shared';

const SvgPath_ = Path as any;
const SvgCircle_ = Circle as any;
const SvgLine_ = Line as any;
const SvgText_ = SvgText as any;

interface WeightPoint { label: string; weight: number | null }

interface BiometrieTabProps {
  weightTrend: WeightPoint[];
  history: MeasurementLatest[];
  loading: boolean;
}

function MeasureLine({ points, color }: { points: Array<{ label: string; value: number }>; color: string }) {
  const W = Dimensions.get('window').width - 88;
  const H = 90;
  const pad = { t: 8, b: 20, l: 32, r: 8 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const n = points.length;
  if (n < 2) return null;

  const minV = Math.min(...points.map(p => p.value));
  const maxV = Math.max(...points.map(p => p.value));
  const range = maxV - minV || 1;

  const toX = (i: number) => pad.l + (i / (n - 1)) * chartW;
  const toY = (v: number) => pad.t + chartH - ((v - minV) / range) * chartH;

  const dPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.value)}`).join(' ');
  const last = points[points.length - 1]!;
  const yLabels = [minV, (minV + maxV) / 2, maxV];

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H}>
        {yLabels.map((v, i) => (
          <SvgLine_ key={i} x1={pad.l} y1={toY(v)} x2={W - pad.r} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {yLabels.map((v, i) => (
          <SvgText_ key={i} x={pad.l - 4} y={toY(v) + 3} textAnchor="end" fontSize="7" fontFamily={FontMono} fontWeight="700" fill="rgba(255,255,255,0.4)">{Math.round(v)}</SvgText_>
        ))}
        <SvgPath_ d={dPath} fill="none" stroke={color} strokeWidth="1.5" />
        {points.map((p, i) => (
          <SvgCircle_ key={i} cx={toX(i)} cy={toY(p.value)} r={2} fill={color} />
        ))}
        <SvgText_ x={toX(n - 1) + 4} y={toY(last.value) + 3} fontSize="8" fontFamily={FontMono} fontWeight="800" fill={color}>{last.value}cm</SvgText_>
        <SvgText_ x={toX(0)} y={H - 2} textAnchor="middle" fontSize="7" fontFamily={FontMono} fontWeight="700" fill="rgba(255,255,255,0.35)">{points[0]?.label ?? ''}</SvgText_>
        <SvgText_ x={toX(n - 1)} y={H - 2} textAnchor="middle" fontSize="7" fontFamily={FontMono} fontWeight="700" fill="rgba(255,255,255,0.35)">{last.label}</SvgText_>
      </Svg>
    </View>
  );
}

function getMeasurementColors(t: Pick<AwanTheme, 'selected' | 'statusOk' | 'statusInfo' | 'statusWarn' | 'statusSpirit'>): Record<string, string> {
  return {
    waist: t.selected, taille: t.selected, hips: t.statusOk, hanches: t.statusOk,
    chest: t.statusInfo, poitrine: t.statusInfo, arm: t.statusWarn, bras: t.statusWarn,
    thigh: t.statusSpirit, cuisse: t.statusSpirit,
  };
}

export function BiometrieTab({ weightTrend, history, loading }: BiometrieTabProps) {
  const theme = useTheme();
  const MEASUREMENT_COLORS = getMeasurementColors(theme);

  const measurementSeries = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const series: Record<string, Array<{ label: string; value: number }>> = {};
    for (const m of sorted) {
      for (const [key, triple] of Object.entries(m.circumferences ?? {})) {
        if (!Array.isArray(triple)) continue;
        const val = (triple[0] + triple[1] + triple[2]) / 3;
        if (!series[key]) series[key] = [];
        series[key]!.push({ label: m.date.slice(5), value: val });
      }
    }
    return series;
  }, [history]);

  if (loading) return <LoadingState label="Chargement des mesures..." />;
  if (history.length === 0) return <EmptyState Icon={Ruler} label="Aucune mesure enregistrée" />;

  const weightLabels = weightTrend.map(w => w.label);

  return (
    <View style={{ gap: 16 }}>
      {weightTrend.length > 1 && (
        <Card variant="flat">
          <Heading level={4} mono subtitle="Trajectoire biométrique">COURBE POIDS</Heading>
          <View style={{ height: 200, marginTop: 24 }}>
            <BarChart data={weightTrend} dataKey="weight" color={theme.title} yUnit="kg" xLabels={weightLabels} />
          </View>
        </Card>
      )}

      {Object.entries(measurementSeries)
        .filter(([, pts]) => pts.length >= 2)
        .map(([key, pts]) => {
          const color = MEASUREMENT_COLORS[key.toLowerCase()] ?? theme.mute;
          return (
            <Card key={key} variant="flat">
              <Heading level={4} mono subtitle={`${pts.length} mesures · cm`}>{key.toUpperCase()}</Heading>
              <View style={{ marginTop: 16 }}>
                <MeasureLine points={pts} color={color} />
              </View>
            </Card>
          );
        })
      }

      {Object.values(measurementSeries).every(pts => pts.length < 2) && history.length > 0 && (() => {
        const latest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0]!;
        return (
          <Card variant="flat">
            <View style={s.snapshotHeader}>
              <Text style={[s.labelMono, { color: theme.selected }]}>{latest.date}</Text>
              {latest.body_fat_pct != null && (
                <Text style={[s.labelTitle, { color: theme.mute }]}>{latest.body_fat_pct}% MG</Text>
              )}
            </View>
            <View style={s.measureWrap}>
              {Object.entries(latest.circumferences ?? {}).map(([k, triple]) => {
                const val = Array.isArray(triple) ? Math.round(((triple[0] + triple[1] + triple[2]) / 3) * 10) / 10 : null;
                if (val === null) return null;
                return (
                  <View key={k}>
                    <Text style={[s.labelTitle, { color: theme.mute, marginBottom: 4 }]}>{k}</Text>
                    <View style={s.row}>
                      <Text style={[s.bigNum, { color: theme.title }]}>{val}</Text>
                      <Text style={[s.unit, { color: theme.mute }]}>cm</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        );
      })()}
    </View>
  );
}

const s = StyleSheet.create({
  snapshotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  measureWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  bigNum: { fontFamily: FontMono, fontSize: 24, fontWeight: Fw.display },
  unit: { fontFamily: FontMono, fontSize: Fs.sm },
  labelMono: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value },
  labelTitle: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033 },
});
