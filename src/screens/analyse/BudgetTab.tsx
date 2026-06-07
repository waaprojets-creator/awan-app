import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ActivityIndicator, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Clock } from 'lucide-react-native';
import { startOfWeek, differenceInCalendarWeeks } from 'date-fns';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import { DateSelectPopup } from '../../components/ui/DateSelectPopup';
import type { StatusVariant } from '../../components/ui/InstrumentCard';
import { buildWeekTimeFrame, type WeekTimeFrame } from '../../services/timeFrameworkService';
import { EmptyState } from './shared';
import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';

const SvgPath_ = Path as any;
const SvgCircle_ = Circle as any;
const SvgLine_ = Line as any;
const SvgText_ = SvgText as any;

function CetGauge({ value }: { value: number }) {
  const theme = useTheme();
  const W = Dimensions.get('window').width - 88;
  const H = W / 2 + 30;
  const cx = W / 2; const cy = H - 20;
  const R = W / 2 - 20;

  const clamp = Math.max(0, Math.min(1, value));
  const angle = Math.PI * (clamp - 1);
  const needleX = cx + R * 0.75 * Math.cos(angle);
  const needleY = cy + R * 0.75 * Math.sin(angle);

  const zones = [
    { from: 0, to: 0.60, color: theme.danger, label: 'CRITIQUE' },
    { from: 0.60, to: 0.70, color: theme.statusWarn, label: 'BAS' },
    { from: 0.70, to: 0.866, color: theme.mute, label: 'STANDARD' },
    { from: 0.866, to: 1.0, color: theme.statusOk, label: 'EFFICIENT' },
  ];

  const arcPath = (from: number, to: number) => {
    const a1 = Math.PI * (from - 1);
    const a2 = Math.PI * (to - 1);
    const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  };

  const targetAngle = Math.PI * (0.866 - 1);
  const tx1 = cx + (R - 14) * Math.cos(targetAngle);
  const ty1 = cy + (R - 14) * Math.sin(targetAngle);
  const tx2 = cx + (R + 4) * Math.cos(targetAngle);
  const ty2 = cy + (R + 4) * Math.sin(targetAngle);

  const activeZone = zones.find(z => clamp >= z.from && clamp < z.to) ?? zones[zones.length - 1]!;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H}>
        {(() => {
          const a1 = Math.PI * (-1); const a2 = Math.PI * 0;
          const x1 = cx + R * Math.cos(a1); const y1 = cy + R * Math.sin(a1);
          const x2 = cx + R * Math.cos(a2); const y2 = cy + R * Math.sin(a2);
          return <SvgPath_ d={`M ${x1} ${y1} A ${R} ${R} 0 1 1 ${x2} ${y2}`}
            fill="none" stroke={theme.borderSoft} strokeWidth="12" />;
        })()}
        {zones.map(z => (
          <SvgPath_ key={z.from} d={arcPath(z.from, z.to)}
            fill="none" stroke={z.color} strokeWidth="12" opacity={0.35} />
        ))}
        <SvgPath_ d={arcPath(activeZone.from, activeZone.to)}
          fill="none" stroke={activeZone.color} strokeWidth="12" opacity={0.9} />
        <SvgLine_ x1={tx1} y1={ty1} x2={tx2} y2={ty2}
          stroke={theme.selected} strokeWidth="2" strokeDasharray="3 2" opacity={0.8} />
        <SvgLine_ x1={cx} y1={cy} x2={needleX} y2={needleY}
          stroke={theme.selected} strokeWidth="2.5" strokeLinecap="round" />
        <SvgCircle_ cx={cx} cy={cy} r={6} fill={theme.selected} />
        <SvgText_ x={cx} y={cy - 24} textAnchor="middle" fontSize="22" fontWeight="900"
          fontFamily={FontMono} fill={theme.title}>{(value * 100).toFixed(1)}%</SvgText_>
        <SvgText_ x={14} y={cy + 20} fontSize="8" fontWeight="700" fill={theme.mute}>0%</SvgText_>
        <SvgText_ x={W - 26} y={cy + 20} fontSize="8" fontWeight="700" fill={theme.mute}>100%</SvgText_>
        <SvgText_ x={cx} y={cy + 20} textAnchor="middle" fontSize="8" fontWeight="900"
          fill={activeZone.color}>{activeZone.label}</SvgText_>
      </Svg>
    </View>
  );
}

function productionStatus(h: number): StatusVariant {
  if (h >= 20) return 'ok'; if (h >= 10) return 'warn'; return 'mute';
}
function frictionStatus(h: number): StatusVariant {
  if (h <= 15) return 'ok'; if (h <= 25) return 'warn'; return 'error';
}
function slackStatus(h: number): StatusVariant {
  if (h >= 20) return 'ok'; if (h >= 10) return 'warn'; return 'error';
}
function cetStatus(cet: number): StatusVariant {
  if (cet >= 0.866) return 'ok'; if (cet >= 0.70) return 'warn'; return 'error';
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BudgetTab() {
  const theme = useTheme();
  const STATUS_COLOR_MAP = getStatusColorMap(theme);
  const [frame, setFrame] = useState<WeekTimeFrame | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(localToday);

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
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [weekOffset]);

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="small" color={theme.selected} style={{ marginBottom: 8 }} />
      <Text style={[s.label, { color: theme.mute }]}>Calcul…</Text>
    </View>
  );

  if (!frame) return <EmptyState Icon={Clock} label="Données insuffisantes" />;

  const cetPct = (frame.Cet * 100).toFixed(1);
  const cetColor = STATUS_COLOR_MAP[cetStatus(frame.Cet)];

  return (
    <View style={{ gap: 32 }}>
      <View style={{ paddingHorizontal: 8 }}>
        <DateSelectPopup value={selectedDate} onChange={setSelectedDate} max={localToday()} label="SEMAINE DU" />
      </View>

      {frame.alert && (
        <Card variant="flat" style={{ borderWidth: 1, borderColor: theme.danger, backgroundColor: `${theme.danger}1A` }}>
          <Text style={[s.label, { color: theme.danger }]}>
            ⚠ SYSTÈME FUYANT — Cet {cetPct}% · Priorité : réduire T_friction
          </Text>
        </Card>
      )}

      <Card variant="flat">
        <Heading level={4} mono subtitle="(T_production + T_slack) / T_éveil · Cible > 86.6%">
          COEFFICIENT D'EFFICIENCE
        </Heading>
        <View style={{ marginTop: 16 }}>
          <CetGauge value={frame.Cet} />
          <View style={s.legendRow}>
            {[
              { label: 'CRITIQUE', color: theme.danger },
              { label: 'BAS', color: theme.statusWarn },
              { label: 'STANDARD', color: theme.mute },
              { label: 'EFFICIENT', color: theme.statusOk },
            ].map(z => (
              <View key={z.label} style={s.legendItem}>
                <View style={[s.dot, { backgroundColor: z.color }]} />
                <Text style={[s.labelXs, { color: z.color }]}>{z.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <Card variant="flat">
        <Heading level={4} mono subtitle="Répartition hebdomadaire · 168h">RATIO TEMPOREL</Heading>
        <View style={s.grid2}>
          <View style={s.gridCell}>
            <InstrumentCard label="T SOMATIQUE" value={frame.T_somatique.toFixed(1)} unit="h/sem" status="mute" delta="cible 56h" index={1} />
          </View>
          <View style={s.gridCell}>
            <InstrumentCard label="T PRODUCTION" value={frame.T_production.toFixed(1)} unit="h/sem" status={productionStatus(frame.T_production)} {...(frame.T_production < 20 ? { delta: '< 20h cible' } : {})} index={2} />
          </View>
          <View style={s.gridCell}>
            <InstrumentCard label="T FRICTION" value={frame.T_friction.toFixed(1)} unit="h/sem" status={frictionStatus(frame.T_friction)} delta={frame.T_friction <= 15 ? '≤ 15h ✓' : 'cible < 15h'} index={3} />
          </View>
          <View style={s.gridCell}>
            <InstrumentCard label="T SLACK" value={frame.T_slack.toFixed(1)} unit="h/sem" status={slackStatus(frame.T_slack)} delta={frame.T_slack >= 20 ? '≥ 20h ✓' : 'cible 20-30h'} index={4} />
          </View>
        </View>
      </Card>

      <Card variant="flat">
        <View style={s.rowBetween}>
          <Text style={[s.labelXs, { color: theme.mute }]}>Cet hebdomadaire</Text>
          <Text style={[s.bigNum, { color: cetColor }]}>{cetPct}%</Text>
        </View>
        <Text style={[s.labelXs, { color: theme.mute, marginTop: 8 }]}>
          T_éveil {frame.T_eveil.toFixed(0)}h · semaine du {frame.weekStart}
        </Text>
        {frame.T_production === 0 && frame.T_friction === 0 && (
          <Text style={[s.labelXs, { color: theme.mute, marginTop: 12 }]}>
            Astuce : classe tes tâches (Planifier → catégorie Production / Friction) pour un calcul automatique.
          </Text>
        )}
      </Card>
    </View>
  );
}

function getStatusColorMap(t: Pick<AwanTheme, 'statusOk' | 'statusWarn' | 'danger' | 'statusSpirit' | 'mute'>): Record<StatusVariant, string> {
  return { ok: t.statusOk, warn: t.statusWarn, error: t.danger, spirit: t.statusSpirit, mute: t.mute };
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  gridCell: { width: '47%' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  bigNum: { fontFamily: FontMono, fontSize: 20, fontWeight: Fw.display, letterSpacing: Ls.tight },
});
