import { z } from 'zod';
import type { IStorage, ParseFn } from '@/data/storage';
import { migrators, type MigratorKey } from '@/data/migrations/registry';
import { eventBus } from '@/data/events/bus';
import {
  AssessmentLatest,
  migrateAssessment,
} from '@/data/schemas/coach/assessment';
import type { Domain, RuleLatest } from '@/data/schemas/coach/rule';

import { runEngine } from './engine';
import { loadDefaultRules } from './rulesLoader';
import { loadDefaultForecastGenerators, type ForecastGenerator } from './forecasts';
import type { CoachContext, SourceResolver } from './types';

export interface CoachOptions {
  storage: IStorage;
  rules?: RuleLatest[];
  resolveSource?: SourceResolver;
  forecastGenerators?: ForecastGenerator[];
}

const ALL_DOMAINS: Domain[] = ['sport', 'nutrition', 'anthropo', 'sleep', 'cross'];

/**
 * Default source resolver: uses the migrators registry when a key is known,
 * otherwise treats records as opaque records (z.record passthrough). The
 * latter lets rules read freshly-introduced sources before their schemas
 * are formalized — analyzer never trusts unknown fields, only reads numbers.
 */
function defaultResolver(): SourceResolver {
  const passthrough: ParseFn<unknown> = (raw) =>
    z.record(z.unknown()).parse(raw);
  return (source: string): ParseFn<unknown> => {
    if (source in migrators) {
      const key = source as MigratorKey;
      return migrators[key] as ParseFn<unknown>;
    }
    return passthrough;
  };
}

function assessmentKey(date: string, domain: Domain): string {
  return `coach.assessment.${date}.${domain}`;
}

export class Coach {
  private readonly storage: IStorage;
  private readonly rules: RuleLatest[];
  private readonly resolveSource: SourceResolver;
  private readonly forecastGenerators: ForecastGenerator[];
  private unsubscribers: Array<() => void> = [];

  constructor(opts: CoachOptions) {
    this.storage = opts.storage;
    this.rules = opts.rules ?? loadDefaultRules();
    this.resolveSource = opts.resolveSource ?? defaultResolver();
    this.forecastGenerators = opts.forecastGenerators ?? loadDefaultForecastGenerators();
  }

  /** Run engine for one domain on a given date and persist the assessment. */
  async run(
    domain: Domain,
    date: string,
    sourceCache = new Map<string, Record<string, unknown>[]>(),
  ): Promise<AssessmentLatest> {
    const ctx: CoachContext = {
      storage: this.storage,
      resolveSource: this.resolveSource,
      date,
      sourceCache,
    };
    const assessment = await runEngine(domain, this.rules, ctx, this.forecastGenerators);
    await this.storage.set(assessmentKey(date, domain), assessment);
    eventBus.emit('coach.assessment.ready', { domain, date });
    return assessment;
  }

  async runAll(date: string): Promise<AssessmentLatest[]> {
    const sourceCache = new Map<string, Record<string, unknown>[]>();
    const out: AssessmentLatest[] = [];
    for (const d of ALL_DOMAINS) {
      out.push(await this.run(d, date, sourceCache));
    }
    return out;
  }

  async getAssessment(date: string, domain: Domain): Promise<AssessmentLatest | null> {
    return this.storage.get(assessmentKey(date, domain), migrateAssessment);
  }

  /**
   * Wires EventBus → engine. Returns an unsubscribe function.
   * - workout.completed / meal.logged / measurement.recorded → run domain
   * - day.ended → run all domains (incl. correlator)
   */
  subscribe(): () => void {
    const offs = [
      eventBus.on('workout.completed', ({ date }) => { void this.run('sport', date); }),
      eventBus.on('meal.logged',       ({ date }) => { void this.run('nutrition', date); }),
      eventBus.on('measurement.recorded', ({ date }) => { void this.run('anthropo', date); }),
      eventBus.on('day.ended',         ({ date }) => { void this.runAll(date); }),
    ];
    this.unsubscribers.push(...offs);
    return () => {
      for (const o of offs) o();
      this.unsubscribers = this.unsubscribers.filter((u) => !offs.includes(u));
    };
  }

  unsubscribeAll(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
  }
}

export type { AssessmentLatest, RuleLatest };
