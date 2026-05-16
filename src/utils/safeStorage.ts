// Wrapper localStorage sécurisé — résistant au mode privé et aux quotas
export const safeStorage = {
  get: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* quota dépassé */ }
  },
  remove: (key: string): void => {
    try { localStorage.removeItem(key); } catch { /* ok */ }
  },
};
