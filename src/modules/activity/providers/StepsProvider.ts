import type { IStorage } from '@/data/storage';
import { migrateActivityRecord, type ActivityRecordLatest } from '@/data/schemas/activity/activityRecord';
import type { IActivityProvider } from './IActivityProvider';

const PREFIX = 'activity.steps';

export class StepsProvider implements IActivityProvider {
  readonly sourceId = 'device.pedometer';

  constructor(private readonly storage: IStorage) {}

  async getRecords(date: string): Promise<ActivityRecordLatest[]> {
    const keys = await this.storage.list(`${PREFIX}.${date}`);
    const records: ActivityRecordLatest[] = [];
    for (const key of keys) {
      const r = await this.storage.get(key, migrateActivityRecord);
      if (r) records.push(r);
    }
    return records;
  }
}
