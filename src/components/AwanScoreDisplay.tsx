import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Info } from 'lucide-react-native';
import type { AwanScore, ScoreStatus } from '@/hooks/useAwanScore';
import type { TemporalState } from '@/hooks/useTemporalMode';
import { Touch } from './ui/Touch';
import { useTheme, type AwanTheme } from '../hooks/useTheme';
import { FontSans, FontMono, FwMute, FwLabel, FwDisplay } from '../constants/typography';
import { Fs, Fw, Ls, Sp } from '../theme/tokens';

function getStatusVar(t: Pick<AwanTheme, 'statusOk' | 'statusWarn' | 'danger' | 'statusSpirit' | 'mute'>): Record<ScoreStatus, string> {
  return { ok: t.statusOk, warn: t.statusWarn, error: t.danger, spirit: t.statusSpirit, mute: t.mute };
}

function DomainBar({ label, value, status, index }: { label: string; value: number; status: ScoreStatus; index: number }) {
  const theme = useTheme();
  const STATUS_VAR = getStatusVar(theme);
  const color = STATUS_VAR[status];
  const width = useSharedValue(0);
  React.useEffect(() => {
    width.value = withDelay(index * 100, withTiming(value, { duration: 800 }));
  }, [value]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));

  return (
    <View style={s.domainBar}>
      <View style={[s.rowBetween, { marginBottom: 4 }]}>
        <Text style={[s.domainLabel, { color: theme.mute }]}>{label}</Text>
        <Text style={[s.domainVal, { color }]}>{value}</Text>
      </View>
      <View style={[s.barTrack, { backgroundColor: theme.border }]}>
        <Animated.View style={[s.barFill, { backgroundColor: color }, animStyle]} />
      </View>
    </View>
  );
}

interface AwanScoreDisplayProps {
  score: AwanScore;
  temporal: TemporalState;
  style?: object;
  onInfo?: () => void;
}

export function AwanScoreDisplay({ score, temporal, style, onInfo }: AwanScoreDisplayProps) {
  const theme = useTheme();
  const STATUS_VAR = getStatusVar(theme);
  const scoreColor = STATUS_VAR[score.status];
  const modeColor = STATUS_VAR[temporal.status];

  return (
    <View style={[s.container, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {/* Mode temporel + heure + ⓘ */}
      <View style={[s.rowBetween, { marginBottom: 16 }]}>
        <Text style={[s.modeLabel, { color: modeColor }]}>{temporal.label}</Text>
        <View style={[s.row, { gap: 12 }]}>
          <Text style={[s.hour, { color: theme.mute }]}>{String(temporal.hour).padStart(2, '0')}H</Text>
          {onInfo && (
            <Touch onPress={onInfo} style={s.infoBtn}>
              <Info size={12} color={theme.mute} />
            </Touch>
          )}
        </View>
      </View>

      {/* Score global */}
      <View style={[s.row, { alignItems: 'baseline', gap: 8, marginBottom: 4 }]}>
        <Text style={[s.scoreBig, { color: scoreColor }]}>{score.global}</Text>
        <Text style={[s.scoreOf, { color: theme.mute }]}>/ 100</Text>
      </View>

      <Text style={[s.scoreLabel, { color: theme.mute }]}>AWAN SCORE</Text>

      {/* Barres domaines */}
      <View style={{ gap: 12 }}>
        <DomainBar label={score.spirit.label} value={score.spirit.value} status={score.spirit.status} index={0} />
        <DomainBar label={score.body.label}   value={score.body.value}   status={score.body.status}   index={1} />
        <DomainBar label={score.time.label}   value={score.time.value}   status={score.time.status}   index={2} />
      </View>

      {/* Angle bas-droite */}
      <View style={[s.corner, { borderColor: scoreColor }]} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, borderWidth: 1, position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  modeLabel: {
    fontFamily: FontSans, fontSize: Fs.xs, fontWeight: FwLabel as any,
    letterSpacing: Ls.md_03, textTransform: 'uppercase',
  },
  hour: { fontFamily: FontMono, fontSize: Fs.xxs, fontWeight: Fw.body, opacity: 0.5 },
  infoBtn: { padding: 4 },

  scoreBig: { fontFamily: FontSans, fontSize: 80, fontWeight: FwDisplay as any, lineHeight: 80, letterSpacing: -2.4 },
  scoreOf: { fontFamily: FontMono, fontSize: Fs.lg, fontWeight: Fw.body },
  scoreLabel: {
    fontFamily: FontSans, fontSize: Fs.xxs, fontWeight: FwMute as any,
    letterSpacing: Ls.md_03 * 1.3, textTransform: 'uppercase', marginBottom: 24,
  },

  domainBar: { flexDirection: 'column' },
  domainLabel: {
    fontFamily: FontSans, fontSize: Fs.xxs, fontWeight: FwMute as any,
    textTransform: 'uppercase', letterSpacing: Ls.xxs_02,
  },
  domainVal: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value },
  barTrack: { height: 2, width: '100%' },
  barFill: { height: '100%' as any },

  corner: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderBottomWidth: 1, borderRightWidth: 1, opacity: 0.4,
  },
});
