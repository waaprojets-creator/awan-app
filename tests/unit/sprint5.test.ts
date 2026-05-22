import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../../src/data/storage/MemoryStorage';
import { _setStorageForTest } from '../../src/data/storage/storageService';
import { WorkoutService } from '../../src/services/workoutService';
import { Planner } from '../../src/modules/planning/api';
import { makeRoutine, makeSession } from '../builders/sport';

const routineWithId = (id: string) => makeRoutine({ id, name: `Routine ${id}` });
const sessionWithId = (id: string) => makeSession({ id });

// ── WorkoutService ────────────────────────────────────────────────────────────

describe('WorkoutService', () => {
  beforeEach(() => {
    _setStorageForTest(new MemoryStorage());
  });

  it('sauvegarde et récupère une routine', async () => {
    const r = routineWithId('550e8400-e29b-41d4-a716-446655440000');
    await WorkoutService.saveRoutine(r);
    const all = await WorkoutService.getAllRoutines();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Routine 550e8400-e29b-41d4-a716-446655440000');
  });

  it('supprime une routine', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440001';
    await WorkoutService.saveRoutine(routineWithId(id));
    await WorkoutService.deleteRoutine(id);
    const all = await WorkoutService.getAllRoutines();
    expect(all).toHaveLength(0);
  });

  it('sauvegarde plusieurs routines et les récupère toutes', async () => {
    await WorkoutService.saveRoutine(routineWithId('550e8400-e29b-41d4-a716-446655440010'));
    await WorkoutService.saveRoutine(routineWithId('550e8400-e29b-41d4-a716-446655440011'));
    await WorkoutService.saveRoutine(routineWithId('550e8400-e29b-41d4-a716-446655440012'));
    const all = await WorkoutService.getAllRoutines();
    expect(all).toHaveLength(3);
  });

  it('sauvegarde et récupère une session', async () => {
    const s = sessionWithId('660e8400-e29b-41d4-a716-446655440000');
    await WorkoutService.saveSession(s);
    const all = await WorkoutService.getAllSessions();
    expect(all).toHaveLength(1);
    expect(all[0].duration).toBe(3600);
  });

  it('émet workout.completed lors de la sauvegarde d\'une session', async () => {
    const events: string[] = [];
    const { eventBus } = await import('../../src/data/events/bus');
    const unsub = eventBus.on('workout.completed', (d) => events.push(d.date));
    await WorkoutService.saveSession(sessionWithId('660e8400-e29b-41d4-a716-446655440001'));
    unsub();
    expect(events).toContain('2026-05-10');
  });
});

// ── Planner (usePlanner logic sans React) ─────────────────────────────────────

describe('Planner via IStorage', () => {
  let storage: MemoryStorage;
  let planner: Planner;

  beforeEach(() => {
    storage = new MemoryStorage();
    _setStorageForTest(storage);
    planner = new Planner(storage);
  });

  it('sauvegarde et récupère une tâche', async () => {
    await planner.saveTask({
      v: 2,
      id: '770e8400-e29b-41d4-a716-446655440000',
      title: 'Musculation',
      durationMin: 60,
      priority: 4,
      domain: 'sport',
      tags: [],
      dependsOn: [],
      enabled: true,
    });
    const tasks = await planner.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Musculation');
  });

  it('optimise un planning et persiste le résultat', async () => {
    await planner.saveTask({
      v: 2,
      id: '770e8400-e29b-41d4-a716-446655440001',
      title: 'Révision',
      durationMin: 45,
      priority: 3,
      domain: 'planning',
      tags: [],
      dependsOn: [],
      enabled: true,
    });
    const schedule = await planner.optimize('2026-05-10');
    expect(schedule.date).toBe('2026-05-10');
    expect(schedule.slots.length + schedule.unscheduled.length).toBe(1);

    const stored = await planner.getSchedule('2026-05-10');
    expect(stored?.date).toBe('2026-05-10');
  });

  it('supprime une tâche', async () => {
    const id = '770e8400-e29b-41d4-a716-446655440002';
    await planner.saveTask({
      v: 2, id, title: 'À supprimer', durationMin: 30,
      priority: 1, domain: 'general',
      tags: [], dependsOn: [], enabled: true,
    });
    await planner.deleteTask(id);
    expect(await planner.getTasks()).toHaveLength(0);
  });
});
