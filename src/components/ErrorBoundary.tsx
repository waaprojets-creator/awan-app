import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { logger } from '@/utils/logger';
import { perfMonitor } from '@/utils/perfMonitor';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error(error, { componentStack: info.componentStack ?? '' });
    perfMonitor.recordError(error.message);
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <View style={s.container}>
          <View style={s.box}>
            <Text style={s.label}>SYSTEM ERROR</Text>
            <Text style={s.message}>{this.state.error.message}</Text>
            <Text style={s.hint}>Relancer l'application</Text>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, backgroundColor: '#1A1A1A',
  },
  box: {
    backgroundColor: '#2A0A0A', borderWidth: 1, borderColor: '#8A0C0C',
    padding: 20, maxWidth: 360, width: '100%',
  },
  label: { color: '#FF4B4B', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  message: { color: '#F8F5F2', fontFamily: 'monospace', fontSize: 13 },
  hint: { color: 'rgba(248,245,242,0.4)', fontFamily: 'monospace', fontSize: 10, marginTop: 8 },
});
