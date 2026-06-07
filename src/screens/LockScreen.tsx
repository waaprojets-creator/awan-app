import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, withSequence, withSpring,
} from 'react-native-reanimated';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { useAppStore } from '@/data/store/appStore';
import { L } from '../constants/labels';
import { useTheme } from '../hooks/useTheme';
import { FontSans } from '../constants/typography';
import { Fw, Ls } from '../theme/tokens';

export default function LockScreen() {
  const theme = useTheme();
  const unlock = useAppStore((s) => s.unlock);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.9);
  const logoScale = useSharedValue(1);
  const arabicOpacity = useSharedValue(1);
  const latinOpacity = useSharedValue(0);

  const letterOpacities = [
    useSharedValue(0), useSharedValue(0),
    useSharedValue(0), useSharedValue(0),
  ];
  const letterOffsets = [
    useSharedValue(30), useSharedValue(30),
    useSharedValue(30), useSharedValue(30),
  ];

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 1740 });
    containerScale.value = withTiming(1, { duration: 1740 });
    logoScale.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 2320 }),
        withTiming(1, { duration: 2320 }),
      ),
      -1,
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));
  const arabicStyle = useAnimatedStyle(() => ({ opacity: arabicOpacity.value }));
  const latinStyle = useAnimatedStyle(() => ({ opacity: latinOpacity.value }));

  const letterStyles = letterOpacities.map((op, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      opacity: op.value,
      transform: [{ translateY: letterOffsets[i]!.value }],
    }))
  );

  const handleUnlockSequence = () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    logoScale.value = withSpring(1.1);
    arabicOpacity.value = withTiming(0, { duration: 640 });
    latinOpacity.value = withTiming(1, { duration: 400 });
    ['A', 'W', 'A', 'N'].forEach((_, i) => {
      letterOpacities[i]!.value = withTiming(1, { duration: 400 });
      letterOffsets[i]!.value = withSpring(0);
    });
    setTimeout(() => { unlock(); }, 1800);
  };

  const letters = ['A', 'W', 'A', 'N'];

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <Animated.View style={[s.center, containerStyle]}>
        <Pressable onPress={handleUnlockSequence} style={s.logoPress}>
          <Animated.View style={logoStyle}>
            <HexagonLogo size={(ICON_SIZE as { hero: number }).hero} variant="rich" />
          </Animated.View>
        </Pressable>

        <View style={s.textContainer}>
          <Animated.View style={[StyleSheet.absoluteFill, s.centered, arabicStyle]}>
            <Text style={[s.text, { color: theme.title }]}>
              {(L as { header: { arabic: string } }).header.arabic}
            </Text>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, s.row, latinStyle]}>
            {letters.map((char, i) => (
              <Animated.Text key={i} style={[s.text, { color: theme.title, marginHorizontal: 2 }, letterStyles[i]]}>
                {char}
              </Animated.Text>
            ))}
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  logoPress: { padding: 20 },
  textContainer: { height: 64, width: 224, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: {
    fontFamily: FontSans,
    fontSize: 28,
    fontWeight: Fw.display,
    letterSpacing: 7,
  },
});
