import { migrateRoutine } from '../data/schemas/sport/routine';
import { WorkoutService } from '../services/workoutService';
import type { RoutineLatest } from '../data/schemas/sport/routine';

export type ImportPayload =
  | { type: 'sport.routine'; data: unknown }
  | { type: 'sport.routines'; data: unknown[] };

export async function importFromJson(raw: string): Promise<{ success: boolean; message: string }> {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return { success: false, message: 'JSON invalide' }; }

  const payload = parsed as ImportPayload;

  if (payload.type === 'sport.routine') {
    try {
      const routine = migrateRoutine(payload.data) as RoutineLatest;
      await WorkoutService.saveRoutine(routine);
      return { success: true, message: `Routine "${routine.name}" importée` };
    } catch (e) {
      return { success: false, message: `Erreur schema: ${String(e)}` };
    }
  }

  if (payload.type === 'sport.routines') {
    const arr = Array.isArray(payload.data) ? payload.data : [];
    let count = 0;
    for (const item of arr) {
      try {
        const routine = migrateRoutine(item) as RoutineLatest;
        await WorkoutService.saveRoutine(routine);
        count++;
      } catch { /* skip invalid */ }
    }
    return { success: true, message: `${count} routine(s) importée(s)` };
  }

  return { success: false, message: `Type inconnu: ${(payload as { type?: string }).type ?? 'undefined'}` };
}
