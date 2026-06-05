import React, { Component } from 'react';
import { logger } from '@/utils/logger';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error(error, { componentStack: info.componentStack ?? '' });
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#1A1A1A', minHeight: '100vh' }}>
          <div style={{ backgroundColor: '#2A0A0A', border: '1px solid #8A0C0C', padding: 20, maxWidth: 360, width: '100%' }}>
            <div style={{ color: '#FF4B4B', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', marginBottom: 8 }}>SYSTEM ERROR</div>
            <div style={{ color: '#F8F5F2', fontFamily: 'monospace', fontSize: 13 }}>{this.state.error.message}</div>
            <div style={{ color: 'rgba(248,245,242,0.4)', fontFamily: 'monospace', fontSize: 10, marginTop: 8 }}>Relancer l'application</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
