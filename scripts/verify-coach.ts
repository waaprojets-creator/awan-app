/**
 * Vérification end-to-end du Coach contre le seed réel.
 * Charge seed-demo.json, importe comme l'app (migration + clés correctes),
 * exécute coach.runAll(TODAY) et imprime les analyses produites.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { MemoryStorage } from '../src/data/storage/MemoryStorage';
import { Coach } from '../src/modules/coach/api';

import { migrateWorkoutSession } from '../src/data/schemas/sport/routine';
import { migrateMealEntry } from '../src/data/schemas/nutrition/mealEntry';
import { migrateMeasurement } from '../src/data/schemas/anthropo/measurement';
import { migrateWeightEntry } from '../src/data/schemas/body/weightEntry';
import { migrateSleepEntry } from '../src/data/schemas/sleep/sleepEntry';

async function main() {
  const raw = readFileSync(path.join(process.cwd(), 'public/data/seed-demo.json'), 'utf-8');
  const parsed = JSON.parse(raw) as { data: Record<string, unknown[]> };
  const data = parsed.data;

  const storage = new MemoryStorage();

  const imp = async (items: unknown[] | undefined, migrate: (r: unknown) => any, keyOf: (e: any) => string) => {
    let ok = 0, fail = 0;
    for (const it of items ?? []) {
      try { const e = migrate(it); await storage.set(keyOf(e), e); ok++; } catch { fail++; }
    }
    return { ok, fail };
  };

  const r1 = await imp(data.sessions, migrateWorkoutSession, (s) => `sport.session.${s.date}.${s.id}`);
  const r2 = await imp(data.meals, migrateMealEntry, (m) => `nutrition.meal.${m.id}`);
  const r3 = await imp(data.measurements, migrateMeasurement, (m) => `anthropo.measurement.${m.date}`);
  const r4 = await imp(data.weightEntries, migrateWeightEntry, (w) => `weight.entry.${w.date}`);
  const r5 = await imp(data.sleepEntries, migrateSleepEntry, (s) => `sleep.entry.${s.id}`);

  console.log('IMPORT:', { sessions: r1, meals: r2, measurements: r3, weight: r4, sleep: r5 });

  // TODAY = dernière date de repas du seed (le seed est calé sur le jour du build)
  const meals = (data.meals ?? []) as Array<{ date: string }>;
  const TODAY = meals.map((m) => m.date).sort().at(-1)!;
  console.log('TODAY =', TODAY, '\n');

  const coach = new Coach({ storage });
  const t0 = performance.now();
  const assessments = await coach.runAll(TODAY);
  const dt = performance.now() - t0;
  console.log(`runAll() = ${dt.toFixed(0)}ms\n`);

  for (const a of assessments) {
    console.log(`━━━ ${a.domain.toUpperCase()} ━━━`);
    for (const rr of a.ruleResults) {
      const flag = rr.triggered ? '🔴 TRIGGER' : '  ok     ';
      console.log(`  ${flag}  ${rr.ruleId.padEnd(34)} value=${Number.isFinite(rr.signalValue) ? rr.signalValue.toFixed(3) : rr.signalValue}`);
    }
    if (a.advices.length > 0) {
      console.log(`  → ${a.advices.length} conseil(s): ${a.advices.map((x) => x.key).join(', ')}`);
    }
    if (a.correlations.length > 0) {
      console.log(`  → ${a.correlations.length} corrélation(s): ${a.correlations.map((c) => `${c.ruleId}(r=${c.strength.toFixed(2)})`).join(', ')}`);
    }
    if (a.forecasts.length > 0) {
      console.log(`  → ${a.forecasts.length} prévision(s): ${a.forecasts.map((f) => `${f.id}(J+${f.horizonDays})`).join(', ')}`);
    }
    console.log();
  }

  const totalAdvices = assessments.reduce((s, a) => s + a.advices.length, 0);
  const totalForecasts = assessments.reduce((s, a) => s + a.forecasts.length, 0);
  const totalTriggers = assessments.reduce((s, a) => s + a.ruleResults.filter((r) => r.triggered).length, 0);
  console.log(`TOTAL: ${totalTriggers} règles déclenchées, ${totalAdvices} conseils, ${totalForecasts} prévisions`);
}

main().catch((e) => { console.error(e); process.exit(1); });
