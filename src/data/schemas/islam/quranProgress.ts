import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const QuranProgressV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  currentSurah: z.number().int().min(1).max(114),
  currentAyah: z.number().int().min(1),
  dailyAyahTarget: z.number().int().positive(),
  lastReadDate: DateStringSchema,
  totalAyahsRead: z.number().int().nonnegative(),
  updatedAt: TimestampSchema,
});

export type QuranProgressV1 = z.infer<typeof QuranProgressV1Schema>;
export type QuranProgressLatest = QuranProgressV1;

export const QuranProgressSchema = z.discriminatedUnion('v', [QuranProgressV1Schema]);
export type QuranProgress = z.infer<typeof QuranProgressSchema>;

export const QURAN_PROGRESS_LATEST_VERSION = 1;

export const migrateQuranProgress = createMigrator<QuranProgress, QuranProgressLatest>(
  QuranProgressSchema,
  {},
  QURAN_PROGRESS_LATEST_VERSION,
);
