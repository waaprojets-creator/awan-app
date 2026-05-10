import React, { useEffect, ReactNode } from 'react';
import { checkAndNotify } from '../utils/notifications';
import { useAppStore, AppState } from '../store/appStore';

interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const initializeApp = useAppStore(state => state.initializeApp);
  const db = useAppStore(state => state.db);
  const ready = useAppStore(state => state.ready);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    if (db && ready) {
      checkAndNotify(db);
      const timer = setInterval(() => checkAndNotify(db), 60000);
      return () => clearInterval(timer);
    }
  }, [db, ready]);

  return <>{children}</>;
}

export function useAppState(): AppState {
  return useAppStore();
}

