import { Capacitor } from '@capacitor/core';

// Media cache — 3-level structure: CDN-base / exercise-folder / {0|1}.jpg
// Native filesystem caching (requires @capacitor/filesystem) is stubbed until the package
// is installed — all platforms fall back to the CDN URL transparently.

const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200 MB (native, unused until @capacitor/filesystem)
const LRU_KEY = 'awan.media.lru';

interface LruEntry { size: number; lastAccess: number; }

const _mem = new Map<string, string>();

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function lruKey(exerciseId: string, imgIndex: 0 | 1): string {
  return `${exerciseId}/${imgIndex}`;
}

function loadLru(): Record<string, LruEntry> {
  try {
    const raw = localStorage.getItem(LRU_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LruEntry>) : {};
  } catch { return {}; }
}

function saveLru(lru: Record<string, LruEntry>): void {
  try { localStorage.setItem(LRU_KEY, JSON.stringify(lru)); } catch { /* storage quota */ }
}

// LRU eviction — only meaningful on native once @capacitor/filesystem is enabled.
// On web this is a no-op because we never write local files.
async function evictIfNeeded(_required: number): Promise<void> {
  if (isNative()) return; // TODO: implement when @capacitor/filesystem is installed
  const lru = loadLru();
  const entries = Object.entries(lru).sort((a, b) => a[1].lastAccess - b[1].lastAccess);
  let total = entries.reduce((s, [, e]) => s + e.size, 0);
  while (total + _required > MAX_CACHE_BYTES && entries.length > 0) {
    const oldest = entries.shift();
    if (!oldest) break;
    delete lru[oldest[0]];
    total -= oldest[1].size;
  }
  saveLru(lru);
}

/**
 * Returns the URI to display for a given exercise image (index 0 = start, 1 = end).
 * Web: CDN URL from the exercise catalog, cached in memory.
 * Native: same CDN URL for now (filesystem caching NYI).
 */
export async function getImageUri(exerciseId: string, imgIndex: 0 | 1): Promise<string> {
  const key = lruKey(exerciseId, imgIndex);

  const cached = _mem.get(key);
  if (cached) return cached;

  const { getExerciseById } = await import('@/utils/sportData');
  const ex = getExerciseById(exerciseId);
  const url = ex?.images?.[imgIndex] ?? '';
  if (!url) return '';

  _mem.set(key, url);

  if (!isNative()) {
    const lru = loadLru();
    lru[key] = { size: 0, lastAccess: Date.now() };
    saveLru(lru);
  }

  return url;
}

/**
 * Pre-warms the in-memory cache for all exercises in a routine.
 * Called silently after a routine is saved — never blocks UI.
 */
export async function cacheForRoutine(exerciseIds: string[]): Promise<void> {
  await Promise.allSettled(
    exerciseIds.flatMap(id => [getImageUri(id, 0), getImageUri(id, 1)]),
  );
}

/**
 * Pre-warms cache for a single favorited exercise.
 */
export async function cacheForFavorite(exerciseId: string): Promise<void> {
  await cacheForRoutine([exerciseId]);
}

export function getCacheStats(): { memEntries: number; lruEntries: number } {
  return {
    memEntries: _mem.size,
    lruEntries: Object.keys(loadLru()).length,
  };
}

export function clearMediaCache(): void {
  _mem.clear();
  saveLru({});
}
