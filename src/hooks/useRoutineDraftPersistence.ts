import { useEffect } from 'react';
import { safeStorage } from '../utils/safeStorage';
import { ROUTINE_DRAFT_KEY } from '../screens/sport/shared';
import type { RoutineDraft } from '../screens/sport/types';

export function useRoutineDraftPersistence(
  draft: RoutineDraft,
  opts?: { enabled?: boolean },
): void {
  useEffect(() => {
    if (opts?.enabled === false) return;
    const handle = setTimeout(() => {
      try { safeStorage.set(ROUTINE_DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() })); } catch { /* quota */ }
    }, 1000);
    return () => clearTimeout(handle);
  }, [draft, opts?.enabled]);
}
