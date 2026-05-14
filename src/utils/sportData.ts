// Stub — remplacé par modules/sport/catalog Sprint 2
export interface ExerciseEntry {
  id?: string;
  n?: string;
  m?: string;
  eq?: string;
  d?: string;
  anim?: string;
  img?: string;
  [key: string]: unknown;
}
export interface MuscleEntry {
  l?: string;
  [key: string]: unknown;
}
export const EXERCISES: ExerciseEntry[] = [];
export const MUSCLES: Record<string, MuscleEntry> = {};
