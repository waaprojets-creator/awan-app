import { Platform } from 'react-native';

const memCache: Record<string, string> = {};

export const safeStorage = {
  get: (key: string): string | null => {
    if (Platform.OS !== 'web') return memCache[key] ?? null;
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, value: string): void => {
    if (Platform.OS !== 'web') { memCache[key] = value; return; }
    try { localStorage.setItem(key, value); } catch { /* quota */ }
  },
  remove: (key: string): void => {
    if (Platform.OS !== 'web') { delete memCache[key]; return; }
    try { localStorage.removeItem(key); } catch { /* ok */ }
  },
};
