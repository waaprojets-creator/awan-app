import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, extname, relative } from 'path';

// Prévient tout retour de valeurs inline (font-sizes, symboles, rgba remplacés
// par des CSS vars) dans l'ensemble de src/. Les sources autorisées sont :
//   - Tailles : --text-awan-{xxs,xs,sm,md,lg,data} dans src/index.css
//   - Symboles : SYMBOLS dans src/constants/symbols.ts
//   - Couleurs semi-transparentes : --color-awan-border/overlay dans src/index.css

// ─── Helpers ─────────────────────────────────────────────────────────────────

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const ROOT = resolve(process.cwd());
const SRC  = join(ROOT, 'src');

/** Tous les .tsx / .ts dans src/, chemin relatif à la racine */
const ALL_SRC = walk(SRC)
  .filter(f => extname(f) === '.ts' || extname(f) === '.tsx')
  .map(f => relative(ROOT, f));

// ─── Patterns interdits ───────────────────────────────────────────────────────

/** text-[Npx] inline dans un className — doit utiliser text-awan-* */
const INLINE_FONT_SIZE = /text-\[\d+(?:\.\d+)?px\]/;

/** ◆ ◇ → ← · ↑ ↓ écrits en dur dans une string JS (hors fichier de définition) */
const HARDCODED_SYMBOL = /['"`]([◆◇→←·↑↓])['"`]/;

/** rgba() pour les valeurs migrées vers des CSS vars.
 *  Ne capture que les valeurs qu'on a EXPLICITEMENT remplacées — évite les faux
 *  positifs sur les ombres Tailwind (shadow-[…rgba…]) ou les attrs SVG restants. */
const REPLACED_RGBA = /(?<![a-z-])(?:borderColor|backgroundColor|background|borderBottomColor|borderTopColor|borderLeftColor|borderRightColor)\s*[:=]\s*['"]?rgba\((?:255,255,255,0\.0[56]|0,0,0,0\.8[5]|0,0,0,0\.9[24])\)/;

// ─── Exclusions légitimes ─────────────────────────────────────────────────────

/** Fichiers autorisés à contenir des symboles littéraux (la définition). */
const SYMBOL_WHITELIST = new Set([
  'src/constants/symbols.ts',
]);

/** Fichiers contenant du SVG ou des animations canvas où rgba() dans les
 *  attributs SVG (fill/stroke) est inévitable. Le check REPLACED_RGBA n'y
 *  est pas appliqué (il ne cible de toute façon que les props CSS nommées). */
const SVG_ANIMATION_FILES = new Set([
  'src/components/MoonMenu.tsx',
  'src/components/BodyMeasureSvg.tsx',
  'src/HumanAnatomySvg.tsx',
]);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Design tokens drift — toute la codebase src/', () => {

  describe('Aucun text-[Npx] inline (utiliser text-awan-* ou .awan-label-*)', () => {
    for (const relPath of ALL_SRC) {
      it(relPath, () => {
        const src = readFileSync(join(ROOT, relPath), 'utf8');
        const matches: string[] = [];
        src.split('\n').forEach((line, idx) => {
          // Autorisé dans index.css (@apply), dans les commentaires, et dans
          // des string templates qui décrivent la syntaxe Tailwind.
          if (relPath.endsWith('index.css')) return;
          if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
          if (INLINE_FONT_SIZE.test(line)) matches.push(`L${idx + 1}: ${line.trim()}`);
        });
        expect(matches, matches.join('\n')).toEqual([]);
      });
    }
  });

  describe('Aucun symbole ◆/◇/→/←/·/↑/↓ hardcodé (utiliser SYMBOLS)', () => {
    for (const relPath of ALL_SRC) {
      if (SYMBOL_WHITELIST.has(relPath)) continue;
      it(relPath, () => {
        const src = readFileSync(join(ROOT, relPath), 'utf8');
        const matches: string[] = [];
        src.split('\n').forEach((line, idx) => {
          if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
          if (HARDCODED_SYMBOL.test(line)) matches.push(`L${idx + 1}: ${line.trim()}`);
        });
        expect(matches, matches.join('\n')).toEqual([]);
      });
    }
  });

  describe('Aucun rgba() remplacé par CSS var (régressions interdites)', () => {
    for (const relPath of ALL_SRC) {
      if (SVG_ANIMATION_FILES.has(relPath)) continue;
      it(relPath, () => {
        const src = readFileSync(join(ROOT, relPath), 'utf8');
        const matches: string[] = [];
        src.split('\n').forEach((line, idx) => {
          if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
          if (REPLACED_RGBA.test(line)) matches.push(`L${idx + 1}: ${line.trim()}`);
        });
        expect(matches, matches.join('\n')).toEqual([]);
      });
    }
  });

  // Check spécifique aux composants protégés du générateur
  describe('Composants générateur — defaults centralisés dans GENERATOR_DEFAULTS', () => {
    const HARDCODED_GENERATOR_DEFAULT =
      /(?:niveau|objectif|frequenceJours):\s*['"]?(?:intermediate|beginner|advanced|hypertrophie|force|endurance|recomposition|\d)['"]?/;
    const GENERATOR_VIEW = 'src/modules/sport/components/RoutineGeneratorView.tsx';

    it(GENERATOR_VIEW, () => {
      const src = readFileSync(join(ROOT, GENERATOR_VIEW), 'utf8');
      const matches: string[] = [];
      src.split('\n').forEach((line, idx) => {
        if (line.includes('GENERATOR_DEFAULTS')) return;
        if (HARDCODED_GENERATOR_DEFAULT.test(line)) matches.push(`L${idx + 1}: ${line.trim()}`);
      });
      expect(matches, matches.join('\n')).toEqual([]);
    });
  });

});
