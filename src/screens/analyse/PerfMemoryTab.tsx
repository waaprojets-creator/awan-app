import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Clr } from '../../theme/tokens';
import { Card } from '../../components/ui/Card';
import { WidgetInfo } from '../../components/ui/WidgetInfo';
import { BarChart, EmptyState, LoadingState } from './shared';
import { PerfService } from '../../services/perfService';
import type { PerfSnapshotLatest } from '../../data/schemas/monitoring/perfSnapshot';
import { BarChart2 } from 'lucide-react-native';

const RANGES: Array<{ id: number; label: string }> = [
  { id: 30, label: '30J' },
  { id: 90, label: '90J' },
];

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

export function PerfMemoryTab() {
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

  const chartData = useMemo(() =>
    [...snapshots].reverse().map(s => ({
      label: s.date.slice(5),
      db_mb: parseFloat((s.db_bytes / 1_048_576).toFixed(2)),
    })), [snapshots]);

  const latestRowCounts = snapshots[0]?.row_counts ?? {};

  return (
    <View style={{ gap: 24 }}>
      <WidgetInfo
        id="Wx4"
        title="EMPREINTE"
        content="db_bytes : taille du fichier SQLite utilisateur (getSizeBytes()). row_counts : nombre de clés par préfixe silo (storage.list()). Indicateur de croissance et de risque de saturation (quota 10MB)."
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
        <EmptyState Icon={BarChart2} label="Aucun snapshot — disponible dès demain" />
      ) : (
        <>
          <Card variant="flat">
            <Text style={[s.sectionTitle, { color: theme.mute }]}>DB SQLITE — MB/JOUR</Text>
            <View style={{ height: 160, marginTop: 12 }}>
              <BarChart data={chartData} dataKey="db_mb" color={theme.selected} yUnit="MB" xLabels={chartData.map(d => d.label)} />
            </View>
          </Card>

          <Card variant="flat">
            <Text style={[s.sectionTitle, { color: theme.mute }]}>LIGNES PAR SILO</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {Object.entries(latestRowCounts).map(([prefix, count]) => {
                const warn = count > 10_000;
                return (
                  <View key={prefix} style={s.siloRow}>
                    <Text style={[s.siloLabel, { color: theme.mute }]}>
                      {SILO_LABELS[prefix] ?? prefix}
                    </Text>
                    <Text style={[s.siloCount, { color: warn ? theme.statusWarn : theme.title }]}>
                      {count.toLocaleString('fr-FR')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
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
  siloRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Clr.white8 },
  siloLabel: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.label, letterSpacing: Ls.sm_02, textTransform: 'uppercase' },
  siloCount: { fontFamily: FontMono, fontSize: Fs.md, fontWeight: Fw.display },
});
