import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Droplets } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { WidgetInfo } from '../../components/ui/WidgetInfo';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';
import { BarChart, EmptyState, LoadingState } from './shared';

interface DayWater { label: string; ml: number }

interface HydrationTabProps {
  waterByDay: DayWater[];
  waterLoading: boolean;
  todayMl: number;
  targetMl: number;
}

export function HydrationTab({ waterByDay, waterLoading, todayMl, targetMl }: HydrationTabProps) {
  const theme = useTheme();

  const { avgMl, count, daysAboveTarget } = React.useMemo(() => {
    let total = 0; let cnt = 0; let above = 0;
    waterByDay.forEach(d => {
      if (d.ml > 0) { total += d.ml; cnt++; if (d.ml >= targetMl) above++; }
    });
    return { avgMl: cnt > 0 ? Math.round(total / cnt) : 0, count: cnt, daysAboveTarget: above };
  }, [waterByDay, targetMl]);

  const pct = targetMl > 0 ? Math.min(100, Math.round((todayMl / targetMl) * 100)) : 0;

  if (waterLoading) return <LoadingState label="Chargement hydratation..." />;
  if (count === 0 && waterByDay.length > 0) return <EmptyState Icon={Droplets} label="Aucune donnée d'hydratation sur la période" />;

  return (
    <View style={{ gap: 32 }}>
      <WidgetInfo
        id="Wn2"
        title="HYDRATATION"
        content="Volume hydrique journalier (mL) vs cible 35 mL/kg. Progression vers l'objectif personnalisé, moyenne sur la période, et jours au-dessus du seuil. Silo : nutrition.water.{date}."
      />

      <Card variant="flat">
        <Text style={[s.label, { color: theme.mute, marginBottom: 8 }]}>AUJOURD'HUI</Text>
        <View style={s.row}>
          <Text style={[s.bigNum, { color: theme.selected }]}>{todayMl > 0 ? todayMl : '—'}</Text>
          {todayMl > 0 && <Text style={[s.unit, { color: theme.mute }]}>mL</Text>}
        </View>
        {targetMl > 0 && (
          <>
            <Text style={[s.labelXs, { color: theme.mute, marginTop: 4 }]}>
              cible {targetMl} mL · {pct}%
            </Text>
            <View style={[s.progressTrack, { backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 12 }]}>
              <View style={[s.progressBar, {
                width: `${pct}%` as any,
                backgroundColor: pct >= 100 ? theme.selected : theme.selected,
              }]} />
            </View>
          </>
        )}
      </Card>

      <View style={s.grid2}>
        <Card variant="flat" style={{ flex: 1 }}>
          <View style={[s.row, { marginBottom: 12 }]}>
            <Droplets size={12} color={theme.selected} />
            <Text style={[s.label, { color: theme.selected, marginLeft: 8 }]}>Moy. / jour</Text>
          </View>
          <View style={s.row}>
            <Text style={[s.bigNum, { color: theme.title }]}>{avgMl > 0 ? avgMl : '—'}</Text>
            {avgMl > 0 && <Text style={[s.unit, { color: theme.mute }]}>mL</Text>}
          </View>
          {count > 0 && <Text style={[s.labelXs, { color: theme.mute, marginTop: 4 }]}>sur {count} j enregistrés</Text>}
        </Card>
        <Card variant="flat" style={{ flex: 1 }}>
          <View style={[s.row, { marginBottom: 12 }]}>
            <Droplets size={12} color={theme.danger} />
            <Text style={[s.label, { color: theme.danger, marginLeft: 8 }]}>Cible atteinte</Text>
          </View>
          <View style={s.row}>
            <Text style={[s.bigNum, { color: theme.title }]}>{daysAboveTarget}</Text>
            {count > 0 && <Text style={[s.unit, { color: theme.mute }]}>/ {count} j</Text>}
          </View>
          {targetMl > 0 && <Text style={[s.labelXs, { color: theme.mute, marginTop: 4 }]}>≥ {targetMl} mL/j</Text>}
        </Card>
      </View>

      {waterByDay.length > 1 && (
        <Card variant="flat">
          <Heading level={4} mono subtitle="Volume">FLUX HYDRIQUE</Heading>
          <View style={{ height: 200, marginTop: 24 }}>
            <BarChart
              data={waterByDay}
              dataKey="ml"
              color={theme.selected}
              yUnit="mL"
              xLabels={waterByDay.map(d => d.label)}
            />
          </View>
        </Card>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  grid2: { flexDirection: 'row', gap: 16 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bigNum: { fontFamily: FontMono, fontSize: 30, fontWeight: Fw.display, letterSpacing: Ls.tight },
  unit: { fontFamily: FontMono, fontSize: Fs.sm },
  label: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033 },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: 4, borderRadius: 2 },
});
