import { useState, useEffect, useCallback } from 'react';
import { HabitService } from '@/services/habitService';
import { isHabitScheduled, slugify } from '@/data/schemas/habits/habitDefinition';
import { habitCompletionScore } from '@/data/schemas/habits/habitHistory';
import type { HabitDefinitionLatest } from '@/data/schemas/habits/habitDefinition';
import type { HabitHistoryLatest } from '@/data/schemas/habits/habitHistory';
import { useAppStore } from '@/data/store/appStore';
import { DbFullError } from '@/data/storage/IStorage';
import { dbFullBus } from '@/utils/dbFullBus';

function dispatchDbFull() { dbFullBus.emit(); }

export function useHabitStore(date: string) {
  const [definitions, setDefinitions] = useState<HabitDefinitionLatest[]>([]);
  const [history, setHistory]         = useState<HabitHistoryLatest | null>(null);
  const [loading, setLoading]         = useState(true);

  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    Promise.all([
      HabitService.getDefinitions(),
      HabitService.getHistory(date),
    ]).then(([defs, hist]) => {
      if (!active) return;
      setDefinitions(defs);
      setHistory(hist);
      setLoading(false);
    });
    return () => { active = false; };
  }, [date, dataVersion]);

  const scheduled = definitions.filter(d => isHabitScheduled(d, date));

  const completionScore = history
    ? habitCompletionScore(history, scheduled.map(d => d.id))
    : 0;

  const toggle = useCallback(async (habitId: string): Promise<void> => {
    try {
      const updated = await HabitService.toggle(date, habitId);
      setHistory(updated);
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, [date]);

  const isDone = useCallback(
    (habitId: string): boolean => history?.validations[habitId] === true,
    [history],
  );

  const saveDefinition = useCallback(async (
    def: Omit<HabitDefinitionLatest, 'v' | 'id' | 'order' | 'savedAt'> & { id?: string },
  ): Promise<void> => {
    try {
      const id = def.id ?? slugify(def.name);
      const existingOrder = definitions.find(d => d.id === id)?.order;
      const full: HabitDefinitionLatest = {
        ...def,
        v: 1 as const,
        id,
        order:   existingOrder ?? definitions.length,
        isActive: def.isActive ?? true,
        savedAt: Date.now(),
      };
      await HabitService.saveDefinition(full);
      setDefinitions(prev => {
        const idx = prev.findIndex(d => d.id === full.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = full; return next.sort((a, b) => a.order - b.order); }
        return [...prev, full].sort((a, b) => a.order - b.order);
      });
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, [definitions]);

  const removeDefinition = useCallback(async (id: string): Promise<void> => {
    await HabitService.deleteDefinition(id);
    setDefinitions(prev => prev.filter(d => d.id !== id));
  }, []);

  return {
    definitions,
    scheduled,
    history,
    loading,
    completionScore,
    toggle,
    isDone,
    saveDefinition,
    removeDefinition,
  };
}
