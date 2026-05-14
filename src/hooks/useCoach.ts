import { useCallback, useEffect, useRef, useState } from 'react';
import { Coach } from '@/modules/coach/api';
import { LocalStorageAdapter } from '@/modules/coach/localStorageAdapter';
import type { AssessmentLatest } from '@/data/schemas/coach/assessment';
import type { Domain } from '@/data/schemas/coach/rule';
import { eventBus } from '@/data/events/bus';

/**
 * Lazily-instantiated process-wide Coach singleton. The Coach itself wires the
 * EventBus, persists assessments to LocalStorage, and exposes a stable API to
 * React. Sharing one instance across the app avoids duplicate event handlers
 * and redundant rule re-loading.
 */
let _coach: Coach | null = null;
let _unsubscribe: (() => void) | null = null;

function getCoach(): Coach {
  if (_coach === null) {
    _coach = new Coach({ storage: new LocalStorageAdapter() });
    _unsubscribe = _coach.subscribe();
  }
  return _coach;
}

const ALL_DOMAINS: Domain[] = ['sport', 'nutrition', 'anthropo', 'sleep', 'cross'];

export interface UseCoachResult {
  assessments: AssessmentLatest[];
  loading: boolean;
  runAll: (date: string) => Promise<void>;
  getAssessment: (date: string, domain: Domain) => Promise<AssessmentLatest | null>;
}

/**
 * React binding for the Coach engine.
 *
 * - Instantiates the singleton on first mount and subscribes to the EventBus.
 * - Exposes `assessments` for the current day, refreshed whenever the engine
 *   emits `coach.assessment.ready`.
 * - Provides `runAll(date)` to force a full re-evaluation (used by the
 *   "ANALYSER" button).
 */
export function useCoach(date?: string): UseCoachResult {
  const coachRef = useRef<Coach>(getCoach());
  const [assessments, setAssessments] = useState<AssessmentLatest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const today = date ?? new Date().toISOString().slice(0, 10);

  const refresh = useCallback(async (d: string) => {
    const coach = coachRef.current;
    const out: AssessmentLatest[] = [];
    for (const dom of ALL_DOMAINS) {
      const a = await coach.getAssessment(d, dom);
      if (a !== null) out.push(a);
    }
    setAssessments(out);
  }, []);

  useEffect(() => {
    void refresh(today);
    const off = eventBus.on('coach.assessment.ready', ({ date: emitDate }) => {
      if (emitDate === today) void refresh(today);
    });
    return () => { off(); };
  }, [today, refresh]);

  const runAll = useCallback(async (d: string) => {
    setLoading(true);
    try {
      await coachRef.current.runAll(d);
      await refresh(d);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const getAssessment = useCallback(
    (d: string, domain: Domain) => coachRef.current.getAssessment(d, domain),
    [],
  );

  return { assessments, loading, runAll, getAssessment };
}

/** Test-only: tear down the singleton (e.g. between tests). */
export function _resetCoach(): void {
  if (_unsubscribe !== null) {
    _unsubscribe();
    _unsubscribe = null;
  }
  _coach?.unsubscribeAll();
  _coach = null;
}
