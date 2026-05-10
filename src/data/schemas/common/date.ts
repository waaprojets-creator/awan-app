import { z } from 'zod';

/** YYYY-MM-DD */
export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type DateString = z.infer<typeof DateStringSchema>;

/** Unix epoch ms */
export const TimestampSchema = z.number().int().nonnegative();
export type Timestamp = z.infer<typeof TimestampSchema>;
