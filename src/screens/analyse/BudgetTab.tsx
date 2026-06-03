import React, { useEffect, useState, useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Clock } from 'lucide-react';
import { startOfWeek, differenceInCalendarWeeks } from 'date-fns';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import { DateSelectPopup } from '../../components/ui/DateSelectPopup';
import type { StatusVariant } from '../../components/ui/InstrumentCard';
import { buildWeekTimeFrame, type WeekTimeFrame } from '../../services/timeFrameworkService';
import { EmptyState } from './shared';

const SvgPath_ = Path as any;
const SvgCircle_ = Circle as any;
const SvgLine_ = Line as any;
const SvgText_ = SvgText as any;

// ─── Cet semi-circular gauge ──────────────────────────────────────────────────
// Cet = (T_production + T_slack) / T_eveil — target > 86.6%
// Source: cadre systémique CLAUDE.md — T_éveil = 112h, T_somatique = 56h

function CetGauge({ value }: { value: number }) {
  const W = Dimensions.get('window').width - 88;
  const H = W / 2 + 30;
  const cx = W / 2; const cy = H - 20;
  const R = W / 2 - 20;

  // Cet 0–1 → angle -π to 0
  const clamp = Math.max(0, Math.min(1, value));
  const angle = Math.PI * (clamp - 1);
  const needleX = cx + R * 0.75 * Math.cos(angle);
  const needleY = cy + R * 0.75 * Math.sin(angle);

  const zones = [
    { from: 0, to: 0.60, color: 'var(--color-awan-status-error)', label: 'CRITIQUE' },
    { from: 0.60, to: 0.70, color: 'var(--color-awan-status-warn)', label: 'BAS' },
    { from: 0.70, to: 0.866, color: 'var(--color-awan-tx-mute)', label: 'STANDARD' },
    { from: 0.866, to: 1.0, color: 'var(--color-awan-status-ok)', label: 'EFFICIENT' },
  ];

  const arcPath = (from: number, to: number) => {
    const a1 = Math.PI * (from - 1);
    const a2 = Math.PI * (to - 1);
    const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
    // Semi-circle gauge: total span = π, no arc can exceed π → large always 0
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  };

  // Target line at Cet = 0.866
  const targetAngle = Math.PI * (0.866 - 1);
  const tx1 = cx + (R - 14) * Math.cos(targetAngle);
  const ty1 = cy + (R - 14) * Math.sin(targetAngle);
  const tx2 = cx + (R + 4) * Math.cos(targetAngle);
  const ty2 = cy + (R + 4) * Math.sin(targetAngle);

  const activeZone = zones.find(z => clamp >= z.from && clamp < z.to) ?? zones[zones.length - 1]!;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H}>
        {/* Background arc */}
        {(() => {
          const a1 = Math.PI * (-1); const a2 = Math.PI * 0;
          const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
          const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
          return <SvgPath_ d={`M ${x1} ${y1} A ${R} ${R} 0 1 1 ${x2} ${y2}`}
            fill="none" stroke="var(--color-awan-border-soft)" strokeWidth="12" />;
        })()}

        {/* Zone arcs */}
        {zones.map(z => (
          <SvgPath_ key={z.from} d={arcPath(z.from, z.to)}
            fill="none" stroke={z.color} strokeWidth="12" opacity={0.35} />
        ))}

        {/* Active zone highlight */}
        <SvgPath_ d={arcPath(activeZone.from, activeZone.to)}
          fill="none" stroke={activeZone.color} strokeWidth="12" opacity={0.9} />

        {/* Target line at 86.6% */}
        <SvgLine_ x1={tx1} y1={ty1} x2={tx2} y2={ty2}
          stroke="var(--color-awan-gold)" strokeWidth="2" strokeDasharray="3 2" opacity={0.8} />

        {/* Needle */}
        <SvgLine_ x1={cx} y1={cy} x2={needleX} y2={needleY}
          stroke="var(--color-awan-gold)" strokeWidth="2.5" strokeLinecap="round" />
        <SvgCircle_ cx={cx} cy={cy} r={6} fill="var(--color-awan-gold)" />

        {/* Cet value */}
        <SvgText_ x={cx} y={cy - 24} textAnchor="middle" fontSize="22" fontWeight="900"
          fontFamily="var(--font-mono)" fill="var(--color-awan-tx)">{(value * 100).toFixed(1)}%</SvgText_>

        {/* Scale labels */}
        <SvgText_ x={14} y={cy + 20} fontSize="8" fontWeight="700" fill="var(--color-awan-tx-mute)">0%</SvgText_>
        <SvgText_ x={W - 26} y={cy + 20} fontSize="8" fontWeight="700" fill="var(--color-awan-tx-mute)">100%</SvgText_>
        <SvgText_ x={cx} y={cy + 20} textAnchor="middle" fontSize="8" fontWeight="900"
          fill={activeZone.color}>{activeZone.label}</SvgText_>
      </Svg>
    </View>
  );
}

// ─── T_* status helpers ───────────────────────────────────────────────────────

function productionStatus(h: number): StatusVariant {
  if (h >= 20) return 'ok';
  if (h >= 10) return 'warn';
  return 'mute';
}

function frictionStatus(h: number): StatusVariant {
  if (h <= 15) return 'ok';
  if (h <= 25) return 'warn';
  return 'error';
}

function slackStatus(h: number): StatusVariant {
  if (h >= 20) return 'ok';
  if (h >= 10) return 'warn';
  return 'error';
}

function cetStatus(cet: number): StatusVariant {
  if (cet >= 0.866) return 'ok';
  if (cet >= 0.70) return 'warn';
  return 'error';
}

// ─── Main component ───────────────────────────────────────────────────────────

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BudgetTab() {
  const [frame, setFrame] = useState<WeekTimeFrame | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(localToday);

  // Convert selectedDate to weekOffset (0 = this week, -1 = last week, …)
  const weekOffset = useMemo(() => {
    const selMonday = startOfWeek(new Date(`${selectedDate}T00:00:00`), { weekStartsOn: 1 });
    const nowMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return differenceInCalendarWeeks(selMonday, nowMonday, { weekStartsOn: 1 });
  }, [selectedDate]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    buildWeekTimeFrame(weekOffset).then(f => {
      if (active) { setFrame(f); setLoading(false); }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [weekOffset]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <span className="text-awan-md text-awan-tx-mute font-black uppercase tracking-widest">Calcul…</span>
    </div>
  );

  if (!frame) return <EmptyState Icon={Clock} label="Données insuffisantes" />;

  const cetPct = (frame.Cet * 100).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Week selector */}
      <div className="px-2">
        <DateSelectPopup
          value={selectedDate}
          onChange={setSelectedDate}
          max={localToday()}
          label="SEMAINE DU"
        />
      </div>

      {/* Alert banner */}
      {frame.alert && (
        <Card className="p-4 border border-awan-status-error bg-awan-status-error/10" variant="flat">
          <span className="text-awan-sm font-black uppercase tracking-widest text-awan-status-error">
            ⚠ SYSTÈME FUYANT — Cet {cetPct}% · Priorité : réduire T_friction
          </span>
        </Card>
      )}

      {/* Cet gauge */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="(T_production + T_slack) / T_éveil · Cible > 86.6%">
          COEFFICIENT D'EFFICIENCE
        </Heading>
        <div className="mt-4">
          <CetGauge value={frame.Cet} />
          <div className="flex flex-row justify-center gap-4 mt-4">
            {[
              { label: 'CRITIQUE', color: 'var(--color-awan-status-error)' },
              { label: 'BAS', color: 'var(--color-awan-status-warn)' },
              { label: 'STANDARD', color: 'var(--color-awan-tx-mute)' },
              { label: 'EFFICIENT', color: 'var(--color-awan-status-ok)' },
            ].map(z => (
              <div key={z.label} className="flex flex-row items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                <span className="text-awan-xs font-black uppercase tracking-widest"
                  style={{ color: z.color }}>{z.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* T_* instrument cards */}
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Répartition hebdomadaire · 168h">RATIO TEMPOREL</Heading>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <InstrumentCard
            label="T SOMATIQUE"
            value={frame.T_somatique.toFixed(1)}
            unit="h/sem"
            status="mute"
            delta={`cible 56h`}
            index={1}
          />
          <InstrumentCard
            label="T PRODUCTION"
            value={frame.T_production.toFixed(1)}
            unit="h/sem"
            status={productionStatus(frame.T_production)}
            {...(frame.T_production < 20 ? { delta: '< 20h cible' } : {})}
            index={2}
          />
          <InstrumentCard
            label="T FRICTION"
            value={frame.T_friction.toFixed(1)}
            unit="h/sem"
            status={frictionStatus(frame.T_friction)}
            delta={frame.T_friction <= 15 ? '≤ 15h ✓' : `cible < 15h`}
            index={3}
          />
          <InstrumentCard
            label="T SLACK"
            value={frame.T_slack.toFixed(1)}
            unit="h/sem"
            status={slackStatus(frame.T_slack)}
            delta={frame.T_slack >= 20 ? '≥ 20h ✓' : `cible 20-30h`}
            index={4}
          />
        </div>
      </Card>

      {/* Cet summary chip */}
      <Card className="p-4 bg-white/5 border-white/5" variant="flat">
        <div className="flex flex-row items-center justify-between">
          <span className="text-awan-xs font-black uppercase tracking-widest text-awan-tx-mute">
            Cet hebdomadaire
          </span>
          <span className="font-mono text-xl font-black"
            style={{ color: STATUS_COLOR_MAP[cetStatus(frame.Cet)] }}>
            {cetPct}%
          </span>
        </div>
        <div className="mt-2 text-awan-xs text-awan-tx-mute">
          T_éveil {frame.T_eveil.toFixed(0)}h · semaine du {frame.weekStart}
        </div>
        {frame.T_production === 0 && frame.T_friction === 0 && (
          <div className="mt-3 text-awan-xs" style={{ color: 'var(--color-awan-tx-mute)' }}>
            Astuce : classe tes tâches (Planifier → catégorie Production / Friction) pour un calcul automatique.
          </div>
        )}
      </Card>
    </div>
  );
}

const STATUS_COLOR_MAP: Record<import('../../components/ui/InstrumentCard').StatusVariant, string> = {
  ok: 'var(--color-awan-status-ok)',
  warn: 'var(--color-awan-status-warn)',
  error: 'var(--color-awan-status-error)',
  spirit: 'var(--color-awan-status-spirit)',
  mute: 'var(--color-awan-tx-mute)',
};
