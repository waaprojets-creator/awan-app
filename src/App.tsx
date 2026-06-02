import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '@/data/store/appStore';
import { useTheme, useThemeSync } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LockScreen from '@/screens/LockScreen';
import MainLayout from '@/components/MainLayout';
import { importFromJson } from '@/utils/importJson';
import { safeStorage } from '@/utils/safeStorage';

const SEED_FLAG = 'awan.seed.loaded';

async function autoLoadSeed() {
  try {
    const res = await fetch('/data/seed-demo.json');
    if (!res.ok) return;
    const text = await res.text();
    let seedTs = '1';
    try { seedTs = (JSON.parse(text) as { generatedAt?: string }).generatedAt ?? '1'; } catch { /* ignore */ }
    if (safeStorage.get(SEED_FLAG) === seedTs) return;
    const result = await importFromJson(text);
    if (result.success) {
      safeStorage.set(SEED_FLAG, seedTs);
      useAppStore.getState().bumpDataVersion();
    } else {
      console.warn('[Seed] import failed:', result.message);
    }
  } catch (e) {
    console.warn('[Seed] fetch error:', e);
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
    <ErrorBoundary>
      <SafeAreaProvider>
        <Root />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
