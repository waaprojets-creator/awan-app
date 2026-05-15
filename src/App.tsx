import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '@/data/store/appStore';
import { useTheme, useThemeSync } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LockScreen from '@/screens/LockScreen';
import MainLayout from '@/components/MainLayout';
import { importFromJson } from '@/utils/importJson';

const SEED_FLAG = 'awan.seed.loaded';

async function autoLoadSeed() {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
    const res = await fetch('/data/seed-demo.json');
    if (!res.ok) return;
    const text = await res.text();
    const result = await importFromJson(text);
    if (result.success) {
      localStorage.setItem(SEED_FLAG, '1');
      window.location.reload(); // réinitialise tous les stores avec les données
    }
  } catch { /* silencieux */ }
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

  useEffect(() => { autoLoadSeed(); }, []);

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
