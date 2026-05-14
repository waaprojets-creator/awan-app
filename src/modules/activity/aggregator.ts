import type { IActivityProvider } from './providers/IActivityProvider';
import type { ActivityRecordLatest } from '@/data/schemas/activity/activityRecord';
import type { DailySummaryLatest } from '@/data/schemas/activity/dailySummary';
import { uuid } from '@/utils/id';

export function createAggregator(providers: IActivityProvider[]) {
  return {
    async aggregate(date: string): Promise<DailySummaryLatest> {
      const all: ActivityRecordLatest[] = [];
      for (const p of providers) {
        const records = await p.getRecords(date);
        all.push(...records);
      }

      return {
        v: 1,
        id: uuid(),
        date,
        generatedAt: Date.now(),
        totalSteps: sum(all, 'steps'),
        totalDistanceM: sum(all, 'distanceM'),
        totalCaloriesKcal: sum(all, 'caloriesKcal'),
        totalActiveMinutes: sum(all, 'activeMinutes'),
        records: all,
      };
    },
  };
}

function sum(records: ActivityRecordLatest[], field: keyof ActivityRecordLatest): number {
  return records.reduce((acc, r) => {
    const v = r[field];
    return acc + (typeof v === 'number' ? v : 0);
  }, 0);
}
