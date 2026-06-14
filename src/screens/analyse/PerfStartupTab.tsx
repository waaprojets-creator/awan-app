import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';
import { Card } from '../../components/ui/Card';
import { WidgetInfo } from '../../components/ui/WidgetInfo';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import { BarChart, EmptyState, LoadingState } from './shared';
import { PerfService } from '../../services/perfService';
import type { PerfSnapshotLatest } from '../../data/schemas/monitoring/perfSnapshot';
import { Clock } from 'lucide-react-native';

const RANGES: Array<{ id: number; label: string }> = [
  { id: 30, label: '30J' },
  { id: 90, label: '90J' },
];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PerfStartupTab() {
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
      boot_ms: s.boot_ms ?? 0,
    })), [snapshots]);

  const fmtMs = (v: number | null) => v === null ? '–' : `${Math.round(v)}`;
  const bootStatus = stats.avgBootMs === null ? 'mute' : stats.avgBootMs < 1000 ? 'ok' : stats.avgBootMs < 2000 ? 'warn' : 'error';
  const hydrStatus = stats.avgHydrationMs === null ? 'mute' : stats.avgHydrationMs < 500 ? 'ok' : 'warn';

  return (
    <View style={{ gap: 24 }}>
      <WidgetInfo
        id="Wx2"
        title="DÉMARRAGE"
        content="boot_ms : durée entre le lancement natif (registerRootComponent) et ready=true. hydration_ms : temps de la phase Promise.allSettled (SQLite + caches services). Snapshot enregistré à minuit pour construire les tendances."
      />

      <View style={s.rangeRow}>
        {RANGES.map(r => (
          <Card
            key={r.id}
            variant="flat"
            style={[s.rangeBtn, { borderColor: r.id === days ? theme.selected : theme.border }]}
            onPress={() => setDays(r.id)}
          >
            <Text style={[s.rangeLbl, { color: r.id === days ? theme.selected : theme.mute }]}>
              {r.label}
            </Text>
          </Card>
        ))}
      </View>

      {loading ? (
        <LoadingState label="Chargement…" />
      ) : snapshots.length === 0 ? (
        <EmptyState Icon={Clock} label="Aucun snapshot — disponible dès demain" />
      ) : (
        <>
          <Card variant="flat">
            <Text style={[s.sectionTitle, { color: theme.mute }]}>BOOT MS — ÉVOLUTION</Text>
            <View style={{ height: 160, marginTop: 12 }}>
              <BarChart data={chartData} dataKey="boot_ms" color={theme.selected} yUnit="ms" xLabels={chartData.map(d => d.label)} />
            </View>
          </Card>

          <View style={s.grid2}>
            <InstrumentCard
              label="BOOT p50"
              value={fmtMs(stats.avgBootMs)}
              unit="ms"
              status={bootStatus as any}
              style={{ flex: 1 }}
            />
            <InstrumentCard
              label="HYDRATATION p50"
              value={fmtMs(stats.avgHydrationMs)}
              unit="ms"
              status={hydrStatus as any}
              style={{ flex: 1 }}
            />
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
  grid2: { flexDirection: 'row', gap: 12 },
});
