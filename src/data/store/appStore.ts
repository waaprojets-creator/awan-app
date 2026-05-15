import { create } from 'zustand';

type Theme = 'dark' | 'light';

const THEME_KEY = 'awan.theme';

function savedTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'dark' || t === 'light' ? t : 'light';
  } catch { return 'light'; }
}

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
  theme: savedTheme(),
  isOfflineForced: false,
  unlock: () => set({ isUnlocked: true }),
  lock:   () => set({ isUnlocked: false }),
  setReady: () => set({ ready: true }),
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ok */ }
    return { theme: next };
  }),
  setTheme: (mode) => {
    try { localStorage.setItem(THEME_KEY, mode); } catch { /* ok */ }
    set({ theme: mode });
  },
  toggleOffline: () => set((s) => ({ isOfflineForced: !s.isOfflineForced })),
}));
