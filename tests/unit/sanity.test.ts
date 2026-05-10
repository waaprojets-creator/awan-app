import { describe, it, expect } from 'vitest';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { eventBus } from '@/data/events/bus';
import { z } from 'zod';

describe('Pré-flight sanity', () => {
  it('MemoryStorage get/set/delete', async () => {
    const storage = new MemoryStorage();
    const schema = z.object({ v: z.literal(1), name: z.string() });
    const parse = (raw: unknown) => schema.parse(raw);

    await storage.set('test:1', { v: 1, name: 'AWAN' });
    const result = await storage.get('test:1', parse);
    expect(result).toEqual({ v: 1, name: 'AWAN' });

    await storage.delete('test:1');
    expect(await storage.get('test:1', parse)).toBeNull();
  });

  it('MemoryStorage list by prefix', async () => {
    const storage = new MemoryStorage();
    await storage.set('sport:1', { v: 1, x: 10 });
    await storage.set('sport:2', { v: 1, x: 20 });
    await storage.set('nutrition:1', { v: 1, x: 30 });

    const keys = await storage.list('sport:');
    expect(keys).toHaveLength(2);
    expect(keys).toContain('sport:1');
  });

  it('EventBus emit/on/off', () => {
    const received: string[] = [];
    const handler = (data: { workoutId: string; date: string }) => {
      received.push(data.workoutId);
    };

    const off = eventBus.on('workout.completed', handler);
    eventBus.emit('workout.completed', { workoutId: 'abc', date: '2026-05-10' });
    expect(received).toEqual(['abc']);

    off();
    eventBus.emit('workout.completed', { workoutId: 'xyz', date: '2026-05-10' });
    expect(received).toHaveLength(1);
    eventBus.clear();
  });

  it('Zod rejette données malformées', () => {
    const schema = z.object({ v: z.literal(1), name: z.string() });
    expect(() => schema.parse({ v: 2, name: 'bad' })).toThrow();
    expect(() => schema.parse({ v: 1 })).toThrow();
  });
});
