import React from 'react';
import { Ruler } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import type { MeasurementLatest } from '../../data/schemas/anthropo/measurement';
import { BarChart, EmptyState, LoadingState } from './shared';

interface WeightPoint { label: string; weight: number }

interface BiometrieTabProps {
  weightTrend: WeightPoint[];
  history: MeasurementLatest[];
  loading: boolean;
}

export function BiometrieTab({ weightTrend, history, loading }: BiometrieTabProps) {
  const theme = useTheme();

  if (loading) return <LoadingState label="Chargement des mesures..." />;
  if (history.length === 0) return <EmptyState Icon={Ruler} label="Aucune mesure enregistrée" />;

  return (
    <div className="space-y-4">
      {weightTrend.length > 1 && (
        <Card className="p-6 bg-white/5 border-white/5" variant="flat">
          <Heading level={4} mono subtitle="Trajectoire biométrique">COURBE POIDS</Heading>
          <div className="h-[200px] mt-6">
            <BarChart data={weightTrend} dataKey="weight" color={theme.title} />
          </div>
        </Card>
      )}
      {history.slice().reverse().slice(0, 10).map((m, i) => (
        <Card key={i} className="p-5 bg-white/5 border-white/5" variant="flat">
          <div className="flex flex-row items-center justify-between mb-3">
            <span className="text-awan-sm font-mono text-awan-gold uppercase tracking-widest">{m.date}</span>
            {m.body_fat_pct != null && (
              <span className="text-awan-sm font-black text-awan-tx-mute uppercase tracking-widest">{m.body_fat_pct}% MG</span>
            )}
          </div>
          <div className="flex flex-row items-end gap-6">
            <div>
              <span className="text-awan-sm font-black text-awan-tx-mute uppercase block mb-1">Poids</span>
              <span className="text-3xl font-black text-awan-gold tabular-nums font-mono">
                {m.weight}<span className="text-sm ml-1 opacity-50">KG</span>
              </span>
            </div>
            {m.bpm_rest != null && m.bpm_rest > 0 && (
              <div>
                <span className="text-awan-sm font-black text-awan-tx-mute uppercase block mb-1">BPM repos</span>
                <span className="text-2xl font-black text-awan-tx tabular-nums font-mono">{m.bpm_rest}</span>
              </div>
            )}
            {Object.entries(m.measurements).slice(0, 2).map(([k, v]) => (
              <div key={k}>
                <span className="text-awan-sm font-black text-awan-tx-mute uppercase block mb-1">{k}</span>
                <span className="text-2xl font-black text-awan-tx tabular-nums font-mono">{v}<span className="text-sm ml-0.5 opacity-50">cm</span></span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
