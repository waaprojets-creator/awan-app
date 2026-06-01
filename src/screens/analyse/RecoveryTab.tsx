import React, { useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Heart } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import type { WorkoutSessionLatest } from '../../data/schemas/sport/routine';
import { computeACWR, computeACWRSeries } from '../../services/analyticsService';
import { useCoach } from '../../hooks/useCoach';
import { EmptyState } from './shared';

const SvgPath_ = Path as any;
const SvgCircle_ = Circle as any;
const SvgLine_ = Line as any;
const SvgText_ = SvgText as any;

interface RecoveryTabProps {
  sessions: WorkoutSessionLatest[];
}

// ─── ACWR semi-circular gauge ─────────────────────────────────────────────────

function ACWRGauge({ value }: { value: number }) {
  const W = Dimensions.get('window').width - 88;
  const H = W / 2 + 30;
  const cx = W / 2; const cy = H - 20;
  const R = W / 2 - 20;

  // Convert ACWR 0–2 → angle -π to 0 (left = 0, right = 2.0)
  const clamp = Math.max(0, Math.min(2, value));
  const angle = Math.PI * (clamp / 2 - 1); // -π at 0, 0 at 2

  const needleX = cx + R * 0.75 * Math.cos(angle);
  const needleY = cy + R * 0.75 * Math.sin(angle);

  // Zone arcs: 0–0.8 = mute, 0.8–1.3 = ok, 1.3–1.5 = warn, 1.5–2.0 = error
  const zones = [
    { from: 0, to: 0.8, color: 'var(--color-awan-tx-mute)', label: 'SOUS-CHARGE' },
    { from: 0.8, to: 1.3, color: 'var(--color-awan-status-ok)', label: 'OPTIMAL' },
    { from: 1.3, to: 1.5, color: 'var(--color-awan-status-warn)', label: 'ATTENTION' },
    { from: 1.5, to: 2.0, color: 'var(--color-awan-status-error)', label: 'DANGER' },
  ];

  const arcPath = (from: number, to: number) => {
    const a1 = Math.PI * (from / 2 - 1);
    const a2 = Math.PI * (to / 2 - 1);
    const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
    const large = to - from > 1 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  };

  const activeZone = zones.find(z => clamp >= z.from && clamp < z.to) ?? zones[zones.length - 1]!;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H}>
        {/* Background arc */}
        {(() => {
          const a1 = Math.PI * (-1);
          const a2 = Math.PI * 0;
          const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
          const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
          return <SvgPath_ d={`M ${x1} ${y1} A ${R} ${R} 0 1 1 ${x2} ${y2}`} fill="none" stroke="var(--color-awan-border-soft)" strokeWidth="12" />;
        })()}

        {/* Zone arcs */}
        {zones.map(z => (
          <SvgPath_ key={z.from} d={arcPath(z.from, z.to)} fill="none" stroke={z.color} strokeWidth="12" opacity={0.4} />
        ))}

        {/* Active zone highlight */}
        <SvgPath_ d={arcPath(activeZone.from, activeZone.to)} fill="none" stroke={activeZone.color} strokeWidth="12" opacity={0.9} />

        {/* Needle */}
        <SvgLine_ x1={cx} y1={cy} x2={needleX} y2={needleY}
          stroke="var(--color-awan-gold)" strokeWidth="2.5" strokeLinecap="round" />
        <SvgCircle_ cx={cx} cy={cy} r={6} fill="var(--color-awan-gold)" />

        {/* ACWR value */}
        <SvgText_ x={cx} y={cy - 24} textAnchor="middle" fontSize="22" fontWeight="900"
          fontFamily="var(--font-mono)" fill="var(--color-awan-tx)">{value.toFixed(2)}</SvgText_>

        {/* Zone labels */}
        <SvgText_ x={16} y={cy + 20} fontSize="8" fontWeight="700" fill="var(--color-awan-tx-mute)">0.0</SvgText_>
        <SvgText_ x={W - 28} y={cy + 20} fontSize="8" fontWeight="700" fill="var(--color-awan-tx-mute)">2.0</SvgText_>
        <SvgText_ x={cx} y={cy + 20} textAnchor="middle" fontSize="8" fontWeight="900"
          fill={activeZone.color}>{activeZone.label}</SvgText_>
      </Svg>
    </View>
  );
}

// ─── ACWR 28-day line chart ───────────────────────────────────────────────────

function ACWRCurve({ series }: { series: Array<{ date: string; acwr: number | null }> }) {
  const W = Dimensions.get('window').width - 88;
  const H = 120;
  const pad = { t: 10, b: 24, l: 8, r: 8 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const maxAcwr = 2;

  const toX = (i: number) => pad.l + (i / (series.length - 1)) * chartW;
  const toY = (v: number) => pad.t + chartH - (v / maxAcwr) * chartH;

  const points = series
    .map((p, i) => p.acwr !== null ? `${toX(i)},${toY(p.acwr)}` : null)
    .filter(Boolean) as string[];

  const y13 = toY(1.3);
  const y15 = toY(1.5);

  return (
    <Svg width={W} height={H}>
      {/* Zone reference lines */}
      <SvgLine_ x1={pad.l} y1={y13} x2={W - pad.r} y2={y13}
        stroke="var(--color-awan-status-warn)" strokeWidth="1" strokeDasharray="4 3" opacity={0.5} />
      <SvgLine_ x1={pad.l} y1={y15} x2={W - pad.r} y2={y15}
        stroke="var(--color-awan-status-error)" strokeWidth="1" opacity={0.5} />

      {/* ACWR polyline */}
      {points.length > 1 && (
        <SvgPath_ d={`M ${points.join(' L ')}`} fill="none"
          stroke="var(--color-awan-gold)" strokeWidth="1.5" />
      )}

      {/* Dots for available values */}
      {series.map((p, i) => p.acwr !== null ? (
        <SvgCircle_ key={i} cx={toX(i)} cy={toY(p.acwr)} r={2} fill="var(--color-awan-gold)" />
      ) : null)}
    </Svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RecoveryTab({ sessions }: RecoveryTabProps) {
  const today = new Date().toISOString().slice(0, 10);
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
    const cutStr = cutoff.toISOString().slice(0, 10);
    const recent = sessions.filter(s => s.date >= cutStr && s.recoveryScore != null);
    if (recent.length === 0) return null;
    return parseFloat((recent.reduce((acc, s) => acc + (s.recoveryScore ?? 0), 0) / recent.length).toFixed(1));
  }, [sessions]);

  const last7RecoveryByDay = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const str = d.toISOString().slice(0, 10);
      const s = sessions.find(x => x.date === str);
      return { date: str, score: s?.recoveryScore ?? null };
    });
  }, [sessions]);

  if (sessions.length === 0) return <EmptyState Icon={Heart} label="Aucune séance enregistrée" />;

  return (
    <div className="space-y-8">
      {/* Deload forecast alert */}
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
                { label: 'SOUS-CHARGE', color: 'var(--color-awan-tx-mute)' },
                { label: 'OPTIMAL', color: 'var(--color-awan-status-ok)' },
                { label: 'ATTENTION', color: 'var(--color-awan-status-warn)' },
                { label: 'DANGER', color: 'var(--color-awan-status-error)' },
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

      {/* ACWR 28j courbe */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="28 jours glissants">ÉVOLUTION ACWR</Heading>
        <div className="mt-4">
          <ACWRCurve series={acwrSeries} />
          <div className="flex flex-row gap-4 mt-3 justify-end">
            <div className="flex flex-row items-center gap-1.5">
              <div className="w-6 h-0.5 border-t border-dashed" style={{ borderColor: 'var(--color-awan-status-warn)' }} />
              <span className="text-awan-xs font-black text-awan-tx-mute uppercase">1.3</span>
            </div>
            <div className="flex flex-row items-center gap-1.5">
              <div className="w-6 h-0.5" style={{ backgroundColor: 'var(--color-awan-status-error)' }} />
              <span className="text-awan-xs font-black text-awan-tx-mute uppercase">1.5</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Récupération 7j */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Score post-séance · 7 jours">RÉCUPÉRATION</Heading>
        {recoveryAvg7 === null ? (
          <span className="text-awan-md text-awan-tx-mute mt-3 block">Aucun score de récupération renseigné</span>
        ) : (
          <div className="mt-4">
            <div className="flex flex-row items-end gap-2 h-12 mb-3">
              {last7RecoveryByDay.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full"
                    style={{
                      height: d.score != null ? `${(d.score / 10) * 48}px` : '2px',
                      backgroundColor: d.score != null
                        ? d.score >= 7 ? 'var(--color-awan-status-ok)'
                          : d.score >= 4 ? 'var(--color-awan-status-warn)'
                          : 'var(--color-awan-status-error)'
                        : 'var(--color-awan-border-soft)',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-row items-center gap-2">
              <span className="text-3xl font-black font-mono" style={{
                color: recoveryAvg7 >= 7 ? 'var(--color-awan-status-ok)'
                  : recoveryAvg7 >= 4 ? 'var(--color-awan-status-warn)'
                  : 'var(--color-awan-status-error)'
              }}>{recoveryAvg7}</span>
              <span className="text-awan-md text-awan-tx-mute font-black uppercase tracking-widest">/10 · moy. 7j</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
