import { z } from 'zod';
import { createMigrator } from '../../migrations/runner';

export const KnowledgeDomainSchema = z.enum([
  'sport', 'nutrition', 'anthropo', 'recovery', 'morpho',
]);
export type KnowledgeDomain = z.infer<typeof KnowledgeDomainSchema>;

export const ThresholdOpSchema = z.enum(['lt', 'gt', 'between', 'eq']);
export type ThresholdOp = z.infer<typeof ThresholdOpSchema>;

export const ThresholdSeveritySchema = z.enum(['info', 'good', 'warn', 'alert']);
export type ThresholdSeverity = z.infer<typeof ThresholdSeveritySchema>;

const ThresholdSchema = z.object({
  metric: z.string().min(1),
  op: ThresholdOpSchema,
  value: z.union([z.number(), z.tuple([z.number(), z.number()])]),
  label: z.string().min(1),
  severity: ThresholdSeveritySchema,
});

const ReferenceSchema = z.object({
  citation: z.string().min(1),
  doi: z.string().optional(),
  pmcUrl: z.string().optional(),
  year: z.number().int().min(1900).max(2100),
});

// ─── V1 ───────────────────────────────────────────────────────────────────────

export const KnowledgeEntryV1Schema = z.object({
  v: z.literal(1),
  id: z.string().min(1),
  domain: KnowledgeDomainSchema,
  topic: z.string().min(1),
  summary: z.string().min(1),
  thresholds: z.array(ThresholdSchema),
  references: z.array(ReferenceSchema).min(1),
  derivedRules: z.array(z.string()),
});

export type KnowledgeEntryV1 = z.infer<typeof KnowledgeEntryV1Schema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const KnowledgeEntrySchema = z.discriminatedUnion('v', [KnowledgeEntryV1Schema]);
export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;

export const KNOWLEDGE_ENTRY_LATEST_VERSION = 1;
export type KnowledgeEntryLatest = KnowledgeEntryV1;

export const migrateKnowledgeEntry = createMigrator<KnowledgeEntry, KnowledgeEntryLatest>(
  KnowledgeEntrySchema,
  {},
  KNOWLEDGE_ENTRY_LATEST_VERSION,
);
