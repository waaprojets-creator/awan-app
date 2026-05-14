import { useMemo } from 'react';
import { ds } from '@/utils/storage';
import { PRAYER_NAMES } from '@/data/schemas/islam/prayerLog';

// ── Types publics ──────────────────────────────────────────────────────────────

export type ScoreStatus = 'ok' | 'warn' | 'error' | 'spirit' | 'mute';

export interface DomainScore {
  value: number;       // 0–100
  status: ScoreStatus;
  label: string;       // libellé display Cairo
}

export interface AwanScore {
  global: number;        // 0–100
  status: ScoreStatus;
  spirit: DomainScore;
  body:   DomainScore;
  mind:   DomainScore;
  time:   DomainScore;
}

// ── Seuils → tokens status ─────────────────────────────────────────────────────
// Logique token : pas de couleur hardcodée ici — on retourne un StatusVariant
// InstrumentCard résout la couleur via var(--color-awan-status-*)

function toStatus(value: number): ScoreStatus {
  if (value >= 75) return 'ok';
  if (value >= 40) return 'warn';
  return 'error';
}

function globalStatus(score: number): ScoreStatus {
  if (score >= 80) return 'ok';
  if (score >= 55) return 'warn';
  if (score < 20)  return 'spirit'; // état de veille/nuit profonde
  return 'error';
}

// ── Calcul Spirit (prières) ────────────────────────────────────────────────────
// Source réelle : prayerLog.prayers + PRAYER_NAMES.length = 5

function computeSpirit(prayersDone: number, prayersTotal: number): DomainScore {
  const value = prayersTotal > 0
    ? Math.round((prayersDone / prayersTotal) * 100)
    : 0;
  return { value, status: toStatus(value), label: 'SPIRIT' };
}

// ── Calcul Body (nutrition + workout) ─────────────────────────────────────────
// Source réelle : mealStore.totals.kcal, workoutStore.sessions

function computeBody(
  kcalLogged: number,
  kcalTarget: number,
  sessionsThisWeek: number,
): DomainScore {
  const nutritionScore = kcalTarget > 0
    ? Math.min(100, Math.round((kcalLogged / kcalTarget) * 100))
    : 0;
  const sportScore = Math.min(100, sessionsThisWeek * 25); // 4 sessions = 100%
  const value = Math.round(nutritionScore * 0.5 + sportScore * 0.5);
  return { value, status: toStatus(value), label: 'BODY' };
}

// ── Calcul Mind (données indisponibles en v2 → placeholder) ───────────────────
// En v2 : retourne 'mute' + value=0 si pas de données mental
// En v3 : brancher useMentalStore quand disponible

function computeMind(mentalScore: number | null): DomainScore {
  if (mentalScore === null) {
    return { value: 0, status: 'mute', label: 'MIND' };
  }
  const value = Math.min(100, Math.max(0, mentalScore));
  return { value, status: toStatus(value), label: 'MIND' };
}

// ── Calcul Time (tâches) ───────────────────────────────────────────────────────
// Source réelle : db.tasks de AppStateContext — passé en paramètre

function computeTime(tasksDone: number, tasksTotal: number): DomainScore {
  const value = tasksTotal > 0
    ? Math.round((tasksDone / tasksTotal) * 100)
    : 100; // pas de tâches = journée libre = score plein
  return { value, status: toStatus(value), label: 'TIME' };
}

// ── Hook principal ─────────────────────────────────────────────────────────────

interface AwanScoreInput {
  prayersDone:     number;   // usePrayerStore(today).doneCount
  kcalLogged:      number;   // useMealStore(today).totals.kcal
  kcalTarget:      number;   // config ou valeur par défaut 2000
  sessionsThisWeek: number;  // useWorkoutStore().sessions filtrés sur 7 jours
  mentalScore:     number | null; // null en v2
  tasksDone:       number;   // db.tasks.filter(t => t.done).length
  tasksTotal:      number;   // db.tasks.length
}

export function useAwanScore(input: AwanScoreInput): AwanScore {
  return useMemo(() => {
    const spirit = computeSpirit(input.prayersDone, PRAYER_NAMES.length);
    const body   = computeBody(input.kcalLogged, input.kcalTarget, input.sessionsThisWeek);
    const mind   = computeMind(input.mentalScore);
    const time   = computeTime(input.tasksDone, input.tasksTotal);

    // Pondération : Spirit 30% / Body 30% / Mind 20% / Time 20%
    // Mind exclu du calcul si données absentes (status mute)
    const hasMind = mind.status !== 'mute';
    const global = hasMind
      ? Math.round(spirit.value * 0.3 + body.value * 0.3 + mind.value * 0.2 + time.value * 0.2)
      : Math.round(spirit.value * 0.375 + body.value * 0.375 + time.value * 0.25);

    return {
      global,
      status: globalStatus(global),
      spirit,
      body,
      mind,
      time,
    };
  }, [
    input.prayersDone,
    input.kcalLogged,
    input.kcalTarget,
    input.sessionsThisWeek,
    input.mentalScore,
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
