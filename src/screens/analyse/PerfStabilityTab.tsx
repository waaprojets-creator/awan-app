import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';
import { Card } from '../../components/ui/Card';
import { WidgetInfo } from '../../components/ui/WidgetInfo';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import { EmptyState, LoadingState } from './shared';
import { PerfService } from '../../services/perfService';
import type { PerfSnapshotLatest } from '../../data/schemas/monitoring/perfSnapshot';
import { Heart } from 'lucide-react-native';
import { perfMonitor } from '../../utils/perfMonitor';

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PerfStabilityTab() {
  const theme = useTheme();
  const [snapshots, setSnapshots] = useState<PerfSnapshotLatest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    PerfService.getByDateRange(toDateStr(cutoff), toDateStr(new Date())).then(data => {
      if (mounted) { setSnapshots(data); setLoading(false); }
    });
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => PerfService.computeStats(snapshots), [snapshots]);

  const totalSessions = snapshots.length;
  const errorSessions = snapshots.filter(s => s.error_count > 0).length;
  const crashFreeRate = totalSessions > 0
    ? parseFloat(((1 - errorSessions / totalSessions) * 100).toFixed(1))
    : 100;
  const crashFreeStatus = crashFreeRate >= 99.5 ? 'ok' : crashFreeRate >= 95 ? 'warn' : 'error';

  const recentErrors = useMemo(() => {
    const msgs: string[] = [];
    for (const snap of snapshots) {
      for (const msg of snap.error_messages) {
        if (!msgs.includes(msg)) msgs.push(msg);
      }
      if (msgs.length >= 5) break;
    }
    return msgs;
  }, [snapshots]);

  const liveErrors = perfMonitor.errorMessages;

  return (
    <View style={{ gap: 24 }}>
      <WidgetInfo
        id="Wx6"
        title="STABILITÉ"
        content="error_count : nombre d'exceptions JS capturées par ErrorBoundary sur la session. crash-free rate = sessions sans erreur / total sessions (30j). Cible industrie : >99,5%."
      />

      {loading ? (
        <LoadingState label="Chargement…" />
      ) : (
        <>
          <View style={s.grid2}>
            <InstrumentCard
              label="CRASH-FREE"
              value={`${crashFreeRate}`}
              unit="%"
              status={crashFreeStatus as any}
              style={{ flex: 1 }}
            />
            <InstrumentCard
              label="ERREURS TOTALES"
              value={stats.totalErrors.toString()}
              status={stats.totalErrors === 0 ? 'ok' : 'warn'}
              style={{ flex: 1 }}
            />
          </View>

          {liveErrors.length > 0 && (
            <Card variant="flat">
              <Text style={[s.sectionTitle, { color: theme.mute }]}>SESSION COURANTE</Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                {liveErrors.map((msg, i) => (
                  <View key={i} style={s.errorRow}>
                    <Text style={[s.errorIdx, { color: theme.mute }]}>[{String(i + 1).padStart(2, '0')}]</Text>
                    <Text style={[s.errorMsg, { color: theme.danger }]} numberOfLines={2}>{msg}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {snapshots.length === 0 ? (
            <EmptyState Icon={Heart} label="Aucun historique — disponible dès demain" />
          ) : recentErrors.length === 0 ? (
            <Card variant="flat">
              <Text style={[s.noError, { color: theme.statusOk }]}>Aucune erreur sur les 30 derniers jours</Text>
            </Card>
          ) : (
            <Card variant="flat">
              <Text style={[s.sectionTitle, { color: theme.mute }]}>DERNIÈRES ERREURS</Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                {recentErrors.map((msg, i) => (
                  <View key={i} style={s.errorRow}>
                    <Text style={[s.errorIdx, { color: theme.mute }]}>[{String(i + 1).padStart(2, '0')}]</Text>
                    <Text style={[s.errorMsg, { color: theme.danger }]} numberOfLines={2}>{msg}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  grid2: { flexDirection: 'row', gap: 12 },
  sectionTitle: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033 },
  errorRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  errorIdx: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, minWidth: 32 },
  errorMsg: { fontFamily: FontMono, fontSize: Fs.sm, flex: 1 },
  noError: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textAlign: 'center', paddingVertical: 12 },
});
