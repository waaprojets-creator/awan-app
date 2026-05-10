import type { IStorage } from '@/data/storage';
import { migrateWorkoutLog } from '@/data/schemas/sport/workoutLog';
import { type ActivityRecordLatest } from '@/data/schemas/activity/activityRecord';
import { uuid } from '@/utils/id';
import type { IActivityProvider } from './IActivityProvider';

/** Average calories per minute of workout by RPE bucket. */
const KCAL_PER_MIN: Record<string, number> = {
  low: 5,    // RPE 1–4
  medium: 8, // RPE 5–7
  high: 12,  // RPE 8–10
};

function rpeBucket(rpe: number): string {
  if (rpe <= 4) return 'low';
  if (rpe <= 7) return 'medium';
  return 'high';
}

export class WorkoutProvider implements IActivityProvider {
  readonly sourceId = 'sport.workoutLog';

  constructor(private readonly storage: IStorage) {}

  async getRecords(date: string): Promise<ActivityRecordLatest[]> {
    const keys = await this.storage.list(`sport.workoutLog`);
    const records: ActivityRecordLatest[] = [];

    for (const key of keys) {
      const log = await this.storage.get(key, migrateWorkoutLog);
      if (!log || log.date !== date) continue;

      const durationMin = log.endedAt
        ? Math.round((log.endedAt - log.startedAt) / 60_000)
        : 0;

      const avgRpe =
        log.sets.length > 0
          ? log.sets.reduce((s, x) => s + (x.rpe ?? 6), 0) / log.sets.length
          : 6;

      const caloriesKcal = durationMin * (KCAL_PER_MIN[rpeBucket(avgRpe)] ?? 8);

      records.push({
        v: 1,
        id: uuid(),
        date,
        type: 'workout',
        source: this.sourceId,
        activeMinutes: durationMin,
        caloriesKcal,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
      });
    }

    return records;
  }
}
