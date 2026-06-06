import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDbFill } from '@/hooks/useDbFill';
import { useTheme } from '@/hooks/useTheme';
import { FontSans, FontMono } from '@/constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '@/theme/tokens';

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1);
}

export function DbFillGauge() {
  const theme = useTheme();
  const { domains, total, bytes, maxBytes, loading } = useDbFill();

  if (loading) return null;

  const fillRatio = Math.min(bytes / maxBytes, 1);
  const isNearCap = fillRatio >= 0.8;
  const isAtCap = fillRatio >= 1;
  const gaugeColor = isAtCap ? theme.danger : isNearCap ? theme.statusWarn : theme.mute;

  return (
    <View style={[s.container, { backgroundColor: Clr.white5, borderColor: Clr.white10 }]}>
      <View style={s.rowBetween}>
        <Text style={[s.title, { color: theme.title }]}>REMPLISSAGE BASE</Text>
        <Text style={[s.size, { color: gaugeColor }]}>
          {formatMB(bytes)} / {formatMB(maxBytes)} MB
        </Text>
      </View>

      <View style={[s.rowBetween, { marginBottom: Sp[4] }]}>
        <Text style={[s.subtitle, { color: theme.mute }]}>
          {total} entrées · plafond {(maxBytes / 1024 / 1024).toFixed(0)} MB
        </Text>
        <Text style={[s.percent, { color: theme.text }]}>{(fillRatio * 100).toFixed(1)}%</Text>
      </View>

      <View style={[s.bar, { backgroundColor: theme.borderSoft }]}>
        {total > 0 && domains.map((d) =>
          d.count > 0 ? (
            <View
              key={d.id}
              style={{ width: `${(d.count / total) * fillRatio * 100}%` as any, backgroundColor: d.color, height: '100%' as any }}
            />
          ) : null,
        )}
      </View>

      <View style={s.legend}>
        {domains.map((d) => (
          <View key={d.id} style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: d.color }]} />
            <Text style={[s.legendLabel, { color: theme.mute }]}>{d.label}</Text>
            <Text style={[s.legendCount, { color: theme.text }]}>{d.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { borderWidth: 1, padding: 24 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  title: {
    fontFamily: FontMono,
    fontSize: Fs.xs,
    fontWeight: Fw.display,
    textTransform: 'uppercase',
    letterSpacing: Ls.xs_02,
  },
  size: { fontFamily: FontMono, fontSize: Fs.xs },
  subtitle: {
    fontFamily: FontSans,
    fontSize: Fs.sm,
    fontWeight: Fw.value,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  percent: { fontFamily: FontMono, fontSize: Fs.xs },
  bar: { height: 12, flexDirection: 'row', overflow: 'hidden' },
  legend: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '48%' },
  dot: { width: 12, height: 12, flexShrink: 0 },
  legendLabel: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.value,
    textTransform: 'uppercase',
    flex: 1,
  },
  legendCount: { fontFamily: FontMono, fontSize: Fs.sm },
});
