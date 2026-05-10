import { z, ZodSchema } from 'zod';

/**
 * A migration step: transforms data from version N to version N+1.
 * Receives raw (unparsed) data so it can access fields that may not exist in the latest schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MigrationFn = (data: any) => unknown;

/**
 * Map of fromVersion → migration function.
 * Key N means: "migrate data currently at version N to version N+1".
 */
type MigrationMap = Record<number, MigrationFn>;

/**
 * Creates a typed parse+migrate function for a versioned schema.
 *
 * Usage:
 *   const migrateWorkoutLog = createMigrator(WorkoutLogSchema, migrations, LATEST_VERSION);
 *   const log = migrateWorkoutLog(rawJson);  // always returns TLatest
 *
 * @param schema    - Discriminated-union Zod schema covering ALL versions
 * @param migrations - Map from version number → upgrade function
 * @param latestVersion - The version that TLatest represents
 */
export function createMigrator<TUnion, TLatest extends TUnion>(
  schema: ZodSchema<TUnion>,
  migrations: MigrationMap,
  latestVersion: number,
): (raw: unknown) => TLatest {
  return function migrate(raw: unknown): TLatest {
    // First pass: parse with the union schema to get the version
    const parsed = schema.parse(raw);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = parsed;

    // Walk the migration chain until we reach the latest version
    while ((data as { v: number }).v < latestVersion) {
      const currentVersion: number = (data as { v: number }).v;
      const step = migrations[currentVersion];
      if (!step) {
        throw new Error(
          `No migration defined from version ${currentVersion} to ${currentVersion + 1}`,
        );
      }
      data = step(data);
    }

    return data as TLatest;
  };
}
