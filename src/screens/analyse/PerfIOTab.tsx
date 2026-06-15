import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';
import { Card } from '../../components/ui/Card';
import { WidgetInfo } from '../../components/ui/WidgetInfo';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import { EmptyState, LoadingState, GuardCard } from './shared';
import { PerfService } from '../../services/perfService';
import type { PerfSnapshotLatest } from '../../data/schemas/monitoring/perfSnapshot';
import { Clock } from 'lucide-react-native';

const RANGES: Array<{ id: number; label: string }> = [
  { id: 30, label: '30J' },
  { id: 90, label: '90J' },
];

const SILO_PREFIXES = [
  'sleep.entry',
  'sport.session',
  'nutrition.meal',
  'anthropo.measurement',
  'planning.task',
  'journal.entry',
  'islam.prayer',
  'activity.record',
] as const;

const SILO_LABELS: Record<string, string> = {
  'sleep.entry':          'SOMMEIL',
  'sport.session':        'SPORT',
  'nutrition.meal':       'NUTRITION',
  'anthropo.measurement': 'MENSURATION',
  'planning.task':        'PLANNING',
  'journal.entry':        'JOURNAL',
  'islam.prayer':         'ISLAM',
  'activity.record':      'ACTIVITÉ',
};

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PerfIOTab() {
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

  const ioP50: Record<string, number | null> = useMemo(() =>
    Object.fromEntries(
      SILO_PREFIXES.map(p => [p, PerfService.computeIoPercentile(snapshots, p, 50)])
    ), [snapshots]);

  const hasAnyData = Object.values(ioP50).some(v => v !== null);

  const ioStatus = (ms: number | null) => {
    if (ms === null) return 'mute';
    if (ms < 20) return 'ok';
    if (ms < 100) return 'warn';
    return 'error';
  };

  return (
    <View style={{ gap: 24 }}>
      <WidgetInfo
        id="Wx5"
        title="E/S SQLITE"
        content="Latence de storage.list(prefix) par silo, mesurée via performance.now() lors de chaque snapshot quotidien. p50 sur la plage sélectionnée. Seuils : <20ms vert, 20–100ms orange, >100ms rouge."
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
        <EmptyState Icon={Clock} label="Aucun snapshot — disponible dès demain" />
      ) : !hasAnyData ? (
        <GuardCard message="Données I/O non encore disponibles" />
      ) : (
        <View style={s.grid2}>
          {SILO_PREFIXES.map(prefix => {
            const ms = ioP50[prefix] ?? null;
            return (
              <InstrumentCard
                key={prefix}
                label={SILO_LABELS[prefix] ?? prefix}
                value={ms === null ? '–' : ms.toFixed(1)}
                unit="ms"
                status={ioStatus(ms) as any}
                style={{ flex: 1, minWidth: '45%' }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  rangeRow: { flexDirection: 'row', gap: 12 },
  rangeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  rangeLbl: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display, letterSpacing: Ls.sm_02 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
