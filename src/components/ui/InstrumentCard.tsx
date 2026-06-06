import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Touch } from './Touch';
import { useTheme, type AwanTheme } from '../../hooks/useTheme';
import { FontSans, FontMono } from '../../constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '../../theme/tokens';

export type StatusVariant = 'ok' | 'warn' | 'error' | 'spirit' | 'mute';

interface InstrumentCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: StatusVariant;
  progress?: number;
  delta?: string;
  index?: number;
  onPress?: () => void;
  style?: object;
}

function getStatusColor(t: Pick<AwanTheme, 'statusOk' | 'statusWarn' | 'danger' | 'statusSpirit' | 'mute'>): Record<StatusVariant, string> {
  return { ok: t.statusOk, warn: t.statusWarn, error: t.danger, spirit: t.statusSpirit, mute: t.mute };
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const width = useSharedValue(0);
  React.useEffect(() => {
    width.value = withTiming(Math.min(100, Math.max(0, progress)), { duration: 600 });
  }, [progress]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={[s.progressTrack, { backgroundColor: Clr.white5 }]}>
      <Animated.View style={[s.progressFill, { backgroundColor: color }, animStyle]} />
    </View>
  );
}

export function InstrumentCard({
  label, value, unit, status = 'mute', progress, delta, index, onPress, style,
}: InstrumentCardProps) {
  const theme = useTheme();
  const STATUS_COLOR = getStatusColor(theme);
  const statusColor = STATUS_COLOR[status];

  const inner = (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {index !== undefined && (
        <Text style={[s.index, { color: theme.mute }]}>
          [{String(index).padStart(2, '0')}]
        </Text>
      )}
      <Text style={[s.label, { color: theme.mute }]}>{label}</Text>
      <View style={s.valueRow}>
        <Text style={[s.valueBig, { color: statusColor }]}>{value}</Text>
        {unit && <Text style={[s.unit, { color: theme.mute }]}>{unit}</Text>}
      </View>
      {delta && (
        <Text style={[s.delta, { color: delta.startsWith('+') ? theme.statusOk : theme.danger }]}>
          {delta}
        </Text>
      )}
      {progress !== undefined && <ProgressBar progress={progress} color={statusColor} />}
    </View>
  );

  if (onPress) {
    return <Touch onPress={onPress} scale={0.97}>{inner}</Touch>;
  }
  return inner;
}

const s = StyleSheet.create({
  card: {
    position: 'relative',
    padding: Sp[4],
    borderWidth: 1,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  index: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontFamily: FontMono,
    fontSize: Fs.xxs,
    fontWeight: Fw.body,
    opacity: 0.5,
    letterSpacing: Ls.xxs_02,
  },
  label: {
    fontFamily: FontSans,
    fontSize: Fs.xs,
    fontWeight: Fw.mute,
    textTransform: 'uppercase',
    letterSpacing: Ls.xs_02,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  valueBig: {
    fontFamily: FontMono,
    fontSize: Fs.data,
    fontWeight: Fw.value,
    lineHeight: 22,
    letterSpacing: -0.44,
  },
  unit: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.body,
  },
  delta: {
    marginTop: 2,
    fontFamily: FontSans,
    fontSize: Fs.sm,
    fontWeight: Fw.mute,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  progressFill: { height: '100%' },
});
