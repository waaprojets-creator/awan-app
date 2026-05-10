import type { IStorage, ParseFn } from '@/data/storage';
import type { Domain } from '@/data/schemas/coach/rule';

/**
 * Source resolver: given a storage source key (e.g. 'sport.workoutLog'), returns
 * a parser for the entries stored under that prefix. Lets the engine read & migrate
 * heterogeneous record types via a single registry lookup.
 */
export type SourceResolver = (source: string) => ParseFn<unknown>;

export interface CoachContext {
  storage: IStorage;
  resolveSource: SourceResolver;
  /** ISO YYYY-MM-DD date the assessment is anchored on */
  date: string;
}

export interface DomainSignalContext {
  domain: Domain;
  /** signal-id → numeric value */
  values: Record<string, number>;
}
