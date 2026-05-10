import { create } from 'zustand';
import { saveDB, loadDB, saveCfg, loadCfg, validateDB } from '../utils/storage';
import { clearEventCache } from '../utils/recurrence';
import { LocalDbService } from '../services/localDbService';

export interface AppState {
  db: any;
  cfg: any;
  ready: boolean;
  loading: boolean;
  isUnlocked: boolean;
  userKey: string | null;
  isGpsActive: boolean;
  currentRoute: string;
  transportMode: string;
  transportModeSelectedAt: number;
  jitFactor: number;
  initializeApp: () => Promise<void>;
  updateDb: (newDb: any) => Promise<void>;
  updateCfg: (newCfg: any) => Promise<void>;
  unlock: (key?: string | null) => void;
  lock: () => void;
  navigate: (route: string) => void;
  setTransportMode: (mode: string) => void;
  setJitFactor: (factor: number) => void;
  setOrsKey: (key: string) => void;
  toggleGps: () => void;
  purgeLogs: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  db: null,
  cfg: null,
  ready: false,
  loading: false,
  isUnlocked: false,
  userKey: null,
  isGpsActive: false,
  currentRoute: 'Dashboard',
  transportMode: 'car',
  transportModeSelectedAt: 0,
  jitFactor: 30,

  initializeApp: async () => {
    set({ loading: true });
    const [loadedDb, loadedCfg] = await Promise.all([loadDB(), loadCfg()]);
    LocalDbService.autoPurge();
    set({ db: loadedDb, cfg: loadedCfg, ready: true, loading: false });
  },

  updateDb: async (newDb) => {
    const validated = validateDB(newDb);
    await saveDB(validated, get().userKey);
    clearEventCache();
    set({ db: validated });
  },

  updateCfg: async (newCfg) => {
    await saveCfg(newCfg);
    set({ cfg: newCfg });
  },

  unlock: (key = null) => set({ isUnlocked: true, userKey: key }),
  
  lock: () => set({ isUnlocked: false, userKey: null }),
  
  navigate: (route) => set({ currentRoute: route }),

  setTransportMode: (mode) => set({ transportMode: mode, transportModeSelectedAt: Date.now() }),
  
  setJitFactor: (factor) => set({ jitFactor: factor }),
  
  setOrsKey: (key) => {
    const cfg = get().cfg;
    const newCfg = { ...cfg, orsApiKey: key };
    saveCfg(newCfg);
    set({ cfg: newCfg });
  },

  toggleGps: () => set((state) => ({ isGpsActive: !state.isGpsActive })),

  purgeLogs: () => {
    LocalDbService.purgeAll();
    set({ db: { ...get().db } });
  }
}));
