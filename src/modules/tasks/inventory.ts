import type { ScheduleTaskLatest } from '@/data/schemas/planning/scheduleTask';
import type { HabitDefinitionLatest } from '@/data/schemas/habits/habitDefinition';

// ─────────────────────────────────────────────────────────────────────────────
// Inventaire unifié des tâches : silo tâches one-off (ScheduleTask) + silo
// habitudes récurrentes (HabitDefinition), normalisés en un modèle commun
// filtrable par priorité, domaine et tags (dossiers transverses).
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskListItem {
  /** Clé unique préfixée par la source. */
  id: string;
  source: 'task' | 'habit';
  /** Identifiant d'origine (task.id ou habit.id) pour les actions. */
  refId: string;
  title: string;
  recurring: boolean;
  /** Priorité 1-3 (tâches one-off) · null pour les habitudes. */
  priority: 1 | 2 | 3 | null;
  /** Domaine libre (travail, perso, famille…) ou domaine habitude. */
  domain: string | null;
  tags: string[];
  /** Tâche : status==='done' · Habitude : validée aujourd'hui. */
  done: boolean;
  timeHHMM: string | null;
  durationMin: number | null;
  /** Récurrence des habitudes ([] = tous les jours) · null pour les tâches. */
  daysOfWeek: number[] | null;
}

export function taskToItem(t: ScheduleTaskLatest): TaskListItem {
  return {
    id: `task.${t.id}`,
    source: 'task',
    refId: t.id,
    title: t.title,
    recurring: false,
    priority: t.priority,
    domain: t.domain || null,
    tags: t.tags ?? [],
    done: t.status === 'done',
    timeHHMM: t.timeHHMM ?? null,
    durationMin: t.durationMin ?? null,
    daysOfWeek: null,
  };
}

export function habitToItem(h: HabitDefinitionLatest, doneToday: boolean): TaskListItem {
  return {
    id: `habit.${h.id}`,
    source: 'habit',
    refId: h.id,
    title: h.name,
    recurring: true,
    priority: null,
    domain: h.domain ?? null,
    tags: h.tags ?? [],
    done: doneToday,
    timeHHMM: null,
    durationMin: null,
    daysOfWeek: h.daysOfWeek,
  };
}

// ── Tri ──────────────────────────────────────────────────────────────────────
// À faire avant fait · priorité 1<2<3<(habitudes) · one-off avant récurrentes · titre.

export function sortItems(items: TaskListItem[]): TaskListItem[] {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ap = a.priority ?? 4;
    const bp = b.priority ?? 4;
    if (ap !== bp) return ap - bp;
    if (a.recurring !== b.recurring) return a.recurring ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}

/** Assemble l'inventaire trié. Exclut les tâches annulées. */
export function assembleInventory(
  tasks: ScheduleTaskLatest[],
  habits: HabitDefinitionLatest[],
  doneHabitIds: Set<string>,
): TaskListItem[] {
  const items: TaskListItem[] = [];
  for (const t of tasks) {
    if (t.status === 'cancelled') continue;
    items.push(taskToItem(t));
  }
  for (const h of habits) items.push(habitToItem(h, doneHabitIds.has(h.id)));
  return sortItems(items);
}

// ── Filtres ──────────────────────────────────────────────────────────────────

export interface TaskFilters {
  status: 'all' | 'todo' | 'done';
  recurrence: 'all' | 'oneoff' | 'recurring';
  priority: 1 | 2 | 3 | null;
  domain: string | null;
  /** Dossiers sélectionnés (OR : l'item passe s'il porte au moins un de ces tags). */
  tags: string[];
  search: string;
}

export const EMPTY_FILTERS: TaskFilters = {
  status: 'all', recurrence: 'all', priority: null, domain: null, tags: [], search: '',
};

export function applyFilters(items: TaskListItem[], f: TaskFilters): TaskListItem[] {
  const q = f.search.trim().toLowerCase();
  return items.filter(it => {
    if (f.status === 'todo' && it.done) return false;
    if (f.status === 'done' && !it.done) return false;
    if (f.recurrence === 'oneoff' && it.recurring) return false;
    if (f.recurrence === 'recurring' && !it.recurring) return false;
    if (f.priority != null && it.priority !== f.priority) return false;
    if (f.domain != null && it.domain !== f.domain) return false;
    if (f.tags.length > 0 && !f.tags.some(tag => it.tags.includes(tag))) return false;
    if (q && !it.title.toLowerCase().includes(q) && !it.tags.some(t => t.toLowerCase().includes(q))) return false;
    return true;
  });
}

/** Valeurs distinctes pour les puces de filtre (domaines, tags), triées. */
export function collectFacets(items: TaskListItem[]): { domains: string[]; tags: string[] } {
  const domains = new Set<string>();
  const tags = new Set<string>();
  for (const it of items) {
    if (it.domain) domains.add(it.domain);
    for (const t of it.tags) tags.add(t);
  }
  return {
    domains: [...domains].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b)),
  };
}
