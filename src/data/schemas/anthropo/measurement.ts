import { z } from 'zod';
import { IdSchema } from '../common/id';
import { DateStringSchema, TimestampSchema } from '../common/date';
import { createMigrator } from '../../migrations/runner';

export const MeasurementV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  weight: z.number().nonnegative(),
  bpm_rest: z.number().nonnegative(),
  body_fat_pct: z.number().nonnegative(),
  measurements: z.record(z.string(), z.number()),
  skinfolds: z.record(z.string(), z.number()),
  savedAt: TimestampSchema,
  whtr: z.number().nonnegative().optional(),
  whr:  z.number().nonnegative().optional(),
});

export type MeasurementV1 = z.infer<typeof MeasurementV1Schema>;

// ─── V2: weight retiré + BF% pré-calculés à l'écriture pour aggregate() SQL ──
// s13_sum, bf_pct_jp7, bf_pct_dw4, ffmi stockés top-level → SUM/AVG SQL sans itérer skinfolds

export const MeasurementV2Schema = z.object({
  v: z.literal(2),
  id: IdSchema,
  date: DateStringSchema,
  bpm_rest: z.number().nonnegative(),
  body_fat_pct: z.number().nonnegative(),
  measurements: z.record(z.string(), z.number()),
  skinfolds: z.record(z.string(), z.number()),
  savedAt: TimestampSchema,
  whtr: z.number().nonnegative().optional(),
  whr:  z.number().nonnegative().optional(),
  s13_sum: z.number().nonnegative().nullable().optional(),     // somme 13 plis (mm)
  bf_pct_jp7: z.number().nonnegative().nullable().optional(),  // Jackson-Pollock 7 sites
  bf_pct_dw4: z.number().nonnegative().nullable().optional(),  // Durnin-Womersley 4 sites
  ffmi: z.number().nonnegative().nullable().optional(),        // FFMI normalisé (Kouri 1995)
  // measurements{} conserve la convention _left/_right pour symmetryService.analyzeSymmetry()
});

export type MeasurementV2 = z.infer<typeof MeasurementV2Schema>;

// ─── V3: measurements{} → circumferences typé (TrialTuple), skinfolds → structured ──
// bpm_rest délibérément supprimé (migré dans WeightEntry)

const TrialSchema = z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]);

// Exporter pour que measurementService puisse calculer la médiane
export type TrialTuple = z.infer<typeof TrialSchema>;

export const CIRCUMFERENCE_KEYS = ['neck', 'chest', 'waist', 'hips',
  'arm_left', 'arm_right', 'forearm_left', 'forearm_right',
  'thigh_left', 'thigh_right', 'calf_left', 'calf_right'] as const;
export type CircumferenceKey = typeof CIRCUMFERENCE_KEYS[number];

export const SKINFOLD_KEYS = ['pectoral', 'axillaire', 'triceps', 'subscapular',
  'abdominal', 'suprailiac', 'thigh_anterior', 'biceps',
  'calf_medial', 'supraspinal', 'abdominal_lateral', 'thigh_lateral', 'forearm'] as const;
export type SkinfoldKey = typeof SKINFOLD_KEYS[number];

export const MeasurementV3Schema = z.object({
  v: z.literal(3),
  date: DateStringSchema,
  timezone: z.string().default('UTC'),

  circumferences: z.object({
    neck:          TrialSchema.optional(),
    chest:         TrialSchema.optional(),
    waist:         TrialSchema.optional(),
    hips:          TrialSchema.optional(),
    arm_left:      TrialSchema.optional(),
    arm_right:     TrialSchema.optional(),
    forearm_left:  TrialSchema.optional(),
    forearm_right: TrialSchema.optional(),
    thigh_left:    TrialSchema.optional(),
    thigh_right:   TrialSchema.optional(),
    calf_left:     TrialSchema.optional(),
    calf_right:    TrialSchema.optional(),
  }).optional(),

  skinfolds: z.object({
    pectoral:           TrialSchema.optional(),
    axillaire:          TrialSchema.optional(),
    triceps:            TrialSchema.optional(),
    subscapular:        TrialSchema.optional(),
    abdominal:          TrialSchema.optional(),
    suprailiac:         TrialSchema.optional(),
    thigh_anterior:     TrialSchema.optional(),
    biceps:             TrialSchema.optional(),
    calf_medial:        TrialSchema.optional(),
    supraspinal:        TrialSchema.optional(),
    abdominal_lateral:  TrialSchema.optional(),
    thigh_lateral:      TrialSchema.optional(),
    forearm:            TrialSchema.optional(),
  }).optional(),

  // Agrégats pré-calculés (médiane des essais → formules biométriques)
  body_fat_pct:  z.number().nonnegative().optional(),
  s13_sum:       z.number().nonnegative().nullable().optional(),
  bf_pct_jp7:    z.number().nonnegative().nullable().optional(),
  bf_pct_dw4:    z.number().nonnegative().nullable().optional(),
  ffmi:          z.number().nonnegative().nullable().optional(),
  whtr:          z.number().nonnegative().optional(),
  whr:           z.number().nonnegative().optional(),

  savedAt: TimestampSchema,
});

export type MeasurementV3 = z.infer<typeof MeasurementV3Schema>;
export type MeasurementLatest = MeasurementV3;

export const MeasurementSchema = z.discriminatedUnion('v', [
  MeasurementV1Schema,
  MeasurementV2Schema,
  MeasurementV3Schema,
]);
export type Measurement = z.infer<typeof MeasurementSchema>;

export const MEASUREMENT_LATEST_VERSION = 3;

const measurementMigrations = {
  1: (data: MeasurementV1): MeasurementV2 => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { weight: _w, ...rest } = data;
    return {
      ...rest,
      v: 2,
      s13_sum: null,
      bf_pct_jp7: null,
      bf_pct_dw4: null,
      ffmi: null,
    };
  },
  2: (data: MeasurementV2): MeasurementV3 => {
    // Convertit le flat record measurements{} → circumferences typé (valeur unique → triple)
    const m = data.measurements ?? {};
    const circumferences: MeasurementV3['circumferences'] = {};
    const CIRC_MAP: Record<string, CircumferenceKey> = {
      neck: 'neck', chest: 'chest', waist: 'waist',
      hips: 'hips', hip: 'hips', hanches: 'hips',  // aliases legacy
      arm_left: 'arm_left', arm_right: 'arm_right',
      forearm_left: 'forearm_left', forearm_right: 'forearm_right',
      thigh_left: 'thigh_left', thigh_right: 'thigh_right',
      calf_left: 'calf_left', calf_right: 'calf_right',
    };
    for (const [k, v] of Object.entries(m)) {
      const target = CIRC_MAP[k];
      if (target && typeof v === 'number' && v > 0) {
        circumferences[target] = [v, v, v];
      }
    }

    // Convertit le flat record skinfolds{} → structured (valeur unique → triple)
    const sf = data.skinfolds ?? {};
    const skinfolds: MeasurementV3['skinfolds'] = {};
    const SF_MAP: Record<string, SkinfoldKey> = {
      pectoral: 'pectoral', axillaire: 'axillaire', triceps: 'triceps',
      subscapular: 'subscapular', subscapulaire: 'subscapular',  // alias legacy
      abdominal: 'abdominal', suprailiac: 'suprailiac',
      thigh_anterior: 'thigh_anterior', cuisse_ant: 'thigh_anterior',  // alias legacy
      biceps: 'biceps', calf_medial: 'calf_medial', mollet_med: 'calf_medial',  // alias
      supraspinal: 'supraspinal', supraspinale: 'supraspinal',
      abdominal_lateral: 'abdominal_lateral', abdominal_lat: 'abdominal_lateral',
      thigh_lateral: 'thigh_lateral', cuisse_lat: 'thigh_lateral',
      forearm: 'forearm', avant_bras: 'forearm',
    };
    for (const [k, v] of Object.entries(sf)) {
      const target = SF_MAP[k];
      if (target && typeof v === 'number' && v > 0) {
        skinfolds[target] = [v, v, v];
      }
    }

    return {
      v: 3,
      date: data.date,
      timezone: 'UTC',
      circumferences: Object.keys(circumferences).length > 0 ? circumferences : undefined,
      skinfolds: Object.keys(skinfolds).length > 0 ? skinfolds : undefined,
      body_fat_pct: data.body_fat_pct,
      s13_sum: data.s13_sum ?? null,
      bf_pct_jp7: data.bf_pct_jp7 ?? null,
      bf_pct_dw4: data.bf_pct_dw4 ?? null,
      ffmi: data.ffmi ?? null,
      whtr: data.whtr,
      whr: data.whr,
      savedAt: data.savedAt,
      // bpm_rest délibérément supprimé (migré dans WeightEntry)
    };
  },
};

export const migrateMeasurement = createMigrator<Measurement, MeasurementLatest>(
  MeasurementSchema,
  measurementMigrations,
  MEASUREMENT_LATEST_VERSION,
);
