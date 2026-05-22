import type { IStorage } from '@/data/storage';
import { eventBus } from '@/data/events/bus';
import type { ScheduleTaskLatest, TaskDomain } from '@/data/schemas/planning/scheduleTask';
import { migrateDaySchedule, type DayScheduleLatest } from '@/data/schemas/planning/daySchedule';
import { migrateScheduleTask } from '@/data/schemas/planning/scheduleTask';
import { buildSchedule, type SchedulerConfig } from './engine/greedy';
import { uuid } from '@/utils/id';

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

  /**
   * Create a recurring system task (idempotent by id).
   * If the id already exists, the call is a no-op (no duplicate).
   * Tags: ['system', 'recurring', 'every:<recurringDays>'] are added automatically.
   */
  async createSystemTask(params: {
    id: string;
    title: string;
    domain: TaskDomain;
    durationMin: number;
    recurringDays?: number;
    priority?: 1 | 2 | 3 | 4 | 5;
  }): Promise<void> {
    const existing = await this.storage.get(`${TASKS_PREFIX}.${params.id}`, migrateScheduleTask);
    if (existing) return;

    const tags = ['system', 'recurring'];
    if (params.recurringDays) tags.push(`every:${params.recurringDays}`);

    const task: ScheduleTaskLatest = {
      v: 2,
      id: params.id,
      title: params.title,
      domain: params.domain,
      durationMin: params.durationMin,
      priority: params.priority ?? 1,
      tags,
      dependsOn: [],
      enabled: true,
    };

    await this.saveTask(task);
  }
}
