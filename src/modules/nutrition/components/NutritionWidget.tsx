// @ts-nocheck — legacy, rewritten per sprint
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { AnimatedPressable } from '../../../components/Animated';

interface NutritionWidgetProps {
  data: {
    tdee: number;
    calories: number;
    remaining: number;
    progress: number;
    macros: { protein: number; carbs: number; fat: number; calories: number; };
  };
  onPress: () => void;
}

export function NutritionWidget({ data, onPress }: NutritionWidgetProps) {
  const theme = useTheme();
  const s = React.useMemo(() => makeStyles(theme), [theme]);
  const barWidth = `${Math.min(data.progress * 100, 100)}%`;

  return (
    <AnimatedPressable style={s.container} onPress={onPress}>
      <View style={s.header}>
        <Text style={s.title}>NUTRITION</Text>
        <Text style={s.subtitle}>{data.remaining} kcal restants</Text>
      </View>

      <View style={s.gaugeBg}>
        <View style={[s.gaugeFill, { width: barWidth }]} />
      </View>

      <View style={s.macrosRow}>
        <MacroToken s={s} label="PR" value={`${data.macros.protein}g`} />
        <MacroToken s={s} label="GL" value={`${data.macros.carbs}g`} />
        <MacroToken s={s} label="LI" value={`${data.macros.fat}g`} />
      </View>
    </AnimatedPressable>
  );
}

function MacroToken({ s, label, value }: { s: any; label: string; value: string }) {
  return (
    <View style={s.token}>
      <Text style={s.tokenLabel}>{label}</Text>
      <Text style={s.tokenValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.text,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  title: { fontSize: 12, color: theme.title, letterSpacing: 2, fontWeight: '700' },
  subtitle: { fontSize: 10, color: theme.text },
  gaugeBg: { height: 6, backgroundColor: theme.surface, borderRadius: 3, marginBottom: 12, overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: theme.selected, borderRadius: 3 },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-between' },
  token: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tokenLabel: { fontSize: 10, color: theme.text, letterSpacing: 1 },
  tokenValue: { fontSize: 12, color: theme.title, fontWeight: '500' },
});
