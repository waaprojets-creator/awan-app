import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface AppState {
  isUnlocked: boolean;
  ready: boolean;
  theme: Theme;
  unlock: () => void;
  lock: () => void;
  setReady: () => void;
  toggleTheme: () => void;
  setTheme: (mode: Theme) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isUnlocked: true, // TODO: PIN lock à implémenter Sprint 1
  ready: true,
  theme: 'dark',
  unlock: () => set({ isUnlocked: true }),
  lock:   () => set({ isUnlocked: false }),
  setReady: () => set({ ready: true }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setTheme: (mode) => set({ theme: mode }),
}));
