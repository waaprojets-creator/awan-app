import { useEffect, useMemo, useState } from 'react';
import { ds } from '@/utils/storage';
import { DEFAULT_KCAL_TARGET } from '@/constants/app';
import { safeStorage } from '@/utils/safeStorage';
import { MealService } from '@/services/mealService';
import { useWorkoutStore } from './useWorkoutStore';
import { useMeasurementStore } from './useMeasurementStore';
import { usePrayerStore } from './usePrayerStore';
import { sessionsThisWeek } from './useAwanScore';

// ── Types ─────────────────────────────────────────────────────────────────────

export type HealthScoreLabel = 'CRITIQUE' | 'MOYEN' | 'BON' | 'OPTIMAL';

export interface HealthScoreBreakdown {
  sport:       number; // 0–30
  nutrition:   number; // 0–25
  mensuration: number; // 0–20
  islam:       number; // 0–25
}

export interface HealthScore {
  score:      number;
  scoreLabel: HealthScoreLabel;
  breakdown:  HealthScoreBreakdown;
  loading:    boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readTargetKcal(): number {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? safeStorage.get('awan.nutrition.profile')
      : null;
    const profile = JSON.parse(raw ?? '{}') as { targetKcal?: unknown };
    return typeof profile.targetKcal === 'number' ? profile.targetKcal : DEFAULT_KCAL_TARGET;
  } catch {
    return DEFAULT_KCAL_TARGET;
  }
}

function withinWeek(dateStr: string, ref: Date): boolean {
  const d = new Date(dateStr);
  const diff = ref.getTime() - d.getTime();
  return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function scoreLabelFor(score: number): HealthScoreLabel {
  if (score < 40)  return 'CRITIQUE';
  if (score < 65)  return 'MOYEN';
  if (score < 85)  return 'BON';
  return 'OPTIMAL';
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHealthScore(): HealthScore {
  const today = ds(new Date());
  const workoutStore = useWorkoutStore();
  const measureStore = useMeasurementStore();
  const prayerStore  = usePrayerStore(today);

  const [kcalToday, setKcalToday] = useState<number>(0);
  const [mealsLoading, setMealsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    MealService.getByDate(today).then(entries => {
      if (!active) return;
      setKcalToday(MealService.totals(entries).kcal);
      setMealsLoading(false);
    });
    return () => { active = false; };
  }, [today]);

  return useMemo<HealthScore>(() => {
    const targetKcal = readTargetKcal();
    const now = new Date();

    // Sport 30%
    const sessCount = sessionsThisWeek(workoutStore.sessions as Array<{ date?: string; startTime?: number }>);
    const sport = Math.min(sessCount / 4, 1) * 30;

    // Nutrition 25%
    let nutrition = 0;
    if (targetKcal > 0 && kcalToday > 0) {
      const ratio = kcalToday / targetKcal;
      if (ratio >= 0.8 && ratio <= 1.2) {
        nutrition = 25;
      } else if (ratio < 0.8) {
        nutrition = (ratio / 0.8) * 25;
      } else {
        const over = Math.min(1, (ratio - 1.2) / 0.8);
        nutrition = (1 - over) * 25;
      }
    }

    // Mensuration 20%
    const hasMeasureThisWeek = measureStore.history.some(m => withinWeek(m.date, now));
    const mensuration = hasMeasureThisWeek ? 20 : 0;

    // Islam 25%
    const islam = prayerStore.total > 0
      ? (prayerStore.doneCount / prayerStore.total) * 25
      : 0;

    const score = Math.round(Math.max(0, Math.min(100, sport + nutrition + mensuration + islam)));

    return {
      score,
      scoreLabel: scoreLabelFor(score),
      breakdown: {
        sport:       Math.round(sport),
        nutrition:   Math.round(nutrition),
        mensuration: Math.round(mensuration),
        islam:       Math.round(islam),
      },
      loading: mealsLoading || workoutStore.loading || measureStore.loading,
    };
  }, [
    workoutStore.sessions,
    workoutStore.loading,
    measureStore.history,
    measureStore.loading,
    prayerStore.doneCount,
    prayerStore.total,
    kcalToday,
    mealsLoading,
  ]);
}
