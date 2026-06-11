import { getStorage } from '@/data/storage/storageService';
import { migrateSleepAlarm } from '@/data/schemas/sleep/sleepAlarm';
import type { SleepAlarmLatest } from '@/data/schemas/sleep/sleepAlarm';
import { eventBus } from '@/data/events/bus';

const ALARM_PREFIX = 'sleep.alarm';

function alarmKey(alarm: SleepAlarmLatest): string {
  return `${ALARM_PREFIX}.${alarm.id}`;
}

export const SleepAlarmService = {
  async getByDate(date: string): Promise<SleepAlarmLatest[]> {
    const storage = await getStorage();
    const keys = await storage.list(`${ALARM_PREFIX}.${date}`);
    const all = await Promise.all(keys.map(k => storage.get(k, migrateSleepAlarm)));
    return all
      .filter((a): a is SleepAlarmLatest => a !== null)
      .sort((a, b) => a.timeHHMM.localeCompare(b.timeHHMM));
  },

  async save(alarm: SleepAlarmLatest): Promise<void> {
    const storage = await getStorage();
    await storage.set(alarmKey(alarm), alarm);
    eventBus.emit('sleep.alarm.modified', { date: alarm.date });
  },

  async delete(alarm: SleepAlarmLatest): Promise<void> {
    const storage = await getStorage();
    await storage.delete(alarmKey(alarm));
    eventBus.emit('sleep.alarm.modified', { date: alarm.date });
  },

  async toggle(alarm: SleepAlarmLatest): Promise<SleepAlarmLatest> {
    const updated = { ...alarm, enabled: !alarm.enabled, timestamp: Date.now() };
    await SleepAlarmService.save(updated);
    return updated;
  },
};
