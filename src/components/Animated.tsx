import React from 'react';
import { View, StyleSheet } from 'react-native';
import { motion, AnimatePresence } from 'motion/react';
import { ANIM_VARIANTS } from '../constants/animations';

const MotionView = motion(View);

/**
 * Wrapper pour les transitions de pages
 */
export const PageWrapper = ({ children, style, ...props }: any) => (
  <MotionView
    variants={ANIM_VARIANTS.page}
    initial="initial"
    animate="animate"
    exit="exit"
    style={{ flex: 1, ...StyleSheet.flatten(style || {}) }}
    {...props}
  >
    {children}
  </MotionView>
);

export const StaggerList = ({ children, style, ...props }: any) => (
  <MotionView
    variants={ANIM_VARIANTS.staggerContainer}
    initial="initial"
    animate="animate"
    style={StyleSheet.flatten(style || {})}
    {...props}
  >
    {children}
  </MotionView>
);

export const StaggerItem = ({ children, style, ...props }: any) => (
  <MotionView
    variants={ANIM_VARIANTS.staggerItem}
    style={StyleSheet.flatten(style || {})}
    {...props}
  >
    {children}
  </MotionView>
);

/**
 * Bouton animé avec retour tactile unifié
 */
export const AnimatedPressable = ({ children, style, onPress, onClick, ...props }: any) => (
  <motion.div
    whileTap={ANIM_VARIANTS.tap.whileTap}
    transition={ANIM_VARIANTS.tap.transition}
    style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      cursor: 'pointer', 
      ...StyleSheet.flatten(style || {}) 
    }}
    onClick={onPress || onClick}
    {...props}
  >
    {children}
  </motion.div>
);

export { AnimatePresence };
