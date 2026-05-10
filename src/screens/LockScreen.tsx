import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { useAppStore } from '@/data/store/appStore';
import { L } from '../constants/labels';

// motion(View) has overload mismatch with react-native-web types — use motion.div on web
const MotionView = motion.div as React.ComponentType<any>;

export default function LockScreen() {
  const unlock = useAppStore((s) => s.unlock);
  const theme = useTheme();
  const [isUnlocking, setIsUnlocking] = useState(false);

  const letters = ['A', 'W', 'A', 'N'];

  const handleUnlockSequence = () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    setTimeout(() => { unlock(); }, 1800);
  };

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <MotionView
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 } as never}
        transition={{ duration: 1.74, ease: 'easeOut' } as never}
        style={{ alignItems: 'center' }}
      >
        <TouchableOpacity activeOpacity={0.6} onPress={handleUnlockSequence} style={s.logoWrapper}>
          <MotionView
            animate={
              isUnlocking
                ? ({ scale: 1.1 } as never)
                : ({ scale: [1, 0.85, 1] } as never)
            }
            transition={
              isUnlocking
                ? undefined
                : ({ duration: 4.64, repeat: Infinity, ease: 'easeInOut' } as never)
            }
          >
            <HexagonLogo size={(ICON_SIZE as { hero: number }).hero} variant="rich" />
          </MotionView>
        </TouchableOpacity>

        <View style={s.textContainer}>
          <AnimatePresence mode="wait">
            {!isUnlocking ? (
              <motion.span
                key="arabic"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.64 } as never}
                style={s.titleArabic as never}
              >
                {(L as { header: { arabic: string } }).header.arabic}
              </motion.span>
            ) : (
              <motion.div
                key="latin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={s.latinContainer as never}
              >
                {letters.map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.16, type: 'spring', stiffness: 100, damping: 10 } as never}
                    style={s.titleLatinChar as never}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </View>
      </MotionView>
    </View>
  );
}

const makeStyles = (theme: { bg: string; title: string }) =>
  StyleSheet.create({
    container:      { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
    logoWrapper:    { padding: 20 },
    textContainer:  { height: 60, width: 200, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    titleArabic:    { fontSize: 32, letterSpacing: 2, color: theme.title, textAlign: 'center' },
    latinContainer: { flexDirection: 'row' },
    titleLatinChar: { fontSize: 24, letterSpacing: 4, color: theme.title, marginHorizontal: 2, fontWeight: 'bold' },
  });
