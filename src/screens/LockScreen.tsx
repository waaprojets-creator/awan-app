import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { motion, AnimatePresence } from 'motion/react';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { useAppStore } from '@/data/store/appStore';
import { L } from '../constants/labels';

const MotionDiv = motion.div as React.ComponentType<any>;

export default function LockScreen() {
  const unlock = useAppStore((s) => s.unlock);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const letters = ['A', 'W', 'A', 'N'];

  const handleUnlockSequence = () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    setTimeout(() => { unlock(); }, 1800);
  };

  return (
    <div
      style={{ backgroundColor: 'var(--color-awan-bg)' }}
      className="flex-1 flex items-center justify-center min-h-screen"
    >
      <MotionDiv
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.74, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <TouchableOpacity activeOpacity={0.6} onPress={handleUnlockSequence} style={{ padding: 20 }}>
          <MotionDiv
            animate={isUnlocking ? { scale: 1.1 } : { scale: [1, 0.85, 1] }}
            transition={
              isUnlocking
                ? undefined
                : { duration: 4.64, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <HexagonLogo size={(ICON_SIZE as { hero: number }).hero} variant="rich" />
          </MotionDiv>
        </TouchableOpacity>

        <div className="h-16 w-48 flex items-center justify-center mt-2">
          <AnimatePresence mode="wait">
            {!isUnlocking ? (
              <motion.span
                key="arabic"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.64 }}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '32px',
                  fontWeight: 300,
                  letterSpacing: '0.08em',
                  color: 'var(--color-awan-tx)',
                }}
              >
                {(L as { header: { arabic: string } }).header.arabic}
              </motion.span>
            ) : (
              <motion.div
                key="latin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-row"
              >
                {letters.map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.16, type: 'spring', stiffness: 100, damping: 10 }}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '24px',
                      fontWeight: 900,
                      letterSpacing: '0.25em',
                      color: 'var(--color-awan-tx)',
                      marginInline: '2px',
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            fontWeight: 400,
            letterSpacing: '0.4em',
            color: 'var(--color-awan-tx-mute)',
            marginTop: '24px',
          }}
        >
          APPUYER POUR DÉVERROUILLER
        </motion.span>
      </MotionDiv>
    </div>
  );
}
