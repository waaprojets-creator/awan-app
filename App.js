import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/context/AppStateContext';
import MainLayout from './src/components/MainLayout';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <MainLayout />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
