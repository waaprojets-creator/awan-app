import { z } from 'zod';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const AnthropoProfileV1Schema = z.object({
  v:             z.literal(1),
  date:          DateStringSchema,
  timezone:      z.string().default('UTC'),
  sex:           z.enum(['male', 'female']),
  birthDate:     DateStringSchema,
  heightCm:      z.number().positive(),
  boneStructure: z.enum(['small', 'medium', 'large']).optional(),
  armLengthCm: z.object({
    left:  z.number().positive().optional(),
    right: z.number().positive().optional(),
  }).optional(),
  legLengthCm: z.object({
    left:  z.number().positive().optional(),
    right: z.number().positive().optional(),
  }).optional(),
  savedAt: TimestampSchema,
});

export type AnthropoProfileV1 = z.infer<typeof AnthropoProfileV1Schema>;
export type AnthropoProfileLatest = AnthropoProfileV1;

export const AnthropoProfileSchema = z.discriminatedUnion('v', [AnthropoProfileV1Schema]);
export type AnthropoProfile = z.infer<typeof AnthropoProfileSchema>;

export const ANTHROPO_PROFILE_LATEST_VERSION = 1;

export const migrateAnthropoProfile = createMigrator<AnthropoProfile, AnthropoProfileLatest>(
  AnthropoProfileSchema,
  {},
  ANTHROPO_PROFILE_LATEST_VERSION,
);

/** Computes integer age in years from an ISO birthDate string to a reference date (defaults to today). */
export function computeAge(birthDate: string, referenceDate?: string): number {
  const ref = referenceDate ?? new Date().toISOString().slice(0, 10);
  const [ry, rm, rd] = ref.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number];
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age;
}
