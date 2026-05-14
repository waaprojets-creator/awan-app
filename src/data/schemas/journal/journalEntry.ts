import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const JournalEntryV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  content: z.string().min(1),
  mood: z.number().int().min(1).max(5),
  module: z.string(),
  tags: z.array(z.string()),
  timestamp: TimestampSchema,
});

export type JournalEntryV1 = z.infer<typeof JournalEntryV1Schema>;
export type JournalEntryLatest = JournalEntryV1;

export const JournalEntrySchema = z.discriminatedUnion('v', [JournalEntryV1Schema]);
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const JOURNAL_ENTRY_LATEST_VERSION = 1;

export const migrateJournalEntry = createMigrator<JournalEntry, JournalEntryLatest>(
  JournalEntrySchema,
  {},
  JOURNAL_ENTRY_LATEST_VERSION,
);
