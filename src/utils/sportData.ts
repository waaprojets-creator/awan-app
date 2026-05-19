// Free Exercise DB (yuhonas/free-exercise-db) — Unlicense (domaine public)
// Catalogue compact: 873 exercices, champs: id, n, pm, sm, eq, cat, lvl, force

export interface ExerciseEntry {
  id: string;
  n: string;       // nom
  pm: string[];    // muscles primaires
  sm: string[];    // muscles secondaires
  eq: string;      // équipement
  cat: string;     // catégorie
  lvl: string;     // niveau
  force: string;   // type de force
  images?: string[]; // [pos_départ, pos_arrivée] — raw.githubusercontent.com
}

export const MUSCLE_FR: Record<string, string> = {
  abdominals: 'Abdominaux',
  abductors: 'Abducteurs',
  adductors: 'Adducteurs',
  biceps: 'Biceps',
  calves: 'Mollets',
  chest: 'Pectoraux',
  forearms: 'Avant-bras',
  glutes: 'Fessiers',
  hamstrings: 'Ischio-jambiers',
  lats: 'Dorsaux',
  lower_back: 'Bas du dos',
  middle_back: 'Milieu du dos',
  neck: 'Cou',
  quadriceps: 'Quadriceps',
  shoulders: 'Épaules',
  traps: 'Trapèzes',
  triceps: 'Triceps',
};

// Catalogue chargé depuis /public/data/exercises.json (fetch au démarrage)
let _exercises: ExerciseEntry[] = [];
let _loaded = false;
let _loadPromise: Promise<void> | null = null;

export async function loadExerciseCatalog(): Promise<void> {
  if (_loaded) return;
  if (_loadPromise) return _loadPromise;
  _loadPromise = fetch('/data/exercises.json')
    .then(r => r.json())
    .then((data: ExerciseEntry[]) => {
      _exercises = data;
      _loaded = true;
    });
  return _loadPromise;
}

export function getExercises(): ExerciseEntry[] {
  return _exercises;
}

export function getExerciseById(id: string): ExerciseEntry | undefined {
  return _exercises.find(e => e.id === id);
}

export function searchExercises(query: string, muscle?: string): ExerciseEntry[] {
  const q = query.toLowerCase();
  return _exercises.filter(e => {
    const matchText = !q || e.n.toLowerCase().includes(q);
    const matchMuscle = !muscle || e.pm.includes(muscle) || e.sm.includes(muscle);
    return matchText && matchMuscle;
  });
}

// Compatibilité avec anciens imports (EXERCISES = snapshot sync, préférer getExercises())
export const EXERCISES: ExerciseEntry[] = _exercises;
export const MUSCLES: Record<string, string> = MUSCLE_FR;
