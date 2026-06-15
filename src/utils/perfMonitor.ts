import { getStorage } from '@/data/storage/storageService';
import type { PerfSnapshotLatest } from '@/data/schemas/monitoring/perfSnapshot';

const SILO_PREFIXES = [
  'sleep.entry',
  'sport.session',
  'nutrition.meal',
  'anthropo.measurement',
  'planning.task',
  'journal.entry',
  'islam.prayer',
  'activity.record',
] as const;

const MAX_FRAME_SAMPLES = 300;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx]!;
}

class PerfMonitor {
  private readonly bootStart = typeof performance !== 'undefined' ? performance.now() : 0;
  hydrationStart = 0;
  hydrationMs: number | null = null;
  bootMs: number | null = null;
  errorCount = 0;
  errorMessages: string[] = [];
  private frameDeltas: number[] = [];
  private rafId: number | null = null;
  private lastFrameTs: number | null = null;

  markHydrationStart(): void {
    this.hydrationStart = typeof performance !== 'undefined' ? performance.now() : 0;
  }

  markHydrationEnd(): void {
    if (this.hydrationStart > 0) {
      this.hydrationMs = parseFloat(
        (performance.now() - this.hydrationStart).toFixed(1),
      );
    }
  }

  markBootComplete(): void {
    this.bootMs = parseFloat((performance.now() - this.bootStart).toFixed(1));
  }

  recordError(msg: string): void {
    this.errorCount += 1;
    this.errorMessages = [...this.errorMessages.slice(-9), msg];
  }

  startFpsCapture(): void {
    if (this.rafId !== null || typeof requestAnimationFrame === 'undefined') return;
    this.lastFrameTs = performance.now();
    const loop = (ts: number) => {
      if (this.lastFrameTs !== null) {
        const delta = ts - this.lastFrameTs;
        if (delta > 0) {
          this.frameDeltas.push(delta);
          if (this.frameDeltas.length > MAX_FRAME_SAMPLES) this.frameDeltas.shift();
        }
      }
      this.lastFrameTs = ts;
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stopFpsCapture(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastFrameTs = null;
  }

  async buildSnapshot(date: string): Promise<PerfSnapshotLatest> {
    const storage = await getStorage();

    const fps_p50 = this.frameDeltas.length > 0
      ? parseFloat((1000 / percentile([...this.frameDeltas].sort((a, b) => a - b), 50)).toFixed(1))
      : null;
    const fps_p5 = this.frameDeltas.length > 0
      ? parseFloat((1000 / percentile([...this.frameDeltas].sort((a, b) => b - a), 50)).toFixed(1))
      : null;
    const jank_count = this.frameDeltas.filter(d => d > 33).length;

    const db_bytes = await storage.getSizeBytes();

    const row_counts: Record<string, number> = {};
    const io_list_ms: Record<string, number> = {};
    for (const prefix of SILO_PREFIXES) {
      const t0 = performance.now();
      const keys = await storage.list(prefix);
      io_list_ms[prefix] = parseFloat((performance.now() - t0).toFixed(1));
      row_counts[prefix] = keys.length;
    }

    return {
      v: 1,
      id: `perf.${date}`,
      date,
      timestamp: Date.now(),
      boot_ms: this.bootMs,
      hydration_ms: this.hydrationMs,
      fps_p50,
      fps_p5,
      jank_count,
      db_bytes,
      row_counts,
      io_list_ms,
      error_count: this.errorCount,
      error_messages: [...this.errorMessages],
    };
  }
}

export const perfMonitor = new PerfMonitor();
