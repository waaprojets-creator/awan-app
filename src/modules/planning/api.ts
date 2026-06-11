import type { IStorage } from '@/data/storage';
import { eventBus } from '@/data/events/bus';
import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import { migrateDaySchedule, type DayScheduleLatest } from '@/data/schemas/planning/daySchedule';
import { migrateScheduleTask } from '@/data/schemas/planning/scheduleTask';
import { buildSchedule, type SchedulerConfig } from './engine/greedy';
import { dateId } from '@/utils/id';

const TASKS_PREFIX = 'planning.task';
const SCHEDULE_PREFIX = 'planning.schedule';

function scheduleKey(date: string): string {
  return `${SCHEDULE_PREFIX}.${date}`;
}

function taskKey(task: ScheduleTaskLatest): string {
  return `${TASKS_PREFIX}.${task.id}`;
}

export class Planner {
  constructor(
    private readonly storage: IStorage,
    private readonly config: Partial<SchedulerConfig> = {},
  ) {}

  async saveTask(task: ScheduleTaskLatest): Promise<void> {
    await this.storage.set(taskKey(task), task);
  }

  async deleteTask(id: string): Promise<void> {
    await this.storage.delete(`${TASKS_PREFIX}.${id}`);
  }

  async getTasksByDate(date: string): Promise<ScheduleTaskLatest[]> {
    const keys = await this.storage.list(`${TASKS_PREFIX}.${date}`);
    const tasks: ScheduleTaskLatest[] = [];
    for (const k of keys) {
      const t = await this.storage.get(k, migrateScheduleTask);
      if (t) tasks.push(t);
    }
    return tasks;
  }

  async getActiveTasks(): Promise<ScheduleTaskLatest[]> {
    const keys = await this.storage.listFiltered(TASKS_PREFIX, { status: 'active' });
    const tasks: ScheduleTaskLatest[] = [];
    for (const k of keys) {
      const t = await this.storage.get(k, migrateScheduleTask);
      if (t) tasks.push(t);
    }
    return tasks;
  }

  async optimize(date: string): Promise<DayScheduleLatest> {
    const tasks = await this.getActiveTasks();
    const schedule = buildSchedule(date, tasks, this.config);
    await this.storage.set(scheduleKey(date), schedule);
    eventBus.emit('planning.optimized', { date });
    return schedule;
  }

  async getSchedule(date: string): Promise<DayScheduleLatest | null> {
    return this.storage.get(scheduleKey(date), migrateDaySchedule);
  }

  async preview(date: string, tasks: ScheduleTaskLatest[]): Promise<DayScheduleLatest> {
    return buildSchedule(date, tasks, this.config);
  }

  async createTask(params: {
    title: string;
    domain: string;
    durationMin: number;
    priority?: 1 | 2 | 3;
    scheduledDate?: string;
    timeHHMM?: string;
    tags?: string[];
    dependsOn?: string[];
  }): Promise<ScheduleTaskLatest> {
    const today = new Date().toISOString().slice(0, 10);
    const task: ScheduleTaskLatest = {
      v: 4,
      id: dateId(today),
      date: today,
      scheduledDate: params.scheduledDate,
      title: params.title,
      domain: params.domain,
      durationMin: params.durationMin,
      priority: params.priority ?? 3,
      tags: params.tags ?? [],
      timeHHMM: params.timeHHMM,
      dependsOn: params.dependsOn ?? [],
      status: params.scheduledDate ? 'active' : null,
      timeCategory: null,
    };
    await this.saveTask(task);
    return task;
  }
}
