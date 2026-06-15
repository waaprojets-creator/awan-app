import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { Activity } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { InstrumentCard } from '../../components/ui/InstrumentCard';
import { WidgetInfo } from '../../components/ui/WidgetInfo';
import type { StatusVariant } from '../../components/ui/InstrumentCard';
import { SleepService } from '../../services/sleepService';
import { WeightService } from '../../services/weightService';
import { JournalService } from '../../services/journalService';
import { EmptyState, LoadingState } from './shared';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';

interface ReadinessData {
  bpmRest: number | null;
  sleepH: number | null;
  sleepQuality: number | null;
  mood: number | null;
}

function readinessBadge(data: ReadinessData, t: Pick<AwanTheme, 'danger' | 'statusWarn' | 'statusOk'>): { label: string; color: string } {
  let alerts = 0;
  if (data.bpmRest !== null && data.bpmRest > 70) alerts++;
  if (data.sleepH !== null && data.sleepH < 6) alerts++;
  if (data.sleepQuality !== null && data.sleepQuality <= 2) alerts++;
  if (data.mood !== null && data.mood <= 2) alerts++;
  if (alerts >= 2) return { label: 'REPOS RECOMMANDÉ', color: t.danger };
  if (alerts === 1) return { label: 'VIGILANCE', color: t.statusWarn };
  return { label: 'OPTIMAL', color: t.statusOk };
}

function bpmStatus(bpm: number | null): StatusVariant {
  if (bpm === null) return 'mute';
  if (bpm <= 60) return 'ok';
  if (bpm <= 70) return 'warn';
  return 'error';
}

function sleepStatus(h: number | null): StatusVariant {
  if (h === null) return 'mute';
  if (h >= 7.5) return 'ok';
  if (h >= 6) return 'warn';
  return 'error';
}

function moodStatus(m: number | null): StatusVariant {
  if (m === null) return 'mute';
  if (m >= 4) return 'ok';
  if (m >= 3) return 'warn';
  return 'error';
}

export function ReadinessTab() {
  const theme = useTheme();
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      SleepService.getAll(),
      WeightService.getAll(),
      JournalService.getAll(),
    ]).then(([sleepEntries, allWeights, journals]) => {
      if (!active) return;
      const lastSleep = sleepEntries[0] ?? null;
      const latestWeight = allWeights[0] ?? null;
      const lastJournal = journals[0] ?? null;
      setData({
        bpmRest: latestWeight?.bpm_rest ?? null,
        sleepH: lastSleep?.durationH ?? null,
        sleepQuality: lastSleep?.quality ?? null,
        mood: lastJournal?.mood ?? null,
      });
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState label="Chargement..." />;
  if (!data) return <EmptyState Icon={Activity} label="Données insuffisantes" />;

  const badge = readinessBadge(data, theme);

  return (
    <View style={{ gap: 32 }}>
      <WidgetInfo
        id="W3"
        title="PHYSIOLOGIE / RÉCUPÉRATION"
        content="État du système nerveux central : RMSSD (VFC), qualité de sommeil, humeur subjective. Corrélation avec la charge mécanique W2 pour évaluer la readiness. Tendance VFC hebdomadaire = adaptation nerveuse à long terme."
      />
      <Card variant="flat">
        <Heading level={4} mono subtitle="État du système nerveux autonome · Signaux composite">
          ÉTAT DE FORME
        </Heading>
        <View style={s.badgeRow}>
          <View style={[s.dot, { backgroundColor: badge.color }]} />
          <Text style={[s.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </Card>

      <Card variant="flat">
        <Heading level={4} mono subtitle="Dernières valeurs disponibles">SIGNAUX</Heading>
        <View style={s.grid2}>
          <View style={s.gridCell}>
            <InstrumentCard label="BPM REPOS" value={data.bpmRest !== null ? data.bpmRest : '—'} unit="bpm" status={bpmStatus(data.bpmRest)} {...(data.bpmRest !== null ? { delta: data.bpmRest <= 60 ? '≤ 60 ✓' : '> 60' } : {})} index={1} />
          </View>
          <View style={s.gridCell}>
            <InstrumentCard label="SOMMEIL" value={data.sleepH !== null ? data.sleepH.toFixed(1) : '—'} unit="h" status={sleepStatus(data.sleepH)} {...(data.sleepQuality !== null ? { delta: `qualité ${data.sleepQuality}/5` } : {})} index={2} />
          </View>
          <View style={s.gridCell}>
            <InstrumentCard label="HUMEUR" value={data.mood !== null ? data.mood : '—'} unit="/5" status={moodStatus(data.mood)} {...(data.mood !== null ? { progress: (data.mood / 5) * 100 } : {})} index={3} />
          </View>
          <View style={s.gridCell}>
            <InstrumentCard label="RMSSD" value="—" unit="ms" status="mute" delta="capteur à venir" index={4} />
          </View>
        </View>
      </Card>

      <Card variant="flat">
        <Text style={[s.infoText, { color: theme.mute }]}>
          RMSSD (variabilité cardiaque) disponible dès intégration Polar/Garmin/Apple Health.
          Source : Blatter & Cajochen 2007 — chronobiologie du système nerveux autonome.
        </Text>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  badgeLabel: { fontFamily: FontMono, fontSize: 20, fontWeight: Fw.display },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  gridCell: { width: '47%' },
  infoText: { fontFamily: FontMono, fontSize: Fs.xs, lineHeight: 18 },
});
