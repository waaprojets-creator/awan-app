import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Ruler } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Clr } from '../../theme/tokens';
import type { MeasurementLatest } from '../../data/schemas/anthropo/measurement';
import { analyzeSymmetry, asymmetryToHeatmapValue } from '../../services/symmetryService';
import { BodySvg } from '../../components/BodySvg';
import type { MuscleId } from '../../components/BodySvg';
import { EmptyState, GuardCard } from './shared';

const MUSCLE_KEY_MAP: Partial<Record<string, MuscleId>> = {
  arm_left: 'biceps_left', arm_right: 'biceps_right',
  forearm_left: 'forearms_left', forearm_right: 'forearms_right',
  thigh_left: 'quads_left', thigh_right: 'quads_right',
  calf_left: 'calves_left', calf_right: 'calves_right',
  chest: 'chest',
};

interface OrthometryTabProps { history: MeasurementLatest[]; loading: boolean }

export function OrthometryTab({ history, loading }: OrthometryTabProps) {
  const theme = useTheme();
  const latest = useMemo(() => history.slice().sort((a, b) => b.date.localeCompare(a.date))[0] ?? null, [history]);
  const results = useMemo(() => latest ? analyzeSymmetry(latest.measurements) : [], [latest]);
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
      <View style={s.loadingWrap}>
        <ActivityIndicator size="small" color="rgba(212,175,55,0.5)" style={{ marginBottom: 16 }} />
        <Text style={[s.label, { color: theme.mute, opacity: 0.5 }]}>Chargement...</Text>
      </View>
    );
  }

  if (history.length === 0) return <EmptyState Icon={Ruler} label="Aucune mesure enregistrée" />;

  if (results.length === 0) {
    return (
      <Card variant="flat">
        <Heading level={4} mono subtitle="Symétrie bilatérale">ORTHOMÉTRIE</Heading>
        <GuardCard message="Aucune mesure bilatérale — saisir les valeurs Gauche/Droite dans Mensurations" />
      </Card>
    );
  }

  return (
    <View style={{ gap: 32 }}>
      <Card variant="flat">
        <Heading level={4} mono subtitle={`Dernière mesure · ${latest?.date ?? ''}`}>SYMÉTRIE CORPORELLE</Heading>
        <View style={s.bodyRow}>
          <BodySvg mode="heatmap" muscleValues={heatmapValues} />
          <View style={{ flex: 1, gap: 8 }}>
            {results.map(r => (
              <View key={r.muscleKey} style={[s.muscleRow, { borderBottomColor: Clr.white5 }]}>
                <Text style={[s.label, { color: theme.title }]}>{r.muscleKey}</Text>
                <View style={s.row}>
                  <Text style={[s.mono, { color: theme.mute }]}>{r.leftCm}↔{r.rightCm}</Text>
                  <Text style={[s.label, { color: r.asymmetric ? theme.danger : theme.statusOk }]}>
                    Δ{r.diffPct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {results.some(r => r.asymmetric) && (
        <Card variant="flat" style={{ borderColor: `${theme.danger}33`, backgroundColor: `${theme.danger}0D` }}>
          <Text style={[s.labelTitle, { color: theme.danger, marginBottom: 12 }]}>ASYMÉTRIES DÉTECTÉES</Text>
          <View style={{ gap: 4 }}>
            {results.filter(r => r.asymmetric).map(r => (
              <Text key={r.muscleKey} style={[s.bodyText, { color: theme.title }]}>
                · {r.muscleKey.charAt(0).toUpperCase() + r.muscleKey.slice(1)} — écart {r.diffPct.toFixed(1)}%
                {' '}(G: {r.leftCm}cm / D: {r.rightCm}cm)
              </Text>
            ))}
          </View>
        </Card>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  loadingWrap: { alignItems: 'center', paddingVertical: 80, opacity: 0.3 },
  bodyRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  labelTitle: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.sm_02 },
  mono: { fontFamily: FontMono, fontSize: Fs.xs },
  bodyText: { fontFamily: FontMono, fontSize: Fs.md },
});
