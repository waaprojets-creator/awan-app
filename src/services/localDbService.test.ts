import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalDbService } from './localDbService';
import { useAppStore } from '../store/appStore';

// Mock Zustand store for tests
vi.mock('../store/appStore', () => {
  let mockDb = null;
  return {
    useAppStore: {
      getState: () => ({
        db: mockDb,
        updateDb: (newDb) => { mockDb = newDb; }
      })
    }
  };
});

describe('LocalDbService', () => {
  beforeEach(() => {
    // Reset mock state
    useAppStore.getState().updateDb(null);
  });

  it('provides a default state if db is null', () => {
    const data = LocalDbService.load();
    expect(data.pois).toEqual([]);
    expect(data.logs).toEqual([]);
  });

  it('can save and retrieve a POI', () => {
    const poi = { id: 'poi1', name: 'Home' };
    LocalDbService.savePoi(poi);
    
    // Retrieving the POI updates the array
    const pois = LocalDbService.getPois();
    expect(pois.length).toBe(1);
    expect(pois[0].name).toBe('Home');
    expect(pois[0].notes).toBe(''); // Notes auto-added
  });

  it('allows logging time for a task', () => {
    LocalDbService.logTime('task1', 5000);
    
    const data = LocalDbService.load();
    expect(data.logs.length).toBe(1);
    expect(data.logs[0].taskId).toBe('task1');
    expect(data.logs[0].durationMs).toBe(5000);
  });

  it('correctly auto-purges old logs after 24 hours', () => {
    // Inject old log
    const oldTimestamp = Date.now() - (25 * 3600 * 1000); // 25 hours ago
    const newTimestamp = Date.now() - 1000;
    
    useAppStore.getState().updateDb({
      pois: [],
      logs: [
        { taskId: 't1', durationMs: 10, timestamp: oldTimestamp },
        { taskId: 't2', durationMs: 20, timestamp: newTimestamp }
      ]
    });
    
    LocalDbService.autoPurge();
    const data = LocalDbService.load();
    expect(data.logs.length).toBe(1);
    expect(data.logs[0].taskId).toBe('t2'); // Only recent log kept
  });
});
