import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MemoryStorage } from '@/data/storage/MemoryStorage';
import { _setStorageForTest, getStorage } from '@/data/storage/storageService';
import { importFromJson } from '@/utils/importJson';
import { SleepService } from '@/services/sleepService';
import { MealService } from '@/services/mealService';
import { WorkoutService } from '@/services/workoutService';
import { IslamService } from '@/services/islamService';
import { HabitOccurrenceService } from '@/services/habitOccurrenceService';
import { HabitService } from '@/services/habitService';
import { WeightService } from '@/services/weightService';
import { Planner } from '@/modules/planning/api';

// Vérification bout-en-bout du seed : import réel via importFromJson puis
// lecture par les services (valide ids dateId + clés + migrators + préfixes).

const seedRaw = readFileSync(path.join(process.cwd(), 'public/data/seed-demo.json'), 'utf8');
const seed = JSON.parse(seedRaw) as { generatedAt: string };
// TODAY du build du seed — toutes les données passées existent jusqu'à cette date
const seedToday = seed.generatedAt.slice(0, 10);

function subDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
const refDate = subDays(seedToday, 1);
const refWeekAgo = subDays(seedToday, 7);

let importMessage = '';

// MemoryStorage.set() restringifie tout le store à chaque écriture (contrôle
// de quota) → O(n²) sur ~2800 entrées. Quota sans objet dans ce test.
class FastMemoryStorage extends MemoryStorage {
  override async getSizeBytes(): Promise<number> { return 0; }
}

beforeAll(async () => {
  _setStorageForTest(new FastMemoryStorage());
  const res = await importFromJson(seedRaw);
  expect(res.success).toBe(true);
  importMessage = res.message;
}, 60000);

describe('seed import — silos lisibles par les services', () => {
  it('aucune entrée rejetée par les migrators', () => {
    expect(importMessage).not.toContain('rejet');
  });

  it('sleep.entry lisible par date (id = dateId)', async () => {
    const entries = await SleepService.getByDate(refDate);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]!.id.startsWith(refDate)).toBe(true);
  });

  it('nutrition.meal lisible par date (id = dateId)', async () => {
    const meals = await MealService.getByDate(refDate);
    expect(meals.length).toBeGreaterThanOrEqual(5);
  });

  it('sport.session lisible par plage de dates (clé date.id)', async () => {
    const sessions = await WorkoutService.getSessionsByDateRange(refWeekAgo, seedToday);
    expect(sessions.length).toBeGreaterThan(0);
  });

  it('weight.entry lisible par date', async () => {
    const w = await WeightService.getByDate(refDate);
    expect(w).not.toBeNull();
  });

  it('islam.prayer lisible par plage', async () => {
    const logs = await IslamService.getPrayerLogsByDateRange(refWeekAgo, seedToday);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('islam.quran.session lisible par plage (id = dateId)', async () => {
    const sessions = await IslamService.getQuranSessionsByDateRange(refWeekAgo, seedToday);
    expect(sessions.length).toBeGreaterThan(0);
  });

  it('habit.definition + habit.occurrence lisibles', async () => {
    const defs = await HabitService.getDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(4);
    // habitudes quotidiennes à 65-85% — au moins une occurrence sur 7 jours
    let found = 0;
    for (let i = 1; i <= 7; i++) {
      found += (await HabitOccurrenceService.getByDate(subDays(seedToday, i))).length;
    }
    expect(found).toBeGreaterThan(0);
  });

  it('planning.task V4 actives lisibles (id = dateId)', async () => {
    const planner = new Planner(await getStorage());
    const tasks = await planner.getActiveTasks();
    expect(tasks.length).toBeGreaterThan(0);
    for (const t of tasks) {
      expect(t.v).toBe(4);
      expect([1, 2, 3]).toContain(t.priority);
    }
    // les ancres (priority 1) portent une heure fixe
    expect(tasks.some(t => t.priority === 1 && t.timeHHMM !== undefined)).toBe(true);
  });

  it('planning.schedule lisible par date', async () => {
    const planner = new Planner(await getStorage());
    const schedule = await planner.getSchedule(refDate);
    expect(schedule).not.toBeNull();
    expect(schedule!.slots.length).toBeGreaterThan(0);
  });
});
