import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Activity } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Heading } from '../../components/ui/Heading';
import { FontMono } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';
import { BarChart, EmptyState, LoadingState } from './shared';

interface DayMeal { label: string; kcal: number; p: number }

interface NutritionTabProps {
  mealsByDay: DayMeal[];
  mealsLoading: boolean;
  todayKcal: number;
  todayP: number;
  todayC: number;
  todayF: number;
}

export function NutritionTab({ mealsByDay, mealsLoading, todayKcal, todayP, todayC, todayF }: NutritionTabProps) {
  const theme = useTheme();

  const { avgKcal, avgP, count } = React.useMemo(() => {
    let aK = 0; let aP = 0; let cnt = 0;
    mealsByDay.forEach(d => { if (d.kcal > 0) { aK += d.kcal; aP += d.p; cnt++; } });
    return { avgKcal: cnt > 0 ? Math.round(aK / cnt) : 0, avgP: cnt > 0 ? Math.round(aP / cnt) : 0, count: cnt };
  }, [mealsByDay]);

  if (mealsLoading) return <LoadingState label="Chargement nutrition..." />;
  if (count === 0 && mealsByDay.length > 0) return <EmptyState Icon={Flame} label="Aucun repas enregistré sur la période" />;

  return (
    <View style={{ gap: 32 }}>
      <Card variant="flat">
        <Text style={[s.label, { color: theme.mute, marginBottom: 8 }]}>KCAL · AUJOURD'HUI</Text>
        <View style={s.row}>
          <Text style={[s.bigNum, { color: theme.selected }]}>{todayKcal || '—'}</Text>
          {todayKcal > 0 && (
            <Text style={[s.macroText, { color: theme.mute }]}>
              {' '}· P {todayP}g · G {todayC}g · L {todayF}g
            </Text>
          )}
        </View>
      </Card>

      <View style={s.grid2}>
        <Card variant="flat" style={{ flex: 1 }}>
          <View style={[s.row, { marginBottom: 12 }]}>
            <Flame size={12} color={theme.selected} />
            <Text style={[s.label, { color: theme.selected, marginLeft: 8 }]}>Moy. Kcal</Text>
          </View>
          <Text style={[s.bigNum, { color: theme.title }]}>{avgKcal || '—'}</Text>
          {count > 0 && <Text style={[s.labelXs, { color: theme.mute, marginTop: 4 }]}>moy. sur {count} j</Text>}
        </Card>
        <Card variant="flat" style={{ flex: 1 }}>
          <View style={[s.row, { marginBottom: 12 }]}>
            <Activity size={12} color={theme.danger} />
            <Text style={[s.label, { color: theme.danger, marginLeft: 8 }]}>Moy. Prot</Text>
          </View>
          <View style={s.row}>
            <Text style={[s.bigNum, { color: theme.title }]}>{avgP || '—'}</Text>
            {avgP > 0 && <Text style={[s.unit, { color: theme.mute }]}>G</Text>}
          </View>
          {count > 0 && <Text style={[s.labelXs, { color: theme.mute, marginTop: 4 }]}>moy. sur {count} j</Text>}
        </Card>
      </View>

      <Card variant="flat">
        <Heading level={4} mono subtitle="Énergie">FLUX CALORIQUE</Heading>
        <View style={{ height: 200, marginTop: 24 }}>
          <BarChart data={mealsByDay} dataKey="kcal" color={theme.title} yUnit="kcal" xLabels={mealsByDay.map(d => d.label)} />
        </View>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  grid2: { flexDirection: 'row', gap: 16 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bigNum: { fontFamily: FontMono, fontSize: 30, fontWeight: Fw.display, letterSpacing: Ls.tight },
  unit: { fontFamily: FontMono, fontSize: Fs.sm },
  macroText: { fontFamily: FontMono, fontSize: Fs.md },
  label: { fontFamily: FontMono, fontSize: Fs.sm, fontWeight: Fw.display, textTransform: 'uppercase', letterSpacing: Ls.body_033 },
  labelXs: { fontFamily: FontMono, fontSize: Fs.xs },
});
