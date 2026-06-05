import React, { useMemo } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Ruler } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import type { MeasurementLatest } from '../../data/schemas/anthropo/measurement';
import { analyzeSymmetry, asymmetryToHeatmapValue } from '../../services/symmetryService';
import { BodySvg } from '../../components/BodySvg';
import type { MuscleId } from '../../components/BodySvg';
import { EmptyState, GuardCard } from './shared';

// Mapping symmetryService keys → BodySvg MuscleId
const MUSCLE_KEY_MAP: Partial<Record<string, MuscleId>> = {
  arm_left: 'biceps_left',
  arm_right: 'biceps_right',
  forearm_left: 'forearms_left',
  forearm_right: 'forearms_right',
  thigh_left: 'quads_left',
  thigh_right: 'quads_right',
  calf_left: 'calves_left',
  calf_right: 'calves_right',
  chest: 'chest',
};

interface OrthometryTabProps {
  history: MeasurementLatest[];
  loading: boolean;
}

export function OrthometryTab({ history, loading }: OrthometryTabProps) {
  const theme = useTheme();
  const latest = useMemo(
    () => history.slice().sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
    [history],
  );

  const results = useMemo(
    () => latest ? analyzeSymmetry(latest.measurements) : [],
    [latest],
  );

  const heatmapValues = useMemo((): Partial<Record<MuscleId, number>> => {
    const map: Partial<Record<MuscleId, number>> = {};
    for (const r of results) {
      const muscleId = MUSCLE_KEY_MAP[r.muscleKey];
      if (muscleId) map[muscleId] = asymmetryToHeatmapValue(r.diffPct);
    }
    return map;
  }, [results]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-20 opacity-30">
        <div className="w-8 h-8 rounded-full border-2 border-awan-gold border-t-transparent animate-spin mb-4" />
        <span className="text-awan-md font-black uppercase tracking-widest text-awan-tx-mute">Chargement...</span>
      </div>
    );
  }

  if (history.length === 0) return <EmptyState Icon={Ruler} label="Aucune mesure enregistrée" />;

  if (results.length === 0) {
    return (
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle="Symétrie bilatérale">ORTHOMÉTRIE</Heading>
        <GuardCard message="Aucune mesure bilatérale — saisir les valeurs Gauche/Droite dans Mensurations" />
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="p-6 bg-white/5 border-white/5" variant="flat">
        <Heading level={4} mono subtitle={`Dernière mesure · ${latest?.date ?? ''}`}>SYMÉTRIE CORPORELLE</Heading>
        <div className="flex flex-row gap-6 mt-4">
          <BodySvg mode="heatmap" muscleValues={heatmapValues} />
          <div className="flex-1 space-y-2">
            {results.map(r => (
              <div key={r.muscleKey} className="flex flex-row items-center justify-between border-b border-white/5 pb-2">
                <span className="text-awan-sm font-black text-awan-tx uppercase tracking-wide capitalize">{r.muscleKey}</span>
                <div className="flex flex-row items-center gap-3">
                  <span className="text-awan-xs font-mono text-awan-tx-mute">{r.leftCm}↔{r.rightCm}</span>
                  <span
                    className="text-awan-sm font-black font-mono"
                    style={{ color: r.asymmetric ? theme.danger : theme.statusOk }}
                  >
                    Δ{r.diffPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {results.some(r => r.asymmetric) && (
        <Card className="p-5 bg-awan-status-error/5 border-awan-status-error/20" variant="flat">
          <span className="awan-label mb-3 block" style={{ color: theme.danger }}>ASYMÉTRIES DÉTECTÉES</span>
          <div className="space-y-1">
            {results.filter(r => r.asymmetric).map(r => (
              <span key={r.muscleKey} className="block text-awan-md text-awan-tx">
                · {r.muscleKey.charAt(0).toUpperCase() + r.muscleKey.slice(1)} — écart {r.diffPct.toFixed(1)}%
                &nbsp;(G: {r.leftCm}cm / D: {r.rightCm}cm)
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
