import type { ActivityRecordLatest } from '@/data/schemas/activity/activityRecord';

export interface IActivityProvider {
  readonly sourceId: string;
  getRecords(date: string): Promise<ActivityRecordLatest[]>;
}
