import { ds, parseDate } from './storage';
import { CATS } from '../constants/theme';

export function appliesToDate(rt, dateStr) {
  if (rt.endDate && dateStr > rt.endDate) return false;
  if (rt.startDate && dateStr < rt.startDate) return false;

  const d = parseDate(dateStr);
  const dow = d.getDay();
  const di = dow === 0 ? 6 : dow - 1;

  switch (rt.frequency) {
    case 'daily':    return true;
    case 'weekdays': return di < 5;
    case 'weekend':  return di >= 5;
    case 'custom':   return Array.isArray(rt.days) && rt.days.includes(di);
    case 'weekly': {
      if (!rt.startDate) return false;
      const start = parseDate(rt.startDate);
      const diff = Math.round((d - start) / 86400000);
      return diff >= 0 && diff % 7 === 0;
    }
    case 'monthly': {
      if (!rt.startDate) return false;
      return d.getDate() === parseDate(rt.startDate).getDate();
    }
    case 'once': return dateStr === rt.startDate;
    default: return true;
  }
}

/**
 * Get events for a specific date (both regular and from routines)
 * Memoized to avoid recalculating on every render
 */
const eventCache = new Map();
const CACHE_SIZE = 50;

export function eventsForDate(db, dateStr) {
  if (!db) return [];
  // Check cache first
  const cacheKey = `${dateStr}:${db.events?.length || 0}:${db.routines?.length || 0}`;
  if (eventCache.has(cacheKey)) {
    return eventCache.get(cacheKey);
  }

  const regular = (db.events || []).filter(e => e.date === dateStr);

  const rtEvents = [];
  (db.routines || []).forEach(rt => {
    if (!appliesToDate(rt, dateStr)) return;
    rtEvents.push({
      id: `rt_${rt.id}_${dateStr}`,
      title: rt.name,
      date: dateStr,
      time: rt.time,
      duration: rt.duration,
      category: 'routine',
      color: rt.color || CATS.routine.c,
      source: rt.source || 'manual',
      isRt: true,
      rtId: rt.id,
      steps: rt.steps || [],
    });
  });

  const result = [...regular, ...rtEvents].sort((a, b) =>
    (a.time || '99:99').localeCompare(b.time || '99:99')
  );

  // Simple LRU cache
  if (eventCache.size >= CACHE_SIZE) {
    const firstKey = eventCache.keys().next().value;
    eventCache.delete(firstKey);
  }
  eventCache.set(cacheKey, result);

  return result;
}

export function daysWithEvents(db, year, month) {
  const set = new Set();
  const dim = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= dim; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (eventsForDate(db, dateStr).length > 0) set.add(day);
  }
  return set;
}

/**
 * Clear event cache when DB changes significantly
 */
export function clearEventCache() {
  eventCache.clear();
}
