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
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="awan-card p-5 max-w-sm w-full">
            <div className="awan-label text-awan-status-error mb-2">SYSTEM ERROR</div>
            <div className="awan-value text-sm">{this.state.error.message}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
