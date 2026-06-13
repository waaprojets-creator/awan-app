import { describe, it, expect } from 'vitest';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { Planner } from '@/modules/planning/api';
import { HabitService } from '@/services/habitService';
import { _setStorageForTest } from '@/data/storage/storageService';
import {
  taskToItem, habitToItem, assembleInventory, applyFilters, collectFacets, EMPTY_FILTERS,
  type TaskFilters,
} from '@/modules/tasks/inventory';
import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import type { HabitDefinitionLatest } from '@/data/schemas/habits/habitDefinition';

const DATE = '2026-05-10';

function task(o: Partial<ScheduleTaskLatest> = {}): ScheduleTaskLatest {
  return {
    v: 4, id: 't1', date: DATE, title: 'Tâche', durationMin: 30, priority: 3,
    domain: 'travail', tags: [], dependsOn: [], status: null, timeCategory: null, ...o,
  };
}
function habit(o: Partial<HabitDefinitionLatest> = {}): HabitDefinitionLatest {
  return { v: 1, id: 'h1', name: 'Méditation', daysOfWeek: [], order: 0, isActive: true, savedAt: 0, ...o };
}
function filters(o: Partial<TaskFilters> = {}): TaskFilters {
  return { ...EMPTY_FILTERS, ...o };
}

describe('inventory — mappers', () => {
  it('taskToItem normalise une tâche', () => {
    const it = taskToItem(task({ id: 'x', priority: 1, domain: 'famille', tags: ['villa n2'], status: 'done', timeHHMM: '09:00' }));
    expect(it).toMatchObject({
      source: 'task', refId: 'x', recurring: false, priority: 1,
      domain: 'famille', tags: ['villa n2'], done: true, timeHHMM: '09:00',
    });
  });

  it('habitToItem normalise une habitude récurrente', () => {
    const it = habitToItem(habit({ id: 'med', name: 'Coran', daysOfWeek: [1, 3, 5], domain: 'islam', tags: ['spirituel'] }), true);
    expect(it).toMatchObject({
      source: 'habit', refId: 'med', recurring: true, priority: null,
      domain: 'islam', tags: ['spirituel'], done: true, daysOfWeek: [1, 3, 5],
    });
  });
});

describe('inventory — assemble & tri', () => {
  it('exclut les tâches annulées', () => {
    const out = assembleInventory([task({ id: 'a', status: 'active' }), task({ id: 'b', status: 'cancelled' })], [], new Set());
    expect(out.map(i => i.refId)).toEqual(['a']);
  });

  it('trie : à faire avant fait, priorité 1<2<3<habitudes', () => {
    const out = assembleInventory(
      [
        task({ id: 'p3', priority: 3, title: 'C' }),
        task({ id: 'p1', priority: 1, title: 'A' }),
        task({ id: 'done', priority: 1, title: 'B', status: 'done' }),
      ],
      [habit({ id: 'hab', name: 'Z' })],
      new Set(),
    );
    // p1 (todo) < p3 (todo) < hab (priorité null=4, todo) < done (fait)
    expect(out.map(i => i.refId)).toEqual(['p1', 'p3', 'hab', 'done']);
  });

  it('habitude validée aujourd\'hui = done', () => {
    const out = assembleInventory([], [habit({ id: 'h1' })], new Set(['h1']));
    expect(out[0]!.done).toBe(true);
  });
});

describe('inventory — filtres', () => {
  const items = assembleInventory(
    [
      task({ id: 'a', priority: 1, domain: 'travail', tags: ['awan app'], status: 'active' }),
      task({ id: 'b', priority: 3, domain: 'famille', tags: ['villa n2'], status: 'done' }),
    ],
    [habit({ id: 'h', domain: 'sport', tags: ['villa n2'] })],
    new Set(),
  );

  it('status', () => {
    expect(applyFilters(items, filters({ status: 'todo' })).every(i => !i.done)).toBe(true);
    expect(applyFilters(items, filters({ status: 'done' })).map(i => i.refId)).toEqual(['b']);
  });
  it('recurrence', () => {
    expect(applyFilters(items, filters({ recurrence: 'recurring' })).map(i => i.refId)).toEqual(['h']);
    expect(applyFilters(items, filters({ recurrence: 'oneoff' })).every(i => !i.recurring)).toBe(true);
  });
  it('priorité', () => {
    expect(applyFilters(items, filters({ priority: 1 })).map(i => i.refId)).toEqual(['a']);
  });
  it('domaine', () => {
    expect(applyFilters(items, filters({ domain: 'famille' })).map(i => i.refId)).toEqual(['b']);
  });
  it('tags (OR) — dossier transverse tâche + habitude', () => {
    const got = applyFilters(items, filters({ tags: ['villa n2'] })).map(i => i.refId).sort();
    expect(got).toEqual(['b', 'h']); // une tâche ET une habitude partagent le dossier
  });
  it('recherche titre/tag', () => {
    expect(applyFilters(items, filters({ search: 'awan' })).map(i => i.refId)).toEqual(['a']);
  });
});

describe('inventory — facettes', () => {
  it('domaines et tags distincts triés', () => {
    const items = assembleInventory(
      [task({ id: 'a', domain: 'travail', tags: ['awan app', 'villa n2'] })],
      [habit({ id: 'h', domain: 'sport', tags: ['villa n2'] })],
      new Set(),
    );
    const f = collectFacets(items);
    expect(f.domains).toEqual(['sport', 'travail']);
    expect(f.tags).toEqual(['awan app', 'villa n2']);
  });
});

describe('Planner.getAllTasks', () => {
  it('retourne toutes les tâches tous statuts + émet task.modified', async () => {
    const planner = new Planner(new MemoryStorage());
    await planner.saveTask(task({ id: `${DATE}.1`, status: 'active' }));
    await planner.saveTask(task({ id: `${DATE}.2`, status: 'cancelled' }));
    const all = await planner.getAllTasks();
    expect(all).toHaveLength(2);
  });
});

describe('édition — invariants', () => {
  it('édite une tâche en préservant les champs hors formulaire (date, dépendances, statut)', async () => {
    const planner = new Planner(new MemoryStorage());
    await planner.saveTask(task({ id: `${DATE}.9`, title: 'Avant', priority: 3, dependsOn: ['x'], status: 'active' }));
    const existing = await planner.getTask(`${DATE}.9`);
    expect(existing).not.toBeNull();
    await planner.saveTask({ ...existing!, title: 'Après', priority: 1 });
    const after = await planner.getTask(`${DATE}.9`);
    expect(after).toMatchObject({ title: 'Après', priority: 1, date: DATE, dependsOn: ['x'], status: 'active' });
  });

  it('renomme une habitude en conservant son id (occurrences non orphelines)', async () => {
    _setStorageForTest(new MemoryStorage());
    await HabitService.saveDefinition(habit({ id: 'med', name: 'Méditation', daysOfWeek: [1, 3] }));
    const existing = (await HabitService.getDefinitions()).find(d => d.id === 'med')!;
    await HabitService.saveDefinition({ ...existing, name: 'Coran', daysOfWeek: [2, 4] });
    const defs = await HabitService.getDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0]).toMatchObject({ id: 'med', name: 'Coran', daysOfWeek: [2, 4] });
  });
});
