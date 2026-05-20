export type ObjectifType = 'hypertrophie' | 'force' | 'endurance' | 'recomposition';

export interface GeneratorConfig {
  objectif: ObjectifType;
  niveau: 'beginner' | 'intermediate' | 'advanced';
  frequenceJours: 2 | 3 | 4 | 5 | 6;
  equipement: Array<'barbell' | 'dumbbell' | 'cable' | 'machine' | 'body only'>;
}

export interface DayTemplate {
  label: string;
  primaryMuscles: string[];
  cycleLetter: 'A' | 'B' | 'C' | 'D' | null;
}

export interface WeekTemplate {
  name: string;
  days: DayTemplate[];
}
