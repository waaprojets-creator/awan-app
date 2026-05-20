import { z } from 'zod';

/**
 * Signal: a query against stored data, producing a numeric value.
 *
 *   type    'count' | 'sum' | 'avg' | 'latest' | 'trend'
 *   source  Storage key prefix (e.g. 'sport.workoutLog')
 *   field   Field name to aggregate (sum/avg/latest/trend) — ignored for count
 *   window  Time range relative to the assessment date
 *   filter  Optional equality predicate on the parsed records
 */
export const SignalSchema = z.object({
  type: z.enum(['count', 'sum', 'avg', 'latest', 'trend', 'ratio']),
  source: z.string().min(1),
  field: z.string().optional(),
  window: z.object({
    days: z.number().int().positive(),
  }),
  ratioWindow: z.object({
    days: z.number().int().positive(),
  }).optional(),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type Signal = z.infer<typeof SignalSchema>;

export const ConditionOpSchema = z.enum(['lt', 'lte', 'gt', 'gte', 'eq', 'neq', 'between']);
export type ConditionOp = z.infer<typeof ConditionOpSchema>;

export const ConditionSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('lt'),  value: z.number() }),
  z.object({ op: z.literal('lte'), value: z.number() }),
  z.object({ op: z.literal('gt'),  value: z.number() }),
  z.object({ op: z.literal('gte'), value: z.number() }),
  z.object({ op: z.literal('eq'),  value: z.number() }),
  z.object({ op: z.literal('neq'), value: z.number() }),
  z.object({ op: z.literal('between'), min: z.number(), max: z.number() }),
]);

export type Condition = z.infer<typeof ConditionSchema>;
