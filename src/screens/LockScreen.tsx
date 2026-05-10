import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { HexagonLogo, ICON_SIZE } from '../constants/icons';
import { useAppState } from '../context/AppStateContext';
import { L } from '../constants/labels';

const MotionView = motion(View);
const MotionText = motion(Text);

export default function LockScreen() {
  const { unlock } = useAppState() as any;
  const theme = useTheme();
  const [isUnlocking, setIsUnlocking] = useState(false);

  const letters = ['A', 'W', 'A', 'N'];

  const containerVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 1.74, ease: "easeOut" }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 0.85, 1],
      transition: {
        duration: 4.64,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const arabicVariants = {
    initial: { opacity: 1, y: 0, rotateY: 0 },
    exit: { 
      opacity: 0, 
      y: -30, 
      rotateY: 180,
      transition: { duration: 0.64, ease: "easeIn" }
    }
  };

  const letterContainerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.16
      }
    }
  };

  const letterVariants = {
    initial: { 
      opacity: 0, 
      y: 30, 
      rotateY: 180 
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const handleUnlockSequence = () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    
    // Framer motion handles visual transition via AnimatePresence & variants
    setTimeout(() => {
      unlock();
    }, 1800); 
  };

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <MotionView 
        initial="initial"
        animate="animate"
        variants={containerVariants}
        style={{ alignItems: 'center' }}
      >
        <TouchableOpacity activeOpacity={0.6} onPress={handleUnlockSequence} style={s.logoWrapper}>
          <MotionView 
            animate={!isUnlocking ? "animate" : { scale: 1.1 }}
            variants={pulseVariants}
          >
            <HexagonLogo size={ICON_SIZE.hero} variant="rich" />
          </MotionView>
        </TouchableOpacity>

        <View style={s.textContainer}>
          <AnimatePresence mode="wait">
            {!isUnlocking ? (
              <MotionText 
                key="arabic"
                variants={arabicVariants}
                initial="initial"
                animate="initial"
                exit="exit"
                style={s.titleArabic}
              >
                {L.header.arabic}
              </MotionText>
            ) : (
              <MotionView
                key="latin"
                variants={letterContainerVariants}
                initial="initial"
                animate="animate"
                style={s.latinContainer}
              >
                {letters.map((char, i) => (
                  <MotionText 
                    key={i} 
                    variants={letterVariants}
                    style={s.titleLatinChar}
                  >
                    {char}
                  </MotionText>
                ))}
              </MotionView>
            )}
          </AnimatePresence>
        </View>
      </MotionView>
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container:      { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  logoWrapper:    { padding: 20 },
  textContainer:  { height: 60, width: 200, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  titleArabic:    { fontSize: 32, letterSpacing: 2, color: theme.title, position: 'absolute', textAlign: 'center' },
  latinContainer: { flexDirection: 'row', position: 'absolute' },
  titleLatinChar: { fontSize: 24, letterSpacing: 4, color: theme.title, marginHorizontal: 2, fontWeight: 'bold' },
});

