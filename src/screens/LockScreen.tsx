import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { motion, AnimatePresence } from 'motion/react';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { useAppStore } from '@/data/store/appStore';
import { initStorageEncryption } from '@/data/storage/storageService';
import { L } from '../constants/labels';

const MotionDiv = motion.div as React.ComponentType<any>;

const TEXT_STYLE = {
  fontFamily: 'var(--font-sans)',
  fontSize: '28px',
  fontWeight: 900,
  letterSpacing: '0.25em',
  color: 'var(--color-awan-tx)',
} as const;

export default function LockScreen() {
  const unlock = useAppStore((s) => s.unlock);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const letters = ['A', 'W', 'A', 'N'];

  const handleUnlockSequence = () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    setTimeout(async () => {
      await initStorageEncryption();
      unlock();
    }, 1800);
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

        <div className="h-16 w-56 flex items-center justify-center mt-2">
          <AnimatePresence mode="wait">
            {!isUnlocking ? (
              <motion.span
                key="arabic"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.64 }}
                style={TEXT_STYLE}
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
                    style={{ ...TEXT_STYLE, marginInline: '2px' }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionDiv>
    </div>
  );
}
