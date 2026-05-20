import { describe, it, expect } from 'vitest';
import { loadDefaultRules } from '@/modules/coach/rulesLoader';

// Chaque nombre apparaissant dans `rule.name` DOIT correspondre à un nombre
// significatif de la règle (condition.value/min/max, signal.window.days,
// signal.ratioWindow.days). Sinon le texte humain ment sur ce qu'évalue la règle.
//
// Allowlist : règles dont le nom contient une valeur DÉRIVÉE légitime
// (conversion d'unité jours↔heures↔semaines, ou paramètre de calcul explicatif
// comme "80 kg × 1.4"). Toute nouvelle règle qui voudrait rejoindre cette
// liste doit le justifier explicitement.
const ALLOWED_DERIVED_VALUES = new Set([
  'sport.fatigue_rpe',          // "5 séances" ≈ avg sessions per 14d window
  'sport.insufficient_frequency', // "2 séances/sem" = 6 count / 3 weeks
  'sport.deload_due',           // "6 semaines" = 42 days
  'sport.insufficient_rest_48h', // "48h" = 2 days
  'nutrition.proteines_faibles', // "80kg × 1.4" calcul explicatif derrière 112g
]);

function extractNumbers(s: string): number[] {
  const matches = s.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  return matches.map(n => parseFloat(n.replace(',', '.')));
}

function meaningfulNumbers(rule: ReturnType<typeof loadDefaultRules>[number]): Set<number> {
  const ns = new Set<number>();
  const c = rule.condition;
  if (c.op === 'between') { ns.add(c.min); ns.add(c.max); }
  else { ns.add(c.value); }
  for (const sig of rule.signals) {
    ns.add(sig.window.days);
    const ratio = (sig as { ratioWindow?: { days: number } }).ratioWindow;
    if (ratio) ns.add(ratio.days);
  }
  return ns;
}

describe('Coach rules — cohérence nom ↔ règle', () => {
  const rules = loadDefaultRules();

  it('chaque nombre dans rule.name correspond à un nombre meaningful (sauf allowlist)', () => {
    const drifts: string[] = [];
    for (const rule of rules) {
      if (ALLOWED_DERIVED_VALUES.has(rule.id)) continue;
      const inName = extractNumbers(rule.name);
      if (inName.length === 0) continue;
      const meaningful = meaningfulNumbers(rule);
      for (const n of inName) {
        if (!meaningful.has(n)) {
          drifts.push(
            `[${rule.id}] nombre "${n}" dans le nom "${rule.name}" ne correspond à aucune valeur de la règle ` +
            `(condition/window/ratioWindow = ${JSON.stringify([...meaningful])}). ` +
            `Soit corrige le nom, soit ajoute ${rule.id} dans ALLOWED_DERIVED_VALUES avec justification.`,
          );
        }
      }
    }
    expect(drifts, drifts.join('\n')).toEqual([]);
  });

  it('allowlist : aucune règle "fantôme" (allowlist ⊆ règles chargées)', () => {
    const ids = new Set(rules.map(r => r.id));
    for (const allowed of ALLOWED_DERIVED_VALUES) {
      expect(ids.has(allowed), `Rule "${allowed}" dans allowlist mais introuvable — règle renommée ou supprimée ?`).toBe(true);
    }
  });
});
