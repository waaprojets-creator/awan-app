import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Empêche tout retour de valeurs inline (font sizes via text-[Npx], symboles
// codés en dur) dans les composants AWAN introduits par les sprints v3.
// Les utilities .awan-label-{xs,sm,md,lg} dans src/index.css et SYMBOLS dans
// src/constants/symbols.ts sont les sources autorisées.
//
// Si tu introduis un nouveau composant et veux qu'il soit protégé, ajoute son
// chemin ci-dessous. Si un fichier doit légitimement avoir une inline value
// (pattern hérité), ne l'ajoute PAS à cette liste.

const PROTECTED_FILES = [
  'src/modules/sport/components/WorkoutListView.tsx',
  'src/modules/sport/components/RoutineGeneratorView.tsx',
  'src/services/mediaCacheService.ts',
  'src/modules/coach/routine-generator/generator.ts',
  'src/modules/coach/routine-generator/templates.ts',
  'src/modules/coach/routine-generator/exerciseSelector.ts',
  'src/modules/coach/routine-generator/volumeAllocator.ts',
  'src/modules/coach/routine-generator/objectifSpecs.ts',
];

const INLINE_FONT_SIZE = /className=["'][^"']*text-\[\d+(?:\.\d+)?px\]/;
const HARDCODED_SYMBOL = /['"]([◆◇])['"]/;

describe('Design tokens drift — composants protégés', () => {
  for (const relPath of PROTECTED_FILES) {
    const abs = resolve(process.cwd(), relPath);
    const src = readFileSync(abs, 'utf8');

    it(`${relPath} — aucun text-[Npx] inline (utiliser .awan-label-{xs,sm,md,lg})`, () => {
      const matches: string[] = [];
      src.split('\n').forEach((line, idx) => {
        if (INLINE_FONT_SIZE.test(line)) matches.push(`L${idx + 1}: ${line.trim()}`);
      });
      expect(matches, matches.join('\n')).toEqual([]);
    });

    it(`${relPath} — aucun symbole ◆/◇ hardcodé (utiliser SYMBOLS depuis constants/symbols)`, () => {
      const matches: string[] = [];
      src.split('\n').forEach((line, idx) => {
        if (HARDCODED_SYMBOL.test(line)) matches.push(`L${idx + 1}: ${line.trim()}`);
      });
      expect(matches, matches.join('\n')).toEqual([]);
    });
  }
});
