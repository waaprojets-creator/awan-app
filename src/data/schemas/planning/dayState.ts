import { z } from 'zod';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

// ─────────────────────────────────────────────────────────────────────────────
// États de vie — segments intra-journée.
//
// À un instant donné l'utilisateur est dans UN état. Une journée est partitionnée
// en segments horaires contigus couvrant 00:00→24:00 (1440 min). Les états « jour
// entier » (vacances, malade) = un seul segment 0..1440. État par défaut : libre.
//
// `schedulable` : le scheduler peut-il placer une tâche pendant cet état ?
//   endormi/travail/malade → non · vacances/libre → oui.
// ─────────────────────────────────────────────────────────────────────────────

export const LIFE_STATES = ['endormi', 'travail', 'malade', 'vacances', 'libre'] as const;
export const LifeStateSchema = z.enum(LIFE_STATES);
export type LifeState = z.infer<typeof LifeStateSchema>;

export interface LifeStateMeta {
  label: string;
  schedulable: boolean;
}

export const LIFE_STATE_META: Record<LifeState, LifeStateMeta> = {
  endormi:  { label: 'Endormi',  schedulable: false },
  travail:  { label: 'Travail',  schedulable: false },
  malade:   { label: 'Malade',   schedulable: false },
  vacances: { label: 'Vacances', schedulable: true },
  libre:    { label: 'Libre',    schedulable: true },
};

export const StateSegmentSchema = z.object({
  state: LifeStateSchema,
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(1).max(1440),
}).refine(s => s.endMin > s.startMin, { message: 'endMin doit être > startMin' });
export type StateSegment = z.infer<typeof StateSegmentSchema>;

// ─── V1 ───────────────────────────────────────────────────────────────────────
// Clé : planning.state.{YYYY-MM-DD}  (un enregistrement par jour)

export const DayStateV1Schema = z.object({
  v: z.literal(1),
  date: DateStringSchema,
  timezone: z.string().default('UTC'),
  /** Partition ordonnée, contiguë, couvrant 0..1440. */
  segments: z.array(StateSegmentSchema),
  savedAt: TimestampSchema,
});

export type DayStateV1 = z.infer<typeof DayStateV1Schema>;
export type DayStateLatest = DayStateV1;

export const DayStateSchema = z.discriminatedUnion('v', [DayStateV1Schema]);
export type DayState = z.infer<typeof DayStateSchema>;

export const DAY_STATE_LATEST_VERSION = 1;

export const migrateDayState = createMigrator<DayState, DayStateLatest>(
  DayStateSchema,
  {},
  DAY_STATE_LATEST_VERSION,
);
