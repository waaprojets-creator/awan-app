import type { WeekTemplate } from './types';

export function getTemplate(frequenceJours: 2 | 3 | 4 | 5 | 6): WeekTemplate {
  switch (frequenceJours) {
    case 2:
      return {
        name: 'FULL BODY 2',
        days: [
          { label: 'FULL BODY A', primaryMuscles: ['chest', 'back', 'shoulders', 'triceps', 'biceps', 'quads'], cycleLetter: 'A' },
          { label: 'FULL BODY B', primaryMuscles: ['chest', 'back', 'hamstrings', 'glutes', 'calves', 'abs'], cycleLetter: 'B' },
        ],
      };
    case 3:
      return {
        name: 'PUSH / PULL / LEGS',
        days: [
          { label: 'PUSH', primaryMuscles: ['chest', 'shoulders', 'triceps'], cycleLetter: 'A' },
          { label: 'PULL', primaryMuscles: ['back', 'biceps'], cycleLetter: 'B' },
          { label: 'LEGS', primaryMuscles: ['quads', 'hamstrings', 'calves', 'glutes'], cycleLetter: 'C' },
        ],
      };
    case 4:
      return {
        name: 'UPPER / LOWER',
        days: [
          { label: 'UPPER A', primaryMuscles: ['chest', 'back', 'shoulders', 'biceps'], cycleLetter: 'A' },
          { label: 'LOWER A', primaryMuscles: ['quads', 'hamstrings', 'calves', 'glutes'], cycleLetter: 'B' },
          { label: 'UPPER B', primaryMuscles: ['chest', 'back', 'shoulders', 'triceps'], cycleLetter: 'C' },
          { label: 'LOWER B', primaryMuscles: ['quads', 'hamstrings', 'abs'], cycleLetter: 'D' },
        ],
      };
    case 5:
      return {
        name: 'PPL + BRAS / ÉPAULES',
        days: [
          { label: 'PUSH', primaryMuscles: ['chest', 'shoulders', 'triceps'], cycleLetter: 'A' },
          { label: 'PULL', primaryMuscles: ['back', 'biceps'], cycleLetter: 'B' },
          { label: 'LEGS', primaryMuscles: ['quads', 'hamstrings', 'calves', 'glutes'], cycleLetter: 'C' },
          { label: 'BRAS', primaryMuscles: ['biceps', 'triceps'], cycleLetter: 'D' },
          { label: 'ÉPAULES / ABS', primaryMuscles: ['shoulders', 'abs'], cycleLetter: null },
        ],
      };
    case 6:
      return {
        name: 'PPL × 2',
        days: [
          { label: 'PUSH A', primaryMuscles: ['chest', 'shoulders', 'triceps'], cycleLetter: 'A' },
          { label: 'PULL A', primaryMuscles: ['back', 'biceps'], cycleLetter: 'B' },
          { label: 'LEGS A', primaryMuscles: ['quads', 'hamstrings', 'calves', 'glutes'], cycleLetter: 'C' },
          { label: 'PUSH B', primaryMuscles: ['chest', 'shoulders', 'triceps'], cycleLetter: 'D' },
          { label: 'PULL B', primaryMuscles: ['back', 'biceps'], cycleLetter: null },
          { label: 'LEGS B', primaryMuscles: ['quads', 'hamstrings', 'abs'], cycleLetter: null },
        ],
      };
  }
}
