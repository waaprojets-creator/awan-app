import React from 'react';
import { View, Text, ActivityIndicator, Dimensions, StyleSheet } from 'react-native';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';
import Svg, { Line, Rect, G, Text as SvgTextEl } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

const SvgLine = Line as any;
const SvgRect = Rect as any;
const SvgG = G as any;
const SvgText = SvgTextEl as any;

// ─── BarChart ─────────────────────────────────────────────────────────────────

interface BarChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<any>;
  dataKey: string;
  color: string;
  height?: number;
  yUnit?: string;       // ex: "kg", "kcal", "séries" — shown on Y axis
  xLabels?: string[];   // labels below each bar
  yTicks?: number;      // number of Y graduations (default 3)
}

export function BarChart({ data, dataKey, color, height = 180, yUnit, xLabels, yTicks = 3 }: BarChartProps) {
  const totalWidth = Dimensions.get('window').width - 88;
  const padLeft  = yUnit ? 36 : 8;
  const padRight = 4;
  const padTop   = 8;
  const padBot   = xLabels ? 20 : 8;
  const chartW   = totalWidth - padLeft - padRight;
  const chartH   = height - padTop - padBot;

  const maxVal = Math.max(...data.map((d: any) => Number(d[dataKey]) || 0), 1);
  const barWidth = Math.max(4, Math.min(24, chartW / Math.max(data.length, 1) - 6));

  const ticks = Array.from({ length: yTicks }, (_, i) => (i / (yTicks - 1)) * maxVal);

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Svg width={totalWidth} height={height}>
        {/* Y-axis ticks + grid */}
        {ticks.map((v, i) => {
          const y = padTop + chartH - (v / maxVal) * chartH;
          const label = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();
          return (
            <SvgG key={i}>
              <SvgLine x1={padLeft} y1={y} x2={padLeft + chartW} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              {yUnit !== undefined && (
                <SvgText x={padLeft - 4} y={y + 3} textAnchor="end" fontSize="7"
                  fontFamily={FontMono} fontWeight="700"
                  fill="rgba(255,255,255,0.35)">
                  {i === ticks.length - 1 ? `${label}${yUnit}` : label}
                </SvgText>
              )}
            </SvgG>
          );
        })}

        {/* Bars */}
        {data.map((d: any, i: number) => {
          const val = Number(d[dataKey]) || 0;
          const barH = (val / maxVal) * chartH;
          const colW = chartW / data.length;
          const x = padLeft + i * colW + (colW - barWidth) / 2;
          const y = padTop + chartH - barH;
          const xLabel = xLabels?.[i];
          const xCenter = padLeft + i * colW + colW / 2;
          return (
            <SvgG key={i}>
              <SvgRect x={x} y={y} width={barWidth} height={Math.max(barH, 0)} fill={color} rx={2} />
              {val > 0 && <SvgRect x={x} y={y} width={barWidth} height={2} fill="#FFF" opacity={0.5} />}
              {xLabel !== undefined && (
                <SvgText x={xCenter} y={padTop + chartH + padBot - 2} textAnchor="middle"
                  fontSize="7" fontFamily={FontMono} fontWeight="700"
                  fill="rgba(255,255,255,0.35)">
                  {xLabel}
                </SvgText>
              )}
            </SvgG>
          );
        })}
      </Svg>
    </View>
  );
}

// ─── Stacked bar chart (P/C/F) ────────────────────────────────────────────────

interface StackedBar {
  label: string;
  pKcal: number;
  cKcal: number;
  fKcal: number;
}

interface StackedBarChartProps {
  data: StackedBar[];
  lineA?: number | null;   // weekly (BMR+NEAT)
  lineB?: number | null;   // weekly (BMR+NEAT+EAT)
  height?: number;
}

export function StackedBarChart({ data, lineA, lineB, height = 200 }: StackedBarChartProps) {
  const theme = useTheme();
  const width = Dimensions.get('window').width - 88;
  const padding = { top: 10, bottom: 20, left: 0, right: 0 };
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(
    ...data.map(d => d.pKcal + d.cKcal + d.fKcal),
    lineA ?? 0,
    lineB ?? 0,
    1,
  );
  const barWidth = Math.max(6, Math.min(28, (width / Math.max(data.length, 1)) - 6));
  const colW = width / Math.max(data.length, 1);
  const toY = (val: number) => padding.top + chartH - (val / maxVal) * chartH;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const total = d.pKcal + d.cKcal + d.fKcal;
          const x = i * colW + (colW - barWidth) / 2;
          const pH = (d.pKcal / maxVal) * chartH;
          const cH = (d.cKcal / maxVal) * chartH;
          const fH = (d.fKcal / maxVal) * chartH;
          const baseY = padding.top + chartH;
          return (
            <SvgG key={i}>
              {/* Proteins — bottom */}
              {pH > 0 && <SvgRect x={x} y={baseY - pH} width={barWidth} height={pH} fill={theme.statusOk} rx={2} />}
              {/* Carbs — middle */}
              {cH > 0 && <SvgRect x={x} y={baseY - pH - cH} width={barWidth} height={cH} fill={theme.statusInfo} />}
              {/* Fat — top */}
              {fH > 0 && <SvgRect x={x} y={baseY - pH - cH - fH} width={barWidth} height={fH} fill={theme.statusWarn} />}
              {total > 0 && <SvgRect x={x} y={toY(total)} width={barWidth} height={2} fill="#FFF" opacity={0.5} />}
            </SvgG>
          );
        })}

        {/* Line A — BMR+NEAT (dashed) */}
        {lineA != null && lineA !== undefined && lineA > 0 && data.map((_, i) => {
          if (i === data.length - 1) return null;
          const y = toY(lineA);
          const x1 = i * colW + colW / 2;
          const x2 = (i + 1) * colW + colW / 2;
          return (
            <SvgLine key={`la${i}`} x1={x1} y1={y} x2={x2} y2={y}
              stroke={theme.mute} strokeWidth="1.5"
              strokeDasharray="4 3" />
          );
        })}

        {/* Line B — BMR+NEAT+EAT (solid) */}
        {lineB != null && lineB !== undefined && lineB > 0 && data.map((_, i) => {
          if (i === data.length - 1) return null;
          const y = toY(lineB);
          const x1 = i * colW + colW / 2;
          const x2 = (i + 1) * colW + colW / 2;
          return (
            <SvgLine key={`lb${i}`} x1={x1} y1={y} x2={x2} y2={y}
              stroke={theme.selected} strokeWidth="1.5" />
          );
        })}
      </Svg>
    </View>
  );
}

// ─── Shared UI states ─────────────────────────────────────────────────────────

export function EmptyState({ Icon, label }: { Icon: React.ComponentType<{ size: number; color?: string }>; label: string }) {
  const theme = useTheme();
  return (
    <View style={sh.emptyContainer}>
      <Icon size={48} color={theme.mute} />
      <Text style={[sh.emptyLabel, { color: theme.mute }]}>{label}</Text>
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={sh.emptyContainer}>
      <ActivityIndicator size="small" color={theme.selected} style={{ marginBottom: 16 }} />
      <Text style={[sh.loadLabel, { color: theme.mute }]}>{label}</Text>
    </View>
  );
}

export function GuardCard({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={sh.guardContainer}>
      <Text style={[sh.guardText, { color: theme.mute }]}>{message}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  emptyContainer: { alignItems: 'center', paddingVertical: 80, opacity: 0.3 },
  emptyLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.xs_02, marginTop: 16 },
  loadLabel: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.md_02 },
  guardContainer: { paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 },
  guardText: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.md_02, textAlign: 'center' },
});

// ─── Nutrition profile helpers ────────────────────────────────────────────────

export interface NutritionProfile {
  weightKg: number;
  heightCm: number;
  age: number;
  activity: string;
  goal: 'lose' | 'maintain' | 'gain';
  targetKcal: number;
  targetP: number;
  targetC: number;
  targetF: number;
}

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

// tdee = targetKcal without goal delta
export function deriveTDEE(profile: NutritionProfile): number {
  const goalDelta = profile.goal === 'gain' ? 300 : profile.goal === 'lose' ? -300 : 0;
  return profile.targetKcal - goalDelta;
}

export function loadNutritionProfile(): NutritionProfile | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('awan.nutrition.profile') : null;
    if (!raw) return null;
    return JSON.parse(raw) as NutritionProfile;
  } catch {
    return null;
  }
}
