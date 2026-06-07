import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInLeft, FadeIn } from 'react-native-reanimated';
import { FontSans, FontMono } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';
import { Fs, Fw, Ls, Lh } from '../../theme/tokens';

interface HeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  subtitle?: string;
  mono?: boolean;
  style?: object;
  [x: string]: any;
}

const SIZES: Record<number, { fontSize: number; lineHeight: number; fontWeight: string }> = {
  1: { fontSize: 24, lineHeight: 32, fontWeight: Fw.value },
  2: { fontSize: 20, lineHeight: 28, fontWeight: Fw.value },
  3: { fontSize: 18, lineHeight: 26, fontWeight: Fw.label },
  4: { fontSize: Fs.sm, lineHeight: Lh.sm, fontWeight: Fw.value },
};

export function Heading({
  children,
  level = 1,
  subtitle,
  mono = false,
  style,
  className: _,
  ...props
}: HeadingProps) {
  const theme = useTheme();
  const sz = SIZES[level] ?? SIZES[1]!;

  return (
    <View style={[s.wrapper, style]} {...props}>
      {subtitle ? (
        <Animated.Text
          entering={FadeInLeft.duration(400)}
          style={[s.subtitle, { color: theme.mute }]}
        >
          {subtitle}
        </Animated.Text>
      ) : null}
      <Animated.Text
        entering={FadeIn.duration(500)}
        style={[
          s.heading,
          {
            fontSize: sz.fontSize,
            lineHeight: sz.lineHeight,
            fontWeight: sz.fontWeight as any,
            fontFamily: (level === 4 || mono) ? FontMono : FontSans,
            color: theme.title,
            letterSpacing: level === 4 ? Ls.sm_02 : undefined,
            textTransform: level === 4 ? 'uppercase' : undefined,
          },
        ]}
      >
        {children}
      </Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    flexDirection: 'column',
  },
  subtitle: {
    fontFamily: FontMono,
    fontSize: Fs.sm,
    fontWeight: Fw.value,
    textTransform: 'uppercase',
    letterSpacing: Ls.md_03,
    marginBottom: 4,
  },
  heading: {
    position: 'relative',
  },
});
