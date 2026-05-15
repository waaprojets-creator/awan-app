import { useMemo } from 'react';
import { PRAYER_NAMES } from '@/data/schemas/islam/prayerLog';

// ── Types publics ──────────────────────────────────────────────────────────────

export type ScoreStatus = 'ok' | 'warn' | 'error' | 'spirit' | 'mute';

export interface DomainScore {
  value: number;
  status: ScoreStatus;
  label: string;
}

export interface AwanScore {
  global: number;
  status: ScoreStatus;
  spirit: DomainScore;
  body:   DomainScore;
  time:   DomainScore;
}

function toStatus(value: number): ScoreStatus {
  if (value >= 75) return 'ok';
  if (value >= 40) return 'warn';
  return 'error';
}

function globalStatus(score: number): ScoreStatus {
  if (score >= 80) return 'ok';
  if (score >= 55) return 'warn';
  if (score < 20)  return 'spirit';
  return 'error';
}

function computeSpirit(prayersDone: number, prayersTotal: number): DomainScore {
  const value = prayersTotal > 0
    ? Math.round((prayersDone / prayersTotal) * 100)
    : 0;
  return { value, status: toStatus(value), label: 'ISLAM' };
}

function computeBody(
  kcalLogged: number,
  kcalTarget: number,
  sessionsThisWeek: number,
): DomainScore {
  const nutritionScore = kcalTarget > 0
    ? Math.min(100, Math.round((kcalLogged / kcalTarget) * 100))
    : 0;
  const sportScore = Math.min(100, sessionsThisWeek * 25);
  const value = Math.round(nutritionScore * 0.5 + sportScore * 0.5);
  return { value, status: toStatus(value), label: 'SANTÉ' };
}

function computeTime(tasksDone: number, tasksTotal: number): DomainScore {
  const value = tasksTotal > 0
    ? Math.round((tasksDone / tasksTotal) * 100)
    : 100;
  return { value, status: toStatus(value), label: 'PLANNING' };
}

// ── Hook principal ─────────────────────────────────────────────────────────────

interface AwanScoreInput {
  prayersDone:      number;
  kcalLogged:       number;
  kcalTarget:       number;
  sessionsThisWeek: number;
  tasksDone:        number;
  tasksTotal:       number;
}

export function useAwanScore(input: AwanScoreInput): AwanScore {
  return useMemo(() => {
    const spirit = computeSpirit(input.prayersDone, PRAYER_NAMES.length);
    const body   = computeBody(input.kcalLogged, input.kcalTarget, input.sessionsThisWeek);
    const time   = computeTime(input.tasksDone, input.tasksTotal);

    // Spirit 40% / Body 40% / Planning 20%
    const global = Math.round(spirit.value * 0.4 + body.value * 0.4 + time.value * 0.2);

    return { global, status: globalStatus(global), spirit, body, time };
  }, [
    input.prayersDone,
    input.kcalLogged,
    input.kcalTarget,
    input.sessionsThisWeek,
    input.tasksDone,
    input.tasksTotal,
  ]);
}

// ── Utilitaire semaine courante ────────────────────────────────────────────────

export function sessionsThisWeek(sessions: { date?: string; startTime?: number }[]): number {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return sessions.filter(s => {
    const t = s.startTime ?? 0;
    return t >= weekAgo && t <= now;
  }).length;
}
