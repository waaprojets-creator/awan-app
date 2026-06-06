import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { BarChart, EmptyState, LoadingState } from './shared';

interface MuscuStat { label: string; weight: number; sets: number }
interface MuscuTabProps { stats: MuscuStat[]; loading: boolean }

export function MuscuTab({ stats, loading }: MuscuTabProps) {
  const theme = useTheme();

  if (loading) return <LoadingState label="Chargement des séances..." />;
  if (stats.length === 0) return <EmptyState Icon={Dumbbell} label="Aucune séance sur la période" />;

  return (
    <View style={{ gap: 32 }}>
      <Card variant="flat">
        <Heading level={4} mono subtitle="Force de Projection">VOLUME TOTAL (KG)</Heading>
        <View style={{ height: 200, marginTop: 24 }}>
          <BarChart data={stats} dataKey="weight" color={theme.title} yUnit="kg" xLabels={stats.map(s => s.label.slice(0, 5))} />
        </View>
      </Card>
      <Card variant="flat">
        <Heading level={4} mono subtitle="Densité Opérative">SÉRIES COMPLÉTÉES</Heading>
        <View style={{ height: 200, marginTop: 24 }}>
          <BarChart data={stats} dataKey="sets" color="#FFF" yUnit="" xLabels={stats.map(s => s.label.slice(0, 5))} />
        </View>
      </Card>
    </View>
  );
}
