import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider, useAppState } from './src/context/AppStateContext';
import { T } from './src/constants/theme';

import LockScreen  from './src/screens/LockScreen';
import MainLayout  from './src/components/MainLayout';

/**
 * Splash pendant le chargement initial du Context.
 */
function SplashLoader() {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={T.gold} />
    </View>
  );
}

/**
 * Routeur racine : Lock screen ou App principale (MainLayout) selon
 * l'état de déverrouillage. MainLayout gère lui-même la navigation
 * entre les écrans (header + body + bottom nav immuables).
 */
function Root() {
  const { isUnlocked, ready } = useAppState();

  if (!ready) return <SplashLoader />;
  if (!isUnlocked) return <LockScreen />;
  return <MainLayout />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Root />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
