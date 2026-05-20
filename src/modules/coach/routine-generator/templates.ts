import { L } from '@/constants/labels';
import type { WeekTemplate } from './types';

const G = L.generator;

export function getTemplate(frequenceJours: 2 | 3 | 4 | 5 | 6): WeekTemplate {
  switch (frequenceJours) {
    case 2:
      return {
        name: G.templates.fullBody2,
        days: [
          { label: G.days.fullBodyA, primaryMuscles: ['chest', 'back', 'shoulders', 'triceps', 'biceps', 'quads'], cycleLetter: 'A' },
          { label: G.days.fullBodyB, primaryMuscles: ['chest', 'back', 'hamstrings', 'glutes', 'calves', 'abs'], cycleLetter: 'B' },
        ],
      };
    case 3:
      return {
        name: G.templates.ppl3,
        days: [
          { label: G.days.push, primaryMuscles: ['chest', 'shoulders', 'triceps'], cycleLetter: 'A' },
          { label: G.days.pull, primaryMuscles: ['back', 'biceps'], cycleLetter: 'B' },
          { label: G.days.legs, primaryMuscles: ['quads', 'hamstrings', 'calves', 'glutes'], cycleLetter: 'C' },
        ],
      };
    case 4:
      return {
        name: G.templates.upperLower4,
        days: [
          { label: G.days.upperA, primaryMuscles: ['chest', 'back', 'shoulders', 'biceps'], cycleLetter: 'A' },
          { label: G.days.lowerA, primaryMuscles: ['quads', 'hamstrings', 'calves', 'glutes'], cycleLetter: 'B' },
          { label: G.days.upperB, primaryMuscles: ['chest', 'back', 'shoulders', 'triceps'], cycleLetter: 'C' },
          { label: G.days.lowerB, primaryMuscles: ['quads', 'hamstrings', 'abs'], cycleLetter: 'D' },
        ],
      };
    case 5:
      return {
        name: G.templates.pplPlus5,
        days: [
          { label: G.days.push,       primaryMuscles: ['chest', 'shoulders', 'triceps'], cycleLetter: 'A' },
          { label: G.days.pull,       primaryMuscles: ['back', 'biceps'], cycleLetter: 'B' },
          { label: G.days.legs,       primaryMuscles: ['quads', 'hamstrings', 'calves', 'glutes'], cycleLetter: 'C' },
          { label: G.days.bras,       primaryMuscles: ['biceps', 'triceps'], cycleLetter: 'D' },
          { label: G.days.epaulesAbs, primaryMuscles: ['shoulders', 'abs'], cycleLetter: null },
        ],
      };
    case 6:
      return {
        name: G.templates.ppl6,
        days: [
          { label: G.days.pushA, primaryMuscles: ['chest', 'shoulders', 'triceps'], cycleLetter: 'A' },
          { label: G.days.pullA, primaryMuscles: ['back', 'biceps'], cycleLetter: 'B' },
          { label: G.days.legsA, primaryMuscles: ['quads', 'hamstrings', 'calves', 'glutes'], cycleLetter: 'C' },
          { label: G.days.pushB, primaryMuscles: ['chest', 'shoulders', 'triceps'], cycleLetter: 'D' },
          { label: G.days.pullB, primaryMuscles: ['back', 'biceps'], cycleLetter: null },
          { label: G.days.legsB, primaryMuscles: ['quads', 'hamstrings', 'abs'], cycleLetter: null },
        ],
      };
  }
}
