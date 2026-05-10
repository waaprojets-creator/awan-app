import { ds, parseDate } from './storage';
import { CATS } from '../constants/theme';

export function appliesToDate(rt, dateStr) {
  if (rt.endDate && dateStr > rt.endDate) return false;
  if (rt.startDate && dateStr < rt.startDate) return false;
  const d = parseDate(dateStr);
  const dow = d.getDay();
  const di = dow === 0 ? 6 : dow - 1;
  switch (rt.frequency) {
    case 'daily': return true;
    case 'weekdays': return di < 5;
    case 'weekend': return di >= 5;
    default: return true;
  }
}

const eventCache = new Map();

export function eventsForDate(db, dateStr) {
  if (!db) return [];
  const cacheKey = `${dateStr}:${db.events?.length || 0}:${db.routines?.length || 0}`;
  if (eventCache.has(cacheKey)) return eventCache.get(cacheKey);

  const regular = (db.events || []).filter(e => e.date === dateStr);
  const rtEvents = [];
  (db.routines || []).forEach(rt => {
    if (!appliesToDate(rt, dateStr)) return;
    if (rt.excludedDates && rt.excludedDates.includes(dateStr)) return;
    rtEvents.push({ id: `rt_${rt.id}_${dateStr}`, originalRtId: rt.id, title: rt.name, date: dateStr, time: rt.time, duration: rt.duration, category: 'routine', color: rt.color || CATS.routine.c, isRt: true });
  });

  const result = [...regular, ...rtEvents].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  eventCache.set(cacheKey, result);
  return result;
}

export function daysWithEvents(db, year, month) {
  const set = new Set();
  const dim = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= dim; day++) {
    const dstr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (eventsForDate(db, dstr).length > 0) set.add(day);
  }
  return set;
}

export function clearEventCache() { eventCache.clear(); }
