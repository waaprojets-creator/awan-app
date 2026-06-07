import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Touch } from './Touch';
import { useTheme } from '../../hooks/useTheme';
import { Clr } from '../../theme/tokens';

interface CardProps {
  title?: string;
  value?: string | number;
  subtitle?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  children?: React.ReactNode;
  highlight?: boolean;
  variant?: 'default' | 'outline' | 'flat';
  style?: object;
  [x: string]: any;
}

export function Card({
  title,
  value,
  subtitle,
  onPress,
  onLongPress,
  children,
  highlight = false,
  variant = 'default',
  style,
  // absorb web-only props to avoid RN warnings
  className: _className,
  innerClassName: _innerClassName,
  ...props
}: CardProps) {
  const theme = useTheme();

  const borderColor = highlight
    ? 'rgba(212,175,55,0.30)'
    : variant === 'outline'
    ? Clr.white10
    : theme.border;

  const bgColor = highlight
    ? 'rgba(212,175,55,0.04)'
    : variant === 'flat'
    ? 'rgba(0,0,0,0)'
    : theme.surface;

  const inner = (
    <View
      {...props}
      style={[
        s.card,
        { borderColor, backgroundColor: bgColor },
        variant === 'flat' && s.flat,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress !== undefined || onLongPress !== undefined) {
    return (
      <Touch
        {...(onPress !== undefined ? { onPress } : {})}
        {...(onLongPress !== undefined ? { onLongPress } : {})}
        style={s.touchWrapper}
      >
        {inner}
      </Touch>
    );
  }

  return inner;
}

const s = StyleSheet.create({
  card: {
    padding: 20,
    borderWidth: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  flat: {
    borderWidth: 0,
    elevation: 0,
  },
  touchWrapper: {
    width: '100%',
  },
});
