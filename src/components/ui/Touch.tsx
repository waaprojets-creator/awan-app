import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface TouchProps {
  children?: React.ReactNode;
  onPress?: (e?: any) => void;
  onLongPress?: () => void;
  className?: string;
  disabled?: boolean;
  scale?: number;
  opacity?: number;
  style?: any;
  [x: string]: any;
}

// Cast en any : Pressable RN ne type pas className (utilisé via react-native-web).
const AnimatedPressable = Animated.createAnimatedComponent(Pressable) as React.ComponentType<any>;

const SPRING = { stiffness: 500, damping: 30, mass: 0.5 };

export function Touch({
  children,
  onPress,
  onLongPress,
  className = '',
  disabled = false,
  scale = 0.98,
  opacity = 0.8,
  style = {},
  ...props
}: TouchProps) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scale) }],
    opacity: 1 - pressed.value * (1 - opacity),
  }));

  return (
    <AnimatedPressable
      {...props}
      className={className}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={() => { if (!disabled) pressed.value = withSpring(1, SPRING); }}
      onPressOut={() => { pressed.value = withSpring(0, SPRING); }}
      style={[{ position: 'relative' }, style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
