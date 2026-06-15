import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../../src/data/storage/MemoryStorage';
import { _setStorageForTest } from '../../src/data/storage/storageService';
import { PerfService } from '../../src/services/perfService';
import type { PerfSnapshotLatest } from '../../src/data/schemas/monitoring/perfSnapshot';

function makeSnap(overrides: Partial<PerfSnapshotLatest> = {}): PerfSnapshotLatest {
  return {
    v: 1,
    id: 'perf.2026-06-14',
    date: '2026-06-14',
    timestamp: 1_000_000,
    boot_ms: 820,
    hydration_ms: 310,
    fps_p50: 58.4,
    fps_p5: 42.1,
    jank_count: 3,
    db_bytes: 2_097_152,
    row_counts: { 'sleep.entry': 120, 'sport.session': 45 },
    io_list_ms: { 'sleep.entry': 12.4, 'sport.session': 8.1 },
    error_count: 0,
    error_messages: [],
    ...overrides,
  };
}

describe('PerfService', () => {
  beforeEach(() => _setStorageForTest(new MemoryStorage()));

  // ── getAll ──────────────────────────────────────────────────────────────────

  it('getAll retourne [] si vide (trigger=false)', async () => {
    expect(await PerfService.getAll()).toEqual([]);
  });

  it('saveSnapshot puis getAll round-trip (trigger=true)', async () => {
    const snap = makeSnap();
    await PerfService.saveSnapshot(snap);
    const all = await PerfService.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.boot_ms).toBe(820);
  });

  it('getAll trie par date DESC', async () => {
    await PerfService.saveSnapshot(makeSnap({ id: 'perf.2026-06-13', date: '2026-06-13' }));
    await PerfService.saveSnapshot(makeSnap({ id: 'perf.2026-06-14', date: '2026-06-14' }));
    const all = await PerfService.getAll();
    expect(all[0]?.date).toBe('2026-06-14');
    expect(all[1]?.date).toBe('2026-06-13');
  });

  // ── getByDateRange ───────────────────────────────────────────────────────────

  it('getByDateRange inclut les dates dans la plage (trigger=true)', async () => {
    await PerfService.saveSnapshot(makeSnap({ id: 'p1', date: '2026-06-10' }));
    await PerfService.saveSnapshot(makeSnap({ id: 'p2', date: '2026-06-14' }));
    const range = await PerfService.getByDateRange('2026-06-12', '2026-06-15');
    expect(range).toHaveLength(1);
    expect(range[0]?.id).toBe('p2');
  });

  it('getByDateRange retourne [] si rien dans la plage (trigger=false)', async () => {
    await PerfService.saveSnapshot(makeSnap({ id: 'p1', date: '2026-06-01' }));
    const range = await PerfService.getByDateRange('2026-06-10', '2026-06-15');
    expect(range).toHaveLength(0);
  });

  // ── deleteById ──────────────────────────────────────────────────────────────

  it('deleteById puis getAll → entrée absente', async () => {
    await PerfService.saveSnapshot(makeSnap({ id: 'perf.2026-06-14' }));
    await PerfService.deleteById('perf.2026-06-14');
    expect(await PerfService.getAll()).toHaveLength(0);
  });

  // ── computeStats ────────────────────────────────────────────────────────────

  it('computeStats([]) → valeurs null/0 (trigger=false)', () => {
    const s = PerfService.computeStats([]);
    expect(s.avgBootMs).toBeNull();
    expect(s.avgFps50).toBeNull();
    expect(s.avgJank).toBe(0);
    expect(s.totalErrors).toBe(0);
  });

  it('computeStats([...]) → moyennes correctes (trigger=true)', () => {
    const entries = [
      makeSnap({ boot_ms: 800, fps_p50: 56, fps_p5: 40, jank_count: 2, db_bytes: 1_048_576, error_count: 1 }),
      makeSnap({ boot_ms: 900, fps_p50: 60, fps_p5: 44, jank_count: 4, db_bytes: 3_145_728, error_count: 0 }),
    ];
    const s = PerfService.computeStats(entries);
    expect(s.avgBootMs).toBe(850);
    expect(s.avgFps50).toBe(58);
    expect(s.avgFps5).toBe(42);
    expect(s.avgJank).toBe(3);
    expect(s.avgDbMB).toBeCloseTo(2, 0);
    expect(s.totalErrors).toBe(1);
  });

  it('computeStats ignore les valeurs null (boot_ms) dans la moyenne', () => {
    const entries = [
      makeSnap({ boot_ms: 1000 }),
      makeSnap({ boot_ms: null }),
    ];
    const s = PerfService.computeStats(entries);
    expect(s.avgBootMs).toBe(1000);
  });

  // ── computeIoPercentile ─────────────────────────────────────────────────────

  it('computeIoPercentile retourne null si aucune entrée pour le préfixe (trigger=false)', () => {
    const entries = [makeSnap({ io_list_ms: {} })];
    expect(PerfService.computeIoPercentile(entries, 'sleep.entry', 50)).toBeNull();
  });

  it('computeIoPercentile calcule p50 correctement (trigger=true)', () => {
    const entries = [
      makeSnap({ io_list_ms: { 'sleep.entry': 10 } }),
      makeSnap({ io_list_ms: { 'sleep.entry': 20 } }),
      makeSnap({ io_list_ms: { 'sleep.entry': 30 } }),
    ];
    const p50 = PerfService.computeIoPercentile(entries, 'sleep.entry', 50);
    expect(p50).toBe(20);
  });
});
