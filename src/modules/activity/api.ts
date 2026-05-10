import type { IStorage } from '@/data/storage';
import { eventBus } from '@/data/events/bus';
import { migrateDailySummary, type DailySummaryLatest } from '@/data/schemas/activity/dailySummary';
import { StepsProvider } from './providers/StepsProvider';
import { WorkoutProvider } from './providers/WorkoutProvider';
import { createAggregator } from './aggregator';
import type { IActivityProvider } from './providers/IActivityProvider';

const SUMMARY_PREFIX = 'activity.summary';

export class ActivityService {
  private readonly aggregator: ReturnType<typeof createAggregator>;

  constructor(
    private readonly storage: IStorage,
    extraProviders: IActivityProvider[] = [],
  ) {
    this.aggregator = createAggregator([
      new StepsProvider(storage),
      new WorkoutProvider(storage),
      ...extraProviders,
    ]);
  }

  async summarize(date: string): Promise<DailySummaryLatest> {
    const summary = await this.aggregator.aggregate(date);
    await this.storage.set(`${SUMMARY_PREFIX}.${date}`, summary);

    if (summary.totalSteps > 0) {
      eventBus.emit('steps.updated', { date, steps: summary.totalSteps });
    }

    return summary;
  }

  async getSummary(date: string): Promise<DailySummaryLatest | null> {
    return this.storage.get(`${SUMMARY_PREFIX}.${date}`, migrateDailySummary);
  }
}
