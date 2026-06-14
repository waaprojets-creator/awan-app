import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Line as SvgLineEl } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';
import { Card } from '../../components/ui/Card';
import { WidgetInfo } from '../../components/ui/WidgetInfo';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import { BarChart, EmptyState, LoadingState } from './shared';
import { PerfService } from '../../services/perfService';
import type { PerfSnapshotLatest } from '../../data/schemas/monitoring/perfSnapshot';
import { Activity } from 'lucide-react-native';

const SvgLine = SvgLineEl as any;

const RANGES: Array<{ id: number; label: string }> = [
  { id: 30, label: '30J' },
  { id: 90, label: '90J' },
];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PerfFluencyTab() {
  const theme = useTheme();
  const [days, setDays] = useState(30);
  const [snapshots, setSnapshots] = useState<PerfSnapshotLatest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    PerfService.getByDateRange(toDateStr(cutoff), toDateStr(new Date())).then(data => {
      if (mounted) { setSnapshots(data); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [days]);

  const stats = useMemo(() => PerfService.computeStats(snapshots), [snapshots]);

  const chartData = useMemo(() =>
    [...snapshots].reverse().map(s => ({
      label: s.date.slice(5),
      fps_p50: s.fps_p50 ?? 0,
    })), [snapshots]);

  const fmtFps = (v: number | null) => v === null ? '–' : v.toFixed(1);
  const fmtInt = (v: number) => Math.round(v).toString();
  const fpsStatus = stats.avgFps50 === null ? 'mute' : stats.avgFps50 >= 55 ? 'ok' : stats.avgFps50 >= 40 ? 'warn' : 'error';

  const chartWidth = Dimensions.get('window').width - 88;

  return (
    <View style={{ gap: 24 }}>
      <WidgetInfo
        id="Wx3"
        title="FLUIDITÉ"
        content="FPS mesuré via pacing requestAnimationFrame sur le thread JS. fps_p50 = médiane, fps_p5 = 5e percentile (pires frames). jank_count = frames >33ms (dropped à 30fps). Cible : p50≥55fps, p5≥40fps."
      />

      <View style={s.rangeRow}>
        {RANGES.map(r => (
          <Card key={r.id} variant="flat"
            style={[s.rangeBtn, { borderColor: r.id === days ? theme.selected : theme.border }]}
            onPress={() => setDays(r.id)}
          >
            <Text style={[s.rangeLbl, { color: r.id === days ? theme.selected : theme.mute }]}>{r.label}</Text>
          </Card>
        ))}
      </View>

      {loading ? (
        <LoadingState label="Chargement…" />
      ) : snapshots.length === 0 ? (
        <EmptyState Icon={Activity} label="Aucun snapshot — disponible dès demain" />
      ) : (
        <>
          <Card variant="flat">
            <Text style={[s.sectionTitle, { color: theme.mute }]}>FPS p50 — ÉVOLUTION</Text>
            <View style={{ height: 160, marginTop: 12 }}>
              <BarChart data={chartData} dataKey="fps_p50" color={theme.selected} yUnit="fps" xLabels={chartData.map(d => d.label)} />
            </View>
            {/* Ligne de référence 60fps */}
            <View style={{ height: 16, marginTop: -4 }}>
              <Svg width={chartWidth} height={16}>
                <SvgLine x1={0} y1={8} x2={chartWidth} y2={8}
                  stroke={theme.statusOk} strokeWidth="1" strokeDasharray="4 3" />
              </Svg>
            </View>
            <Text style={[s.legend60, { color: theme.statusOk }]}>── 60 FPS cible</Text>
          </Card>

          <View style={s.grid3}>
            <InstrumentCard label="FPS p50" value={fmtFps(stats.avgFps50)} unit="fps" status={fpsStatus as any} style={{ flex: 1 }} />
            <InstrumentCard label="FPS p5" value={fmtFps(stats.avgFps5)} unit="fps" status="mute" style={{ flex: 1 }} />
            <InstrumentCard label="JANKS p50" value={fmtInt(stats.avgJank)} unit="/s" status={stats.avgJank > 10 ? 'warn' : 'ok'} style={{ flex: 1 }} />
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  rangeRow: { flexDirection: 'row', gap: 12 },
  rangeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  rangeLbl: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, letterSpacing: Ls.sm_02 },
  sectionTitle: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033 },
  legend60: { fontFamily: FontMono, fontSize: Fs.xs, marginTop: 4 },
  grid3: { flexDirection: 'row', gap: 8 },
});
