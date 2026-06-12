// ⚠️ HOOK MORT — défini ici mais jamais importé/utilisé (aucun consommateur dans src/).
// Vestige du refactor habit.history → habit.occurrence. Décision en attente (arbitrage utilisateur) :
// supprimer une fois le module Habit clôturé. Ne pas y rebrancher de logique avant arbitrage. — audit 2026-06-11
import { useState, useEffect, useCallback } from 'react';
import { HabitService } from '@/services/habitService';
import { HabitOccurrenceService } from '@/services/habitOccurrenceService';
import { isHabitScheduled, slugify } from '@/data/schemas/habits/habitDefinition';
import type { HabitDefinitionLatest } from '@/data/schemas/habits/habitDefinition';
import type { HabitOccurrenceLatest } from '@/data/schemas/habits/habitOccurrence';
import { useAppStore } from '@/data/store/appStore';
import { DbFullError } from '@/data/storage/IStorage';
import { dbFullBus } from '@/utils/dbFullBus';

function dispatchDbFull() { dbFullBus.emit(); }

export function useHabitStore(date: string) {
  const [definitions, setDefinitions] = useState<HabitDefinitionLatest[]>([]);
  const [occurrences, setOccurrences] = useState<HabitOccurrenceLatest[]>([]);
  const [loading, setLoading]         = useState(true);

  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    let active = true;
    Promise.all([
      HabitService.getDefinitions(),
      HabitOccurrenceService.getByDate(date),
    ]).then(([defs, occs]) => {
      if (!active) return;
      setDefinitions(defs);
      setOccurrences(occs);
      setLoading(false);
    });
    return () => { active = false; };
  }, [date, dataVersion]);

  const scheduled = definitions.filter(d => isHabitScheduled(d, date));

  const completionScore = scheduled.length === 0
    ? 1
    : occurrences.filter(o => scheduled.some(d => d.id === o.habitId)).length / scheduled.length;

  const toggle = useCallback(async (habitId: string): Promise<void> => {
    try {
      const def = definitions.find(d => d.id === habitId);
      const done = await HabitService.toggle(date, habitId, def?.name ?? habitId);
      if (done) {
        const occ = HabitOccurrenceService.build({ habitId, habitName: def?.name ?? habitId, date });
        setOccurrences(prev => [...prev, occ]);
      } else {
        setOccurrences(prev => prev.filter(o => o.habitId !== habitId));
      }
    } catch (err) {
      if (err instanceof DbFullError) { dispatchDbFull(); return; }
      throw err;
    }
  }, [date, definitions]);

  const isDone = useCallback(
    (habitId: string): boolean => occurrences.some(o => o.habitId === habitId),
    [occurrences],
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
    occurrences,
    loading,
    completionScore,
    toggle,
    isDone,
    saveDefinition,
    removeDefinition,
  };
}
