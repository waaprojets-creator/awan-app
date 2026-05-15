import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface AppState {
  isUnlocked: boolean;
  ready: boolean;
  theme: Theme;
  isOfflineForced: boolean;
  unlock: () => void;
  lock: () => void;
  setReady: () => void;
  toggleTheme: () => void;
  setTheme: (mode: Theme) => void;
  toggleOffline: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isUnlocked: false,
  ready: true,
  theme: 'light',
  isOfflineForced: false,
  unlock: () => set({ isUnlocked: true }),
  lock:   () => set({ isUnlocked: false }),
  setReady: () => set({ ready: true }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setTheme: (mode) => set({ theme: mode }),
  toggleOffline: () => set((s) => ({ isOfflineForced: !s.isOfflineForced })),
}));
