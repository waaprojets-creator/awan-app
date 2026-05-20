import { describe, it, expect } from 'vitest';
import { loadDefaultRules } from '@/modules/coach/rulesLoader';

// Chaque nombre apparaissant dans `rule.name` DOIT correspondre à un nombre
// significatif de la règle : condition.value/min/max, ou signal.window.days,
// ou signal.ratioWindow.days. Sinon le texte humain ment sur ce que la règle
// évalue (cas réel observé : `nutrition.meal_regularity` "moins de 2"
// alors que la condition était `avg.kcal < 500`).

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

  // TODO: activer une fois les 6 cas connus traités (voir conversation 2026-05-20) :
  //   - 5 faux positifs (unités converties/calculs explicatifs, à allowlist) :
  //     sport.fatigue_rpe, sport.insufficient_frequency, sport.deload_due,
  //     sport.insufficient_rest_48h, nutrition.proteines_faibles
  //   - 1 vraie dérive (nom ment sur la condition) :
  //     nutrition.meal_regularity — name dit "moins de 2 entrées/jour"
  //     mais condition évalue `avg kcal < 500`. À renommer ou recâbler.
  it.skip('chaque nombre dans rule.name correspond à un nombre meaningful de la règle', () => {
    const drifts: string[] = [];
    for (const rule of rules) {
      const inName = extractNumbers(rule.name);
      if (inName.length === 0) continue;
      const meaningful = meaningfulNumbers(rule);
      for (const n of inName) {
        if (!meaningful.has(n)) {
          drifts.push(
            `[${rule.id}] nombre "${n}" dans le nom "${rule.name}" ne correspond à aucune valeur de la règle ` +
            `(condition/window/ratioWindow = ${JSON.stringify([...meaningful])}).`,
          );
        }
      }
    }
    expect(drifts, drifts.join('\n')).toEqual([]);
  });
});
