import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const PerfSnapshotV1Schema = z.object({
  v:              z.literal(1),
  id:             IdSchema,
  date:           DateStringSchema,
  timestamp:      TimestampSchema,
  boot_ms:        z.number().nonnegative().nullable(),
  hydration_ms:   z.number().nonnegative().nullable(),
  fps_p50:        z.number().nonnegative().nullable(),
  fps_p5:         z.number().nonnegative().nullable(),
  jank_count:     z.number().int().nonnegative(),
  db_bytes:       z.number().int().nonnegative(),
  row_counts:     z.record(z.string(), z.number().int().nonnegative()),
  io_list_ms:     z.record(z.string(), z.number().nonnegative()),
  error_count:    z.number().int().nonnegative(),
  error_messages: z.array(z.string()),
});

export type PerfSnapshotV1 = z.infer<typeof PerfSnapshotV1Schema>;
export type PerfSnapshotLatest = PerfSnapshotV1;

export const PerfSnapshotSchema = z.discriminatedUnion('v', [PerfSnapshotV1Schema]);
export type PerfSnapshot = z.infer<typeof PerfSnapshotSchema>;

export const PERF_SNAPSHOT_LATEST_VERSION = 1;

export const migratePerfSnapshot = createMigrator<PerfSnapshot, PerfSnapshotLatest>(
  PerfSnapshotSchema,
  {},
  PERF_SNAPSHOT_LATEST_VERSION,
);
