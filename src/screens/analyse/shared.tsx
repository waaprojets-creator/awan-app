import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Line, Rect, G } from 'react-native-svg';

const SvgLine = Line as any;
const SvgRect = Rect as any;
const SvgG = G as any;

// ─── BarChart ─────────────────────────────────────────────────────────────────

interface BarChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<any>;
  dataKey: string;
  color: string;
  height?: number;
}

export function BarChart({ data, dataKey, color, height = 180 }: BarChartProps) {
  const width = Dimensions.get('window').width - 88;
  const padding = 20;
  const barWidth = Math.max(4, Math.min(24, (width - padding * 2) / Math.max(data.length, 1) - 6));
  const maxVal = Math.max(...data.map((d: any) => Number(d[dataKey]) || 0), 1);

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {[0, 0.5, 1].map((v, i) => (
          <SvgLine
            key={i}
            x1={0} y1={height - padding - v * (height - padding * 2)}
            x2={width} y2={height - padding - v * (height - padding * 2)}
            stroke="rgba(255,255,255,0.03)" strokeWidth="1"
          />
        ))}
        {data.map((d: any, i: number) => {
          const val = Number(d[dataKey]) || 0;
          const barH = (val / maxVal) * (height - padding * 2);
          const x = i * (width / data.length) + (width / data.length - barWidth) / 2;
          const y = height - padding - barH;
          return (
            <SvgG key={i}>
              <SvgRect x={x} y={y} width={barWidth} height={barH} fill={color} rx={2} />
              {val > 0 && <SvgRect x={x} y={y} width={barWidth} height={2} fill="#FFF" opacity={0.5} />}
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
              {pH > 0 && <SvgRect x={x} y={baseY - pH} width={barWidth} height={pH} fill="var(--color-awan-status-ok)" rx={2} />}
              {/* Carbs — middle */}
              {cH > 0 && <SvgRect x={x} y={baseY - pH - cH} width={barWidth} height={cH} fill="var(--color-awan-status-info)" />}
              {/* Fat — top */}
              {fH > 0 && <SvgRect x={x} y={baseY - pH - cH - fH} width={barWidth} height={fH} fill="var(--color-awan-status-warn)" />}
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
              stroke="var(--color-awan-tx-mute)" strokeWidth="1.5"
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
              stroke="var(--color-awan-gold)" strokeWidth="1.5" />
          );
        })}
      </Svg>
    </View>
  );
}

// ─── Shared UI states ─────────────────────────────────────────────────────────

export function EmptyState({ Icon, label }: { Icon: React.ComponentType<{ size: number; className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center py-20 opacity-30">
      <Icon size={48} className="text-awan-tx-mute mb-4" />
      <span className="text-xs font-bold uppercase tracking-widest text-awan-tx-mute">{label}</span>
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-20 opacity-30">
      <div className="w-8 h-8 rounded-full border-2 border-awan-gold border-t-transparent animate-spin mb-4" />
      <span className="text-awan-md font-black uppercase tracking-widest text-awan-tx-mute">{label}</span>
    </div>
  );
}

export function GuardCard({ message }: { message: string }) {
  return (
    <div className="py-10 text-center px-6">
      <span className="text-awan-md font-black uppercase tracking-widest" style={{ color: 'var(--color-awan-tx-mute)' }}>
        {message}
      </span>
    </div>
  );
}

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
