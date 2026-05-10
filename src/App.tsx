import React, { Component } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { DailyProvider } from './context/DailyContext';
import { useTheme } from './hooks/useTheme';
import LockScreen from './screens/LockScreen';
import MainLayout from './components/MainLayout';

class GlobalErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { error: null };
  }
  static getDerivedStateFromError(error: any) { return { error }; }
  render() {
    const { error } = (this as any).state;
    if (error) {
      return (
        <View style={s.errorScreen}>
          <Text style={s.errorTitle}>Application Error</Text>
          <Text style={s.errorText}>{(error as any)?.message || String(error)}</Text>
        </View>
      );
    }
    return (this as any).props.children;
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
  const { isUnlocked, ready } = useAppState();
  if (!ready) return <SplashLoader />;
  if (!isUnlocked) return <LockScreen />;
  return <MainLayout />;
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <SafeAreaProvider>
        <AppStateProvider>
          <DailyProvider>
            <Root />
          </DailyProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorScreen: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorTitle: { color: '#EF4444', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  errorText: { color: '#AAA', fontSize: 14, textAlign: 'center' },
});
