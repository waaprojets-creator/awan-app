import React, { useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ruler } from 'lucide-react-native';
import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
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

// ─── Measurement line chart ───────────────────────────────────────────────────

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
        {/* Grid lines */}
        {yLabels.map((v, i) => {
          const y = toY(v);
          return (
            <SvgLine_ key={i} x1={pad.l} y1={y} x2={W - pad.r} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          );
        })}
        {/* Y labels */}
        {yLabels.map((v, i) => (
          <SvgText_ key={i} x={pad.l - 4} y={toY(v) + 3} textAnchor="end" fontSize="7"
            fontFamily={FontMono} fontWeight="700" fill="rgba(255,255,255,0.4)">
            {Math.round(v)}
          </SvgText_>
        ))}
        {/* Line */}
        <SvgPath_ d={dPath} fill="none" stroke={color} strokeWidth="1.5" />
        {/* Dots */}
        {points.map((p, i) => (
          <SvgCircle_ key={i} cx={toX(i)} cy={toY(p.value)} r={2} fill={color} />
        ))}
        {/* Last value label */}
        <SvgText_ x={toX(n - 1) + 4} y={toY(last.value) + 3} fontSize="8"
          fontFamily={FontMono} fontWeight="800" fill={color}>
          {last.value}cm
        </SvgText_>
        {/* X labels — first and last */}
        <SvgText_ x={toX(0)} y={H - 2} textAnchor="middle" fontSize="7"
          fontFamily={FontMono} fontWeight="700" fill="rgba(255,255,255,0.35)">
          {points[0]?.label ?? ''}
        </SvgText_>
        <SvgText_ x={toX(n - 1)} y={H - 2} textAnchor="middle" fontSize="7"
          fontFamily={FontMono} fontWeight="700" fill="rgba(255,255,255,0.35)">
          {last.label}
        </SvgText_>
      </Svg>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function getMeasurementColors(t: Pick<AwanTheme, 'selected' | 'statusOk' | 'statusInfo' | 'statusWarn' | 'statusSpirit'>): Record<string, string> {
  return {
    waist:    t.selected,
    taille:   t.selected,
    hips:     t.statusOk,
    hanches:  t.statusOk,
    chest:    t.statusInfo,
    poitrine: t.statusInfo,
    arm:      t.statusWarn,
    bras:     t.statusWarn,
    thigh:    t.statusSpirit,
    cuisse:   t.statusSpirit,
  };
}

export function BiometrieTab({ weightTrend, history, loading }: BiometrieTabProps) {
  const theme = useTheme();
  const MEASUREMENT_COLORS = getMeasurementColors(theme);

  // Build per-key measurement series from history (sorted by date asc)
  const measurementSeries = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const series: Record<string, Array<{ label: string; value: number }>> = {};
    for (const m of sorted) {
      for (const [key, val] of Object.entries(m.measurements)) {
        if (typeof val !== 'number') continue;
        if (!series[key]) series[key] = [];
        series[key]!.push({ label: m.date.slice(5), value: val }); // MM-DD label
      }
    }
    return series;
  }, [history]);

  if (loading) return <LoadingState label="Chargement des mesures..." />;
  if (history.length === 0) return <EmptyState Icon={Ruler} label="Aucune mesure enregistrée" />;

  const weightLabels = weightTrend.map(w => w.label);

  return (
    <div className="space-y-4">
      {/* Weight curve */}
      {weightTrend.length > 1 && (
        <Card className="p-6 bg-white/5 border-white/5" variant="flat">
          <Heading level={4} mono subtitle="Trajectoire biométrique">COURBE POIDS</Heading>
          <div className="h-[200px] mt-6">
            <BarChart
              data={weightTrend}
              dataKey="weight"
              color={theme.title}
              yUnit="kg"
              xLabels={weightLabels}
            />
          </div>
        </Card>
      )}

      {/* Measurement evolution charts */}
      {Object.entries(measurementSeries)
        .filter(([, pts]) => pts.length >= 2)
        .map(([key, pts]) => {
          const color = MEASUREMENT_COLORS[key.toLowerCase()] ?? theme.mute;
          return (
            <Card key={key} className="p-6 bg-white/5 border-white/5" variant="flat">
              <Heading level={4} mono subtitle={`${pts.length} mesures · cm`}>
                {key.toUpperCase()}
              </Heading>
              <div className="mt-4">
                <MeasureLine points={pts} color={color} />
              </div>
            </Card>
          );
        })
      }

      {/* No measurement series (only 1 point each) — show latest snapshot */}
      {Object.values(measurementSeries).every(pts => pts.length < 2) && history.length > 0 && (() => {
        const latest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0]!;
        return (
          <Card className="p-5 bg-white/5 border-white/5" variant="flat">
            <div className="flex flex-row items-center justify-between mb-3">
              <span className="text-awan-sm font-mono text-awan-gold uppercase tracking-widest">{latest.date}</span>
              {latest.body_fat_pct != null && (
                <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest">{latest.body_fat_pct}% MG</span>
              )}
            </div>
            <div className="flex flex-row flex-wrap gap-4">
              {Object.entries(latest.measurements).map(([k, v]) => (
                <div key={k}>
                  <span className="text-awan-sm font-black text-awan-tx-mute uppercase block mb-1">{k}</span>
                  <span className="text-2xl font-black text-awan-tx tabular-nums font-mono">{v}<span className="text-sm ml-0.5 opacity-50">cm</span></span>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
