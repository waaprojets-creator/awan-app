import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Touch } from './ui/Touch';

/**
 * Wrapper de transition de page (fade léger à l'entrée).
 */
export const PageWrapper = ({ children, style, ...props }: any) => (
  <Animated.View
    entering={FadeIn.duration(300)}
    exiting={FadeOut.duration(200)}
    style={{ flex: 1, width: '100%', maxWidth: '100%', ...StyleSheet.flatten(style || {}) }}
    {...props}
  >
    {children}
  </Animated.View>
);

export const StaggerList = ({ children, style, ...props }: any) => (
  <View style={StyleSheet.flatten(style || {})} {...props}>
    {children}
  </View>
);

export const StaggerItem = ({ children, style, ...props }: any) => (
  <Animated.View
    entering={FadeInDown.duration(300)}
    style={StyleSheet.flatten(style || {})}
    {...props}
  >
    {children}
  </Animated.View>
);

/**
 * Bouton animé avec retour tactile unifié — délègue à Touch (reanimated).
 */
export const AnimatedPressable = ({ children, style, onPress, onClick, ...props }: any) => (
  <Touch
    onPress={onPress || onClick}
    style={{ flexDirection: 'column', ...StyleSheet.flatten(style || {}) }}
    {...props}
  >
    {children}
  </Touch>
);

/**
 * AnimatePresence : passthrough — reanimated anime les sorties au démontage
 * via la prop `exiting` des composants Animated.
 */
export const AnimatePresence = ({ children }: { children?: React.ReactNode; mode?: string }) => (
  <>{children}</>
);
