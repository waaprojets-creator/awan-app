import React from 'react';
import { Dumbbell } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { BarChart, EmptyState, LoadingState } from './shared';

interface MuscuStat { label: string; weight: number; sets: number }

interface MuscuTabProps {
  stats: MuscuStat[];
  loading: boolean;
}

export function MuscuTab({ stats, loading }: MuscuTabProps) {
  const theme = useTheme();

  if (loading) return <LoadingState label="Chargement des séances..." />;
  if (stats.length === 0) return <EmptyState Icon={Dumbbell} label="Aucune séance sur la période" />;

  return (
    <div className="space-y-8">
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Force de Projection">VOLUME TOTAL (KG)</Heading>
        <div className="h-[200px] mt-6">
          <BarChart
            data={stats}
            dataKey="weight"
            color={theme.title}
            yUnit="kg"
            xLabels={stats.map(s => s.label.slice(0, 5))}
          />
        </div>
      </Card>
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Densité Opérative">SÉRIES COMPLÉTÉES</Heading>
        <div className="h-[200px] mt-6">
          <BarChart
            data={stats}
            dataKey="sets"
            color="#FFF"
            yUnit=""
            xLabels={stats.map(s => s.label.slice(0, 5))}
          />
        </div>
      </Card>
    </div>
  );
}
