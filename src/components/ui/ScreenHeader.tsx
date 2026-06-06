import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontSans } from '../../constants/typography';
import { Fs, Fw, Ls } from '../../theme/tokens';

interface ScreenHeaderProps {
  tag?: string;
  title: string;
  style?: object;
  className?: string; // absorbed — ignored on native
  [x: string]: any;
}

export function ScreenHeader({ title, style }: ScreenHeaderProps) {
  const theme = useTheme();
  return (
    <View style={[s.row, style]}>
      <Text style={[s.title, { color: theme.title }]}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  title: {
    fontFamily: FontSans,
    fontSize: 14,
    fontWeight: Fw.label,
    letterSpacing: Ls.body_005,
  },
});
