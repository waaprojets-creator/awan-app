import { getStorage } from '@/data/storage/storageService';
import { migratePerfSnapshot } from '@/data/schemas/monitoring/perfSnapshot';
import type { PerfSnapshotLatest } from '@/data/schemas/monitoring/perfSnapshot';

const PERF_PREFIX = 'monitoring.perfSnapshot';

function perfKey(s: PerfSnapshotLatest): string {
  return `${PERF_PREFIX}.${s.id}`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx]!;
}

export const PerfService = {
  async getAll(): Promise<PerfSnapshotLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(PERF_PREFIX);
    const all = await Promise.all(keys.map(k => storage.get(k, migratePerfSnapshot)));
    return all
      .filter((e): e is PerfSnapshotLatest => e !== null)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async getByDateRange(from: string, to: string): Promise<PerfSnapshotLatest[]> {
    const all = await PerfService.getAll();
    return all.filter(e => e.date >= from && e.date <= to);
  },

  async saveSnapshot(s: PerfSnapshotLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(perfKey(s), s);
  },

  async deleteById(id: string): Promise<void> {
    const storage = await getStorage();
    await storage.delete(`${PERF_PREFIX}.${id}`);
  },

  computeStats(entries: PerfSnapshotLatest[]): {
    avgBootMs: number | null;
    avgHydrationMs: number | null;
    avgFps50: number | null;
    avgFps5: number | null;
    avgJank: number;
    avgDbMB: number;
    totalErrors: number;
  } {
    if (entries.length === 0) {
      return { avgBootMs: null, avgHydrationMs: null, avgFps50: null, avgFps5: null, avgJank: 0, avgDbMB: 0, totalErrors: 0 };
    }
    const avg = (vals: (number | null)[]): number | null => {
      const nums = vals.filter((v): v is number => v !== null);
      return nums.length === 0 ? null : nums.reduce((a, b) => a + b, 0) / nums.length;
    };
    return {
      avgBootMs:      avg(entries.map(e => e.boot_ms)),
      avgHydrationMs: avg(entries.map(e => e.hydration_ms)),
      avgFps50:       avg(entries.map(e => e.fps_p50)),
      avgFps5:        avg(entries.map(e => e.fps_p5)),
      avgJank:        entries.reduce((s, e) => s + e.jank_count, 0) / entries.length,
      avgDbMB:        entries.reduce((s, e) => s + e.db_bytes, 0) / entries.length / (1024 * 1024),
      totalErrors:    entries.reduce((s, e) => s + e.error_count, 0),
    };
  },

  computeIoPercentile(entries: PerfSnapshotLatest[], prefix: string, p: number): number | null {
    const vals = entries
      .map(e => e.io_list_ms[prefix])
      .filter((v): v is number => v !== undefined)
      .sort((a, b) => a - b);
    if (vals.length === 0) return null;
    return parseFloat(percentile(vals, p).toFixed(1));
  },
};
