// @ts-nocheck — shim legacy → Zustand. Supprimé lors de la réécriture des écrans.
import React, { createContext } from 'react';
import { useAppStore } from '@/data/store/appStore';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  return <AppStateContext.Provider value={null}>{children}</AppStateContext.Provider>;
}

// Return type is intentionally `any` so legacy screens can access db.xxx without TS errors
export function useAppState(): any {
  const store = useAppStore();
  return {
    isUnlocked: store.isUnlocked,
    ready: store.ready,
    unlock: store.unlock,
    lock: store.lock,
    db: {} as Record<string, any>,
    updateDb: () => {},
    cfg: { theme: store.theme, defaultTransport: 'car' },
    transportMode: 'car',
    setTransportMode: () => {},
    transportModeSelectedAt: 0,
    jitFactor: 1,
    navigate: () => {},
  };
}
