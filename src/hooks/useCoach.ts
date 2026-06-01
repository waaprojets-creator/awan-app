import { useCallback, useEffect, useRef, useState } from 'react';
import { Coach } from '@/modules/coach/api';
import { getUserStorage } from '@/data/storage/storageService';
import type { AssessmentLatest } from '@/data/schemas/coach/assessment';
import type { Domain } from '@/data/schemas/coach/rule';
import { eventBus } from '@/data/events/bus';

/**
 * Process-wide Coach singleton, lazily initialised with the real user storage
 * (IndexedDB on web, SQLite on native). Using LocalStorageAdapter was the root
 * cause of "no advice ever shown" — signal data lives in IndexedDB, not LS.
 */
let _coachPromise: Promise<Coach> | null = null;
let _unsubscribe: (() => void) | null = null;

async function initCoach(): Promise<Coach> {
  const storage = await getUserStorage();
  const coach = new Coach({ storage });
  _unsubscribe = coach.subscribe();
  return coach;
}

function getCoachPromise(): Promise<Coach> {
  if (_coachPromise === null) {
    _coachPromise = initCoach().catch((err) => {
      _coachPromise = null; // allow retry on next call
      throw err;
    });
  }
  return _coachPromise;
}

const ALL_DOMAINS: Domain[] = ['sport', 'nutrition', 'anthropo', 'sleep', 'cross'];

export interface UseCoachResult {
  assessments: AssessmentLatest[];
  loading: boolean;
  runAll: (date: string) => Promise<void>;
  getAssessment: (date: string, domain: Domain) => Promise<AssessmentLatest | null>;
}

export function useCoach(date?: string): UseCoachResult {
  const coachRef = useRef<Coach | null>(null);
  const [, forceUpdate] = useState(0);
  const [assessments, setAssessments] = useState<AssessmentLatest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const today = date ?? new Date().toISOString().slice(0, 10);

  // Initialise coach asynchronously on first mount
  useEffect(() => {
    let cancelled = false;
    getCoachPromise()
      .then((c) => {
        if (cancelled) return;
        coachRef.current = c;
        forceUpdate((n) => n + 1);
      })
      .catch((err) => console.error('[useCoach] init failed:', err));
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async (d: string) => {
    const coach = coachRef.current;
    if (!coach) return;
    const out: AssessmentLatest[] = [];
    for (const dom of ALL_DOMAINS) {
      const a = await coach.getAssessment(d, dom);
      if (a !== null) out.push(a);
    }
    setAssessments(out);
  }, []);

  useEffect(() => {
    if (!coachRef.current) return;
    void refresh(today);
    const off = eventBus.on('coach.assessment.ready', ({ date: emitDate }) => {
      if (emitDate === today) void refresh(today);
    });
    return () => { off(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, refresh, coachRef.current]);

  const runAll = useCallback(async (d: string) => {
    const coach = coachRef.current;
    if (!coach) return;
    setLoading(true);
    try {
      await coach.runAll(d);
      await refresh(d);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const getAssessment = useCallback(
    (d: string, domain: Domain) =>
      coachRef.current ? coachRef.current.getAssessment(d, domain) : Promise.resolve(null),
    [],
  );

  return { assessments, loading, runAll, getAssessment };
}

/** Test-only: tear down the singleton between tests. */
export function _resetCoach(): void {
  if (_unsubscribe !== null) {
    _unsubscribe();
    _unsubscribe = null;
  }
  if (_coachPromise) {
    _coachPromise.then((c) => c.unsubscribeAll()).catch(() => {});
    _coachPromise = null;
  }
}
