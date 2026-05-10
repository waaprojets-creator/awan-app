// @ts-nocheck — shim legacy → Zustand. Supprimé lors de la réécriture des écrans.
import React, { createContext, useContext } from 'react';
import { useAppStore } from '@/data/store/appStore';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  return <AppStateContext.Provider value={null}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const store = useAppStore();
  return {
    isUnlocked: store.isUnlocked,
    ready: store.ready,
    unlock: store.unlock,
    lock: store.lock,
    db: {},
    cfg: { theme: store.theme },
    transportMode: 'car',
    setTransportMode: () => {},
    transportModeSelectedAt: 0,
    jitFactor: 1,
  };
}
