import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Vibration, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon, Circle, Line } from 'react-native-svg';
import { T } from '../constants/theme';
import { hashPin, loadCfg } from '../utils/storage';

const LOCK_DELAYS = [30000, 120000, 300000, 3600000];

export default function LockScreen({ onUnlock }) {
  const insets = useSafeAreaInsets();
  const [cfg, setCfg] = useState(null);
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef(null);

  const arOpacity = useRef(new Animated.Value(1)).current;
  const latOpacity = useRef(new Animated.Value(0)).current;
  const latTransY = useRef(new Animated.Value(9)).current;
  const hexPulse = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    loadCfg().then(c => {
      setCfg(c);
      if (c.dev) setTimeout(onUnlock, 2200);
    });
    Animated.loop(
      Animated.sequence([
        Animated.timing(hexPulse, { toValue: 0.6, duration: 1250, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(hexPulse, { toValue: 0.25, duration: 1250, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
    Animated.parallel([
      Animated.timing(arOpacity, { toValue: 0, duration: 550, delay: 1100, useNativeDriver: true }),
      Animated.timing(latOpacity, { toValue: 1, duration: 550, delay: 1550, useNativeDriver: true }),
      Animated.timing(latTransY, { toValue: 0, duration: 550, delay: 1550, useNativeDriver: true }),
    ]).start();
  }, []);

  async function tryUnlock() {
    if (!cfg) return;
    if (!cfg.pinOn) { onUnlock(); return; }
    const now = Date.now();
    if (lockedUntil > now) {
      const s = Math.ceil((lockedUntil - now) / 1000);
      setErrorMsg(`Réessayez dans ${s < 60 ? s + 's' : Math.ceil(s / 60) + 'min'}`);
      return;
    }
    const h = await hashPin(pin);
    if (h === cfg.pinHash) {
      setAttempts(0); setErrorMsg(''); onUnlock();
    } else {
      const na = attempts + 1;
      setAttempts(na);
      Vibration.vibrate([0, 50, 50, 50]);
      if (na > 3) {
        const step = Math.min(na - 4, LOCK_DELAYS.length - 1);
        const until = Date.now() + LOCK_DELAYS[step];
        setLockedUntil(until);
        const s = LOCK_DELAYS[step] / 1000;
        setErrorMsg(`Incorrect — ${s < 60 ? s + 's' : s < 3600 ? (s / 60) + 'min' : '1h'}`);
      } else {
        setErrorMsg('Code incorrect');
      }
      setPin('');
    }
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 18 }]}>
      <Svg width={66} height={66} viewBox="0 0 66 66">
        {/* Couleur Or appliquée via T.gold */}
        <Polygon points="33,3 59,18 59,48 33,63 7,48 7,18" stroke={T.gold} strokeWidth="1.2" fill="none"/>
        <Animated.View style={{ opacity: hexPulse }}>
          <Polygon points="33,11 51,22 51,44 33,55 15,44 15,22" stroke={T.gold} strokeWidth=".5" fill="none" opacity=".4"/>
        </Animated.View>
        {[
          ["33,3","33,11"],["59,18","51,22"],["59,48","51,44"],
          ["33,63","33,55"],["7,48","15,44"],["7,18","15,22"],
        ].map(([p1,p2],i) => {
          const [x1,y1]=p1.split(','); const [x2,y2]=p2.split(',');
          return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={T.gold} strokeWidth=".5" opacity=".28"/>;
        })}
        <Circle cx="33" cy="33" r="3.5" fill={T.gold}/>
        <Circle cx="33" cy="33" r="7.5" stroke={T.gold} strokeWidth=".5" fill="none" opacity=".22"/>
      </Svg>
      <View style={s.morphBox}>
        <Animated.Text style={[s.arText, { opacity: arOpacity }]}>أوان</Animated.Text>
        <Animated.Text style={[s.latText, { opacity: latOpacity, transform: [{ translateY: latTransY }] }]}>AWAN</Animated.Text>
      </View>
      <Text style={s.tag}>planning personnel</Text>
      <View style={s.dotsRow}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[s.dot, i < pin.length && s.dotOn]} />
        ))}
      </View>
      {showInput ? (
        <TextInput
          ref={inputRef}
          style={s.hiddenInput}
          value={pin}
          onChangeText={v => { setPin(v.slice(0, 20)); setErrorMsg(''); }}
          onSubmitEditing={tryUnlock}
          secureTextEntry
          autoFocus
          maxLength={20}
        />
      ) : null}
      <TouchableOpacity
        style={s.tapZone}
        onPress={() => { setShowInput(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        activeOpacity={0.7}
      >
        <Text style={s.tapText}>
          {cfg?.dev ? 'Mode développeur — ouverture auto' : 'Appuyez pour saisir'}
        </Text>
      </TouchableOpacity>
      {pin.length >= 6 && (
        <TouchableOpacity style={s.submitBtn} onPress={tryUnlock} activeOpacity={0.85}>
          <Text style={s.submitTxt}>Valider</Text>
        </TouchableOpacity>
      )}
      {errorMsg ? <Text style={s.errTxt}>{errorMsg}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  morphBox: { height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 5 },
  arText: { position: 'absolute', fontSize: 28, letterSpacing: 6, color: T.gold, fontWeight: '300' },
  latText: { position: 'absolute', fontSize: 20, letterSpacing: 8, color: T.gold, fontWeight: '300' },
  tag: { fontSize: 8, color: T.tx3, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 36 },
  dotsRow: { flexDirection: 'row', gap: 12, marginBottom: 8, height: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: T.tx3, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: T.gold, borderColor: T.gold, transform: [{ scale: 1.1 }] },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  tapZone: { borderWidth: 1, borderColor: T.bo, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 40, marginBottom: 6 },
  tapText: { fontSize: 10, color: T.tx3, letterSpacing: 2 },
  submitBtn: { backgroundColor: T.gold, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 60, marginTop: 10 },
  submitTxt: { color: T.bg, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  errTxt: { fontSize: 11, color: T.rd, marginTop: 8, height: 16 },
});
