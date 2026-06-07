// @ts-nocheck — legacy, rewritten per sprint
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { Card } from './ui/Card';
import { Heading } from './ui/Heading';
import { Touch } from './ui/Touch';
import { useTheme } from '../hooks/useTheme';
import { FontSans, FontMono } from '../constants/typography';
import { Fs, Fw, Ls, Sp, Clr } from '../theme/tokens';

interface BilanZenProps {
  summary: string;
  onRefresh?: () => void;
  loading?: boolean;
}

function SpinningSparkle({ loading }: { loading?: boolean }) {
  const rotation = useSharedValue(0);
  React.useEffect(() => {
    if (loading) {
      rotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
    } else {
      rotation.value = 0;
    }
  }, [loading]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    <Animated.View style={animStyle}>
      <Sparkles size={14} color="rgba(255,255,255,0.4)" />
    </Animated.View>
  );
}

export function BilanZen({ summary, onRefresh, loading }: BilanZenProps) {
  const theme = useTheme();
  if (!summary && !loading) return null;

  return (
    <Card highlight style={s.card}>
      <View style={s.headerRow}>
        <View style={[s.row, { gap: 12 }]}>
          <View style={[s.sparkleBox, { backgroundColor: Clr.gold10, borderColor: Clr.gold20 }]}>
            <Sparkles size={18} color={theme.selected} />
          </View>
          <View>
            <Text style={[s.synthLabel, { color: theme.selected }]}>SYNTHÈSE IA</Text>
            <Heading level={3} style={{ marginBottom: 0 }}>CONSCIENCE TACTIQUE</Heading>
          </View>
        </View>
        {onRefresh && (
          <Touch
            onPress={onRefresh}
            disabled={loading}
            style={[s.refreshBtn, { backgroundColor: Clr.white5, borderColor: Clr.white10 }]}
          >
            <SpinningSparkle loading={loading} />
          </Touch>
        )}
      </View>

      <Text style={[s.summary, { color: theme.title }]}>
        {loading ? 'Interrogation des vecteurs de données...' : `"${summary}"`}
      </Text>

      <View style={[s.footer, { borderTopColor: Clr.white5 }]}>
        <View style={s.dots}>
          <View style={[s.dot, { backgroundColor: Clr.gold30 }]} />
          <View style={[s.dot, { backgroundColor: 'rgba(212,175,55,0.2)' }]} />
          <View style={[s.dot, { backgroundColor: Clr.gold10 }]} />
        </View>
        <Touch style={[s.row, { gap: 8, opacity: 0.6 }]}>
          <Text style={[s.logsLabel, { color: theme.mute }]}>LOGS D'INFÉRENCE</Text>
          <ArrowRight size={10} color={theme.mute} />
        </Touch>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sparkleBox: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  synthLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.display, letterSpacing: Ls.xs_02 * 1.5, textTransform: 'uppercase', marginBottom: 2 },
  refreshBtn: { width: 32, height: 32, borderRadius: 9999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { fontFamily: FontSans, fontSize: Fs.body, lineHeight: 22, fontStyle: 'italic', opacity: 0.9 },
  footer: { marginTop: 20, paddingTop: 12, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  logsLabel: { fontFamily: FontMono, fontSize: Fs.xs, fontWeight: Fw.value, textTransform: 'uppercase', letterSpacing: Ls.xs_02 },
});
