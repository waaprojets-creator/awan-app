import { useState, useEffect, useCallback } from 'react';
import { SleepAlarmService } from '@/services/sleepAlarmService';
import type { SleepAlarmLatest } from '@/data/schemas/sleep/sleepAlarm';
import { eventBus } from '@/data/events/bus';

export function useSleepAlarmStore(date: string) {
  const [alarms, setAlarms] = useState<SleepAlarmLatest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await SleepAlarmService.getByDate(date);
    setAlarms(data);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    void load();
    const unsub = eventBus.on('sleep.alarm.modified', (e) => {
      if (e.date === date) void load();
    });
    return unsub;
  }, [date, load]);

  const save = useCallback(async (alarm: SleepAlarmLatest): Promise<void> => {
    await SleepAlarmService.save(alarm);
    setAlarms(prev => {
      const idx = prev.findIndex(a => a.id === alarm.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = alarm;
        return next.sort((a, b) => a.timeHHMM.localeCompare(b.timeHHMM));
      }
      return [...prev, alarm].sort((a, b) => a.timeHHMM.localeCompare(b.timeHHMM));
    });
  }, []);

  const remove = useCallback(async (alarm: SleepAlarmLatest): Promise<void> => {
    await SleepAlarmService.delete(alarm);
    setAlarms(prev => prev.filter(a => a.id !== alarm.id));
  }, []);

  const toggle = useCallback(async (alarm: SleepAlarmLatest): Promise<void> => {
    const updated = await SleepAlarmService.toggle(alarm);
    setAlarms(prev => prev.map(a => a.id === updated.id ? updated : a));
  }, []);

  return { alarms, loading, save, remove, toggle };
}
