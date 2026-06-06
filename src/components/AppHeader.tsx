import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { L } from '../constants/labels';
import { Touch } from './ui/Touch';
import { useTheme } from '../hooks/useTheme';
import { FontSans } from '../constants/typography';
import { Fw, Ls } from '../theme/tokens';

interface AppHeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

function RotatingLogo({ size, active, color }: { size: number; active: boolean; color: string }) {
  const rotation = useSharedValue(active ? 0 : -30);
  React.useEffect(() => {
    rotation.value = withSpring(active ? 0 : -30, { stiffness: 300, damping: 25 });
  }, [active]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    <Animated.View style={animStyle}>
      <HexagonLogo size={size} variant="simple" color={color} />
    </Animated.View>
  );
}

export default function AppHeader({ currentRoute, onNavigate }: AppHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isOn = (name: string) => currentRoute === name;

  return (
    <View
      style={[
        s.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.bg,
          borderBottomColor: 'rgba(255,255,255,0.05)',
        },
      ]}
    >
      {/* AWAN latin → Analyse */}
      <View style={s.side}>
        <Touch onPress={() => onNavigate('Analyse')} disabled={isOn('Analyse')}>
          <Text style={[s.label, { color: isOn('Analyse') ? theme.selected : theme.title }]}>
            {(L as { header: { latin: string } }).header.latin}
          </Text>
        </Touch>
      </View>

      {/* Logo hexagone → Dashboard */}
      <View style={s.center}>
        <Touch onPress={() => onNavigate('Dashboard')} scale={0.9} disabled={isOn('Dashboard')}>
          <RotatingLogo
            size={(ICON_SIZE as { header: number }).header}
            active={isOn('Dashboard')}
            color={isOn('Dashboard') ? theme.selected : theme.mute}
          />
        </Touch>
      </View>

      {/* AWAN arabe → Islam */}
      <View style={[s.side, s.sideRight]}>
        <Touch onPress={() => onNavigate('Islam')} disabled={isOn('Islam')}>
          <Text style={[s.labelArabic, { color: isOn('Islam') ? theme.selected : theme.title }]}>
            {(L as { header: { arabic: string } }).header.arabic}
          </Text>
        </Touch>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  side: { flex: 1 },
  sideRight: { alignItems: 'flex-end' },
  center: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontFamily: FontSans,
    fontSize: 13,
    fontWeight: Fw.display,
    letterSpacing: Ls.body_033,
    textTransform: 'uppercase',
  },
  labelArabic: {
    fontFamily: FontSans,
    fontSize: 14,
    fontWeight: Fw.display,
    letterSpacing: Ls.body_033,
    textTransform: 'uppercase',
  },
});
