import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '@/data/store/appStore';
import { useTheme, useThemeSync } from '@/hooks/useTheme';
import { useDayBoundary } from '@/hooks/useDayBoundary';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LockScreen from '@/screens/LockScreen';
import MainLayout from '@/components/MainLayout';
import { importFromJson } from '@/utils/importJson';
import { getStorage } from '@/data/storage/storageService';

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
  useThemeSync();
  useDayBoundary();

  useEffect(() => {
    if (!isUnlocked) return;
    autoLoadSeed();
  }, [isUnlocked]);

  if (!ready) return <SplashLoader />;
  if (!isUnlocked) return <LockScreen />;
  return <MainLayout />;
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
