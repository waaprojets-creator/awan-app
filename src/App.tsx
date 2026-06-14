import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { LightSensor } from 'expo-sensors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '@/data/store/appStore';
import { useTheme, useThemeSync, useThemeMode } from '@/hooks/useTheme';
import { useDayBoundary } from '@/hooks/useDayBoundary';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LockScreen from '@/screens/LockScreen';
import MainLayout from '@/components/MainLayout';
import { importFromJson } from '@/utils/importJson';
import { getStorage } from '@/data/storage/storageService';
import { hydrateSafeStorage } from '@/utils/safeStorage';
import { PeriodizationService } from '@/services/periodizationService';
import { NutritionProfileService } from '@/services/nutritionProfileService';
import { perfMonitor } from '@/utils/perfMonitor';

// Seuils lux → thème : < 10 lux = noir complet, < 300 = intérieur, ≥ 300 = lumière vive
function luxToTheme(lux: number): 'black' | 'dark' | 'light' {
  if (lux < 10)  return 'black';
  if (lux < 300) return 'dark';
  return 'light';
}

// Flag stocké dans le même storage (SQLite/IndexedDB) que les données.
// Si la base est vidée (réinstall, clear data), le flag l'est aussi → re-seed automatique.
// (Avec safeStorage/localStorage le flag survivait au clear SQLite → 0 entrées pour toujours)
const SEED_FLAG_KEY = 'awan.seed.loaded';

async function autoLoadSeed() {
  try {
    // require statique : Metro bundle le JSON dans l'app — l'ancien fetch('/data/…')
    // dépendait du serveur HTTP de la WebView Capacitor, inexistant en Expo natif.
    const seed = require('../public/data/seed-demo.json') as { generatedAt?: string };
    const seedTs = seed.generatedAt ?? '1';

    const storage = await getStorage();
    const storedTs = await storage.get<string>(SEED_FLAG_KEY, (raw) => String(raw));
    if (storedTs === seedTs) return;

    const result = await importFromJson(seed);
    if (result.success) {
      await storage.set(SEED_FLAG_KEY, seedTs);
      useAppStore.getState().bumpDataVersion();
    } else {
      console.warn('[Seed] import failed:', result.message);
    }
  } catch (e) {
    console.warn('[Seed] load error:', e);
  }
}

function SplashLoader() {
  const theme = useTheme();
  return (
    <View style={[s.splash, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.title} />
    </View>
  );
}

function Root() {
  const { isUnlocked, ready } = useAppStore();
  const theme = useTheme();
  const themeMode = useThemeMode();
  useThemeSync();
  useDayBoundary();

  // fadeAnim démarre à 0 : MainLayout fade-in à chaque apparition (boot et unlock)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const showMain = ready && isUnlocked;
  const prevShowMain = useRef(false);
  const themeEffectMounted = useRef(false);

  // Fade-in quand MainLayout passe de invisible à visible (SplashLoader→Main, Lock→Main)
  // useLayoutEffect : synchrone avant le paint natif → pas de flash d'apparition
  useLayoutEffect(() => {
    if (!showMain) { prevShowMain.current = false; return; }
    if (prevShowMain.current) return;
    prevShowMain.current = true;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [showMain]);

  // Fondu 500ms au changement de thème
  // useLayoutEffect élimine le flash causé par useEffect (qui tirait APRÈS le paint natif)
  useLayoutEffect(() => {
    if (!themeEffectMounted.current) { themeEffectMounted.current = true; return; }
    if (!showMain) return;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [themeMode]);

  // Hydratation + LightSensor ambiant
  // Ordre critique : applyHydratedSettings() d'abord, puis le capteur écrase si disponible,
  // pour éviter que la restauration SQLite efface la lecture initiale du capteur.
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let firstLux: number | null = null;
    let hydrated = false;

    const applyLux = (lux: number, immediate: boolean) => {
      const target = luxToTheme(lux);
      if (target === useAppStore.getState().theme) return;
      if (immediate) {
        useAppStore.getState().setTheme(target);
      } else {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => useAppStore.getState().setTheme(target), 3000);
      }
    };

    LightSensor.isAvailableAsync().then((available) => {
      if (!available) return;
      LightSensor.setUpdateInterval(5000);
      sub = LightSensor.addListener(({ illuminance }) => {
        const isFirst = firstLux === null;
        if (isFirst) firstLux = illuminance;
        // Pendant le splash : stocker sans appliquer (hydratation pas encore terminée)
        if (hydrated) applyLux(illuminance, isFirst);
      });
    });

    // Hydrate le stockage durable (memCache + caches sync des silos ← IStorage) puis applique
    // les prefs et débloque le rendu. allSettled : un échec d'hydratation n'empêche pas le boot.
    perfMonitor.markHydrationStart();
    Promise.allSettled([
      hydrateSafeStorage(),
      PeriodizationService.hydrate(),
      NutritionProfileService.hydrate(),
    ]).finally(() => {
      perfMonitor.markHydrationEnd();
      perfMonitor.markBootComplete();
      perfMonitor.startFpsCapture();
      useAppStore.getState().applyHydratedSettings();
      hydrated = true;
      // Appliquer la première lecture capteur si déjà disponible (couvre le cas cold start rapide)
      if (firstLux !== null) applyLux(firstLux, true);
    });

    return () => {
      sub?.remove();
      if (debounceTimer) clearTimeout(debounceTimer);
      perfMonitor.stopFpsCapture();
    };
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;
    autoLoadSeed();
  }, [isUnlocked]);

  // View persistant theme.bg : évite le fond blanc/transparent qui flashait
  // quand Animated.View était à opacity 0 pendant les transitions
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {!ready ? (
        <SplashLoader />
      ) : !isUnlocked ? (
        <LockScreen />
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <MainLayout />
        </Animated.View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <Root />
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
