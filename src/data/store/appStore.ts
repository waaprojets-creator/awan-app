import { create } from 'zustand';

type Theme = 'dark' | 'light' | 'black';

const THEME_KEY          = 'awan.theme';
const JIT_KEY            = 'awan.jit-factor';
const NETWORK_BANNER_KEY = 'awan.network-banner';

function savedTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'dark' || t === 'light' || t === 'black' ? t : 'light';
  } catch { return 'light'; }
}

function savedNetworkBanner(): boolean {
  try { return localStorage.getItem(NETWORK_BANNER_KEY) === 'true'; }
  catch { return false; }
}

function savedJitFactor(): number {
  try {
    const v = parseFloat(localStorage.getItem(JIT_KEY) ?? '1.2');
    return isNaN(v) ? 1.2 : v;
  } catch { return 1.2; }
}

interface AppState {
  isUnlocked: boolean;
  ready: boolean;
  theme: Theme;
  jitFactor: number;
  isOfflineForced: boolean;
  showNetworkBanner: boolean;
  dataVersion: number;
  unlock: () => void;
  lock: () => void;
  setReady: () => void;
  toggleTheme: () => void;
  setTheme: (mode: Theme) => void;
  setJitFactor: (v: number) => void;
  toggleOffline: () => void;
  toggleNetworkBanner: () => void;
  bumpDataVersion: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isUnlocked: false,
  ready: true,
  theme: savedTheme(),
  jitFactor: savedJitFactor(),
  isOfflineForced: false,
  showNetworkBanner: savedNetworkBanner(),
  dataVersion: 0,
  unlock: () => set({ isUnlocked: true }),
  lock:   () => set({ isUnlocked: false }),
  setReady: () => set({ ready: true }),
  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  toggleTheme: () => set((s) => {
    const cycle: Theme[] = ['light', 'dark', 'black'];
    const next: Theme = cycle[(cycle.indexOf(s.theme) + 1) % cycle.length] as Theme;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ok */ }
    return { theme: next };
  }),
  setTheme: (mode) => {
    try { localStorage.setItem(THEME_KEY, mode); } catch { /* ok */ }
    set({ theme: mode });
  },
  setJitFactor: (v) => {
    try { localStorage.setItem(JIT_KEY, String(v)); } catch { /* ok */ }
    set({ jitFactor: v });
  },
  toggleOffline: () => set((s) => ({ isOfflineForced: !s.isOfflineForced })),
  toggleNetworkBanner: () => set((s) => {
    const next = !s.showNetworkBanner;
    try { localStorage.setItem(NETWORK_BANNER_KEY, String(next)); } catch { /* ok */ }
    return { showNetworkBanner: next };
  }),
}));
