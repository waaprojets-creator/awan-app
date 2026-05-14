import type { IStorage } from '@/data/storage';
import { eventBus } from '@/data/events/bus';
import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import { migrateDaySchedule, type DayScheduleLatest } from '@/data/schemas/planning/daySchedule';
import { migrateScheduleTask } from '@/data/schemas/planning/scheduleTask';
import { buildSchedule, type SchedulerConfig } from './engine/greedy';

const TASKS_PREFIX = 'planning.task';
const SCHEDULE_PREFIX = 'planning.schedule';

function scheduleKey(date: string): string {
  return `${SCHEDULE_PREFIX}.${date}`;
}

export class Planner {
  constructor(
    private readonly storage: IStorage,
    private readonly config: Partial<SchedulerConfig> = {},
  ) {}

  /** Add or replace a task in storage. */
  async saveTask(task: ScheduleTaskLatest): Promise<void> {
    await this.storage.set(`${TASKS_PREFIX}.${task.id}`, task);
  }

  async deleteTask(id: string): Promise<void> {
    await this.storage.delete(`${TASKS_PREFIX}.${id}`);
  }

  async getTasks(): Promise<ScheduleTaskLatest[]> {
    const keys = await this.storage.list(TASKS_PREFIX);
    const tasks: ScheduleTaskLatest[] = [];
    for (const k of keys) {
      const t = await this.storage.get(k, migrateScheduleTask);
      if (t) tasks.push(t);
    }
    return tasks;
  }

  /**
   * Build and persist a daily schedule for `date`.
   * Emits 'planning.optimized' on the EventBus.
   */
  async optimize(date: string): Promise<DayScheduleLatest> {
    const tasks = await this.getTasks();
    const schedule = buildSchedule(date, tasks, this.config);
    await this.storage.set(scheduleKey(date), schedule);
    eventBus.emit('planning.optimized', { date });
    return schedule;
  }

  async getSchedule(date: string): Promise<DayScheduleLatest | null> {
    return this.storage.get(scheduleKey(date), migrateDaySchedule);
  }

  /**
   * Convenience: optimize given a custom task list (bypasses storage).
   * Useful for previewing a schedule without persisting tasks.
   */
  async preview(date: string, tasks: ScheduleTaskLatest[]): Promise<DayScheduleLatest> {
    return buildSchedule(date, tasks, this.config);
  }
}
