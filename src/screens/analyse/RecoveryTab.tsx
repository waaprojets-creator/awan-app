import React, { useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Heart } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import { computeACWR, computeACWRSeries } from '../../services/analyticsService';
import { useCoach } from '../../hooks/useCoach';
import { EmptyState } from './shared';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';

const SvgPath_ = Path as any;
const SvgCircle_ = Circle as any;
const SvgLine_ = Line as any;
const SvgText_ = SvgText as any;

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface RecoveryTabProps {
  sessions: WorkoutSessionLatest[];
}

// ─── ACWR semi-circular gauge ─────────────────────────────────────────────────

function ACWRGauge({ value }: { value: number }) {
  const theme = useTheme();
  const W = Dimensions.get('window').width - 88;
  const H = W / 2 + 30;
  const cx = W / 2; const cy = H - 20;
  const R = W / 2 - 20;

  const clamp = Math.max(0, Math.min(2, value));
  const angle = Math.PI * (clamp / 2 - 1);
  const needleX = cx + R * 0.75 * Math.cos(angle);
  const needleY = cy + R * 0.75 * Math.sin(angle);

  const zones = [
    { from: 0, to: 0.8, color: theme.mute, label: 'SOUS-CHARGE' },
    { from: 0.8, to: 1.3, color: theme.statusOk, label: 'OPTIMAL' },
    { from: 1.3, to: 1.5, color: theme.statusWarn, label: 'ATTENTION' },
    { from: 1.5, to: 2.0, color: theme.danger, label: 'DANGER' },
  ];

  const arcPath = (from: number, to: number) => {
    const a1 = Math.PI * (from / 2 - 1);
    const a2 = Math.PI * (to / 2 - 1);
    const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
    // Semi-circle gauge: total span = π → no zone can be a large arc
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  };

  const activeZone = zones.find(z => clamp >= z.from && clamp < z.to) ?? zones[zones.length - 1]!;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H}>
        {(() => {
          const a1 = Math.PI * (-1);
          const a2 = Math.PI * 0;
          const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
          const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
          return <SvgPath_ d={`M ${x1} ${y1} A ${R} ${R} 0 1 1 ${x2} ${y2}`} fill="none" stroke={theme.borderSoft} strokeWidth="12" />;
        })()}
        {zones.map(z => (
          <SvgPath_ key={z.from} d={arcPath(z.from, z.to)} fill="none" stroke={z.color} strokeWidth="12" opacity={0.4} />
        ))}
        <SvgPath_ d={arcPath(activeZone.from, activeZone.to)} fill="none" stroke={activeZone.color} strokeWidth="12" opacity={0.9} />
        <SvgLine_ x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={theme.selected} strokeWidth="2.5" strokeLinecap="round" />
        <SvgCircle_ cx={cx} cy={cy} r={6} fill={theme.selected} />
        <SvgText_ x={cx} y={cy - 24} textAnchor="middle" fontSize="22" fontWeight="900" fontFamily={FontMono} fill={theme.title}>{value.toFixed(2)}</SvgText_>
        <SvgText_ x={16} y={cy + 20} fontSize="8" fontWeight="700" fill={theme.mute}>0.0</SvgText_>
        <SvgText_ x={W - 28} y={cy + 20} fontSize="8" fontWeight="700" fill={theme.mute}>2.0</SvgText_>
        <SvgText_ x={cx} y={cy + 20} textAnchor="middle" fontSize="8" fontWeight="900" fill={activeZone.color}>{activeZone.label}</SvgText_>
      </Svg>
    </View>
  );
}

// ─── ACWR 28-day line chart with axes ─────────────────────────────────────────

function ACWRCurve({ series }: { series: Array<{ date: string; acwr: number | null }> }) {
  const theme = useTheme();
  const W = Dimensions.get('window').width - 88;
  const H = 140;
  const pad = { t: 12, b: 24, l: 36, r: 8 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const maxAcwr = 2;
  const n = series.length;

  const toX = (i: number) => pad.l + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
  const toY = (v: number) => pad.t + chartH - (v / maxAcwr) * chartH;

  const points = series
    .map((p, i) => p.acwr !== null ? `${toX(i)},${toY(p.acwr)}` : null)
    .filter(Boolean) as string[];

  const yTicks = [0, 1.0, 1.3, 1.5, 2.0];
  // X labels at J-28, J-21, J-14, J-7, J0 (indices 0,7,14,21,27 if n=28)
  const xLabels = [
    { label: 'J-28', i: 0 },
    { label: 'J-21', i: Math.round(n * 7 / 28) },
    { label: 'J-14', i: Math.round(n * 14 / 28) },
    { label: 'J-7',  i: Math.round(n * 21 / 28) },
    { label: 'J0',   i: n - 1 },
  ];

  return (
    <Svg width={W} height={H}>
      {/* Y axis ticks */}
      {yTicks.map(v => {
        const y = toY(v);
        const isDanger = v === 1.5;
        const isWarn  = v === 1.3;
        const col = isDanger ? theme.danger : isWarn ? theme.statusWarn : 'rgba(255,255,255,0.12)';
        return (
          <SvgLine_ key={v} x1={pad.l} y1={y} x2={W - pad.r} y2={y}
            stroke={col} strokeWidth="1" strokeDasharray={isDanger ? '0' : isWarn ? '4 3' : '2 3'} opacity={0.6} />
        );
      })}
      {/* Y labels */}
      {yTicks.map(v => (
        <SvgText_ key={v} x={pad.l - 4} y={toY(v) + 3} textAnchor="end" fontSize="7"
          fontFamily={FontMono} fontWeight="700" fill="rgba(255,255,255,0.4)">
          {v.toFixed(1)}
        </SvgText_>
      ))}
      {/* Y unit */}
      <SvgText_ x={6} y={pad.t + chartH / 2} textAnchor="middle" fontSize="6"
        fontFamily={FontMono} fontWeight="700" fill="rgba(255,255,255,0.3)"
        rotation="-90" originX={6} originY={pad.t + chartH / 2}>ACWR</SvgText_>

      {/* ACWR polyline */}
      {points.length > 1 && (
        <SvgPath_ d={`M ${points.join(' L ')}`} fill="none" stroke={theme.selected} strokeWidth="1.5" />
      )}
      {series.map((p, i) => p.acwr !== null ? (
        <SvgCircle_ key={i} cx={toX(i)} cy={toY(p.acwr)} r={2} fill={theme.selected} />
      ) : null)}

      {/* X axis labels */}
      {xLabels.map(({ label, i }) => (
        <SvgText_ key={label} x={toX(i)} y={H - 2} textAnchor="middle" fontSize="7"
          fontFamily={FontMono} fontWeight="700" fill="rgba(255,255,255,0.4)">
          {label}
        </SvgText_>
      ))}
    </Svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RecoveryTab({ sessions }: RecoveryTabProps) {
  const theme = useTheme();
  const today = localDate();
  const { assessments } = useCoach(today);

  const hasDeloadForecast = useMemo(() =>
    assessments.some(a =>
      a.forecasts?.some(f => f.kind === 'deload' && f.horizonDays <= 7)
    ), [assessments]);

  const acwr = useMemo(() => computeACWR(sessions), [sessions]);
  const acwrSeries = useMemo(() => computeACWRSeries(sessions), [sessions]);

  const recoveryAvg7 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutStr = localDate(cutoff);
    const recent = sessions.filter(s => s.date >= cutStr && s.recoveryScore != null);
    if (recent.length === 0) return null;
    return parseFloat((recent.reduce((acc, s) => acc + (s.recoveryScore ?? 0), 0) / recent.length).toFixed(1));
  }, [sessions]);

  const last7RecoveryByDay = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const str = localDate(d);
      const s = sessions.find(x => x.date === str);
      return { date: str, score: s?.recoveryScore ?? null };
    });
  }, [sessions]);

  if (sessions.length === 0) return <EmptyState Icon={Heart} label="Aucune séance enregistrée" />;

  return (
    <div className="space-y-8">
      {hasDeloadForecast && (
        <Card className="p-4 border border-awan-status-warn bg-awan-status-warn/10" variant="flat">
          <span className="text-awan-sm font-black uppercase tracking-widest text-awan-status-warn">
            ⚠ DÉCHARGE PRÉVUE — Coach recommande une semaine de récupération dans les 7 prochains jours
          </span>
        </Card>
      )}

      {/* ACWR Gauge */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Charge Aiguë / Charge Chronique · Gabbett 2016">JAUGE ACWR</Heading>
        {acwr === null ? (
          <div className="py-6 text-center">
            <span className="text-awan-md font-black text-awan-tx-mute">
              Données insuffisantes — {sessions.length}/7 séances minimum requises
            </span>
          </div>
        ) : (
          <div className="mt-4">
            <ACWRGauge value={acwr} />
            <div className="flex flex-row justify-center gap-6 mt-4">
              {[
                { label: 'SOUS-CHARGE', color: theme.mute },
                { label: 'OPTIMAL', color: theme.statusOk },
                { label: 'ATTENTION', color: theme.statusWarn },
                { label: 'DANGER', color: theme.danger },
              ].map(z => (
                <div key={z.label} className="flex flex-row items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                  <span className="text-awan-xs font-black uppercase tracking-widest" style={{ color: z.color }}>{z.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ACWR 28j courbe avec axes */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="28 jours glissants">ÉVOLUTION ACWR</Heading>
        <div className="mt-4">
          <ACWRCurve series={acwrSeries} />
        </div>
      </Card>

      {/* Récupération 7j — barres + labels */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Score post-séance · 7 jours">RÉCUPÉRATION</Heading>
        {recoveryAvg7 === null ? (
          <span className="text-awan-md text-awan-tx-mute mt-3 block">Aucun score de récupération renseigné</span>
        ) : (
          <div className="mt-4">
            {/* Bars */}
            <div className="flex flex-row items-end gap-2 mb-1" style={{ height: 48 }}>
              {last7RecoveryByDay.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    style={{
                      width: '100%',
                      height: d.score != null ? `${(d.score / 10) * 48}px` : '2px',
                      backgroundColor: d.score != null
                        ? d.score >= 7 ? theme.statusOk
                          : d.score >= 4 ? theme.statusWarn
                          : theme.danger
                        : theme.borderSoft,
                    }}
                  />
                </div>
              ))}
            </div>
            {/* X labels — day abbreviations */}
            <div className="flex flex-row gap-2 mb-3">
              {last7RecoveryByDay.map((d, i) => {
                const dt = new Date(`${d.date}T00:00:00`);
                const day = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][dt.getDay()] ?? '';
                return (
                  <div key={i} className="flex-1 text-center">
                    <span style={{ fontFamily: FontMono, fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Y label + value */}
            <div className="flex flex-row items-center gap-2">
              <span className="text-3xl font-black font-mono" style={{
                color: recoveryAvg7 >= 7 ? theme.statusOk
                  : recoveryAvg7 >= 4 ? theme.statusWarn
                  : theme.danger
              }}>{recoveryAvg7}</span>
              <span className="text-awan-md text-awan-tx-mute font-black uppercase tracking-widest">/10 · moy. 7j</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
