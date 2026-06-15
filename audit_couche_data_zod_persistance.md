# AUDIT TECHNIQUE COUCHE DATA : ZOD, SCHÉMAS ET PERSISTANCE

> État des lieux factuel de la couche de stockage AWAN — schémas Zod, clés `kv`, moteur de
> migration, abstraction `IStorage` / `SqliteStorage`. Extraits de code bruts, aucune projection cible.
> Réf. branche : `main` (HEAD courant). Date : 2026-06-11.

---

## 1. Cartographie des schémas Zod

### Localisation
Tous les schémas vivent sous `src/data/schemas/<silo>/<entité>.ts`. Types partagés dans `src/data/schemas/common/`.

```
src/data/schemas/
├── common/         id.ts · date.ts
├── sport/          exerciseSet.ts · routine.ts · workoutLog.ts
├── nutrition/      mealEntry.ts · dailyNutritionLog.ts · foodItem.ts · customRecipe.ts · nutritionTargets.ts · waterIntake.ts
├── islam/          prayerLog.ts · quranProgress.ts · quranSession.ts
├── journal/        journalEntry.ts
├── anthropo/       measurement.ts
├── body/           weightEntry.ts
├── activity/       activityRecord.ts · dailySummary.ts
├── sleep/          sleepEntry.ts
├── planning/       scheduleTask.ts · daySchedule.ts
└── coach/          rule.ts · signal.ts · forecast.ts · assessment.ts · knowledge.ts
```

### Types communs (`common/id.ts`, `common/date.ts`)
```typescript
export const IdSchema = z.string().uuid();                          // UUID standard
export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
export const TimestampSchema = z.number().int().nonnegative();      // Unix epoch ms
```

### SPORT — le record persisté est `WorkoutSession`, qui contient des `ExerciseSet`

**`sport/exerciseSet.ts`** — la maille atomique (`Set`, `SetKind`, `rir`, `weightKg`) :
```typescript
export const SetKindSchema = z.enum(['warmup', 'working', 'drop', 'failure']);

export const ExerciseSetV1Schema = z.object({
  v: z.literal(1),
  exerciseId: z.string(),
  kind: SetKindSchema.default('working'),   // backfill legacy → 'working'
  reps: z.number().int().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSec: z.number().int().nonnegative().optional(),
  distanceM: z.number().nonnegative().optional(),
  rir: z.number().int().min(0).max(5).optional(),
  rpe: z.number().min(1).max(10).optional(),
  restActualSec: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
  completedAt: z.number().int().nonnegative().optional(),
});

export const ExerciseSetV2Schema = ExerciseSetV1Schema.extend({
  v: z.literal(2),
  plannedWeightKg: z.number().nonnegative().optional(),  // snapshot début séance
  plannedReps: z.number().int().nonnegative().optional(),
  substitutedFrom: z.string().optional(),
});

export const ExerciseSetSchema = z.discriminatedUnion('v', [ExerciseSetV1Schema, ExerciseSetV2Schema]);
export const EXERCISE_SET_LATEST_VERSION = 2;
```

**`sport/routine.ts`** — `WorkoutSession` (clé `sport.session.*`), versionnée jusqu'à **V3** :
```typescript
export const WorkoutExerciseLogSchema = z.object({
  rid: z.string(), exerciseId: z.string(), name: z.string(),
  primaryMuscle: z.string().optional(),
  secondaryMuscles: z.array(z.string()).optional(),
  equipment: z.string().optional(),
  order: z.number().int().nonnegative(),
  sets: z.array(ExerciseSetSchema),          // ← nesting des sets
  substitutedFrom: z.string().optional(),
});

export const WorkoutSessionV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  routineId: IdSchema.optional(),
  name: z.string(),
  cycleLetter: CycleLetterSchema.nullable().optional(),  // 'A'|'B'|'C'|'D'
  date: DateStringSchema,
  startTime: TimestampSchema, endTime: TimestampSchema,
  duration: z.number().int().nonnegative(),
  warmupStartedAt: TimestampSchema.optional(),
  workoutEndedAt: TimestampSchema.optional(),
  solo: z.boolean(),
  availableTimeMin: z.number().int().positive().optional(),
  feeling: z.number().int().min(1).max(5).optional(),
  sessionRPE: z.number().int().min(1).max(10).optional(),
  recoveryScore: z.number().int().min(1).max(10).optional(),
  note: z.string().optional(),
  isException: z.boolean(),
  exercises: z.array(WorkoutExerciseLogSchema),
});

// V2 : + scoreSeance, exitedAt, adherence
// V3 : + tonnage, durationMin, rpe  ← champs PRÉ-CALCULÉS top-level pour aggregate() SQL
export const WorkoutSessionV3Schema = WorkoutSessionV2Schema.extend({
  v: z.literal(3),
  tonnage: z.number().nonnegative(),      // Σ(weightKg × reps, kind='working')
  durationMin: z.number().nonnegative(),  // (endTime − startTime) / 60000
  rpe: z.number().min(1).max(10).optional(),
});

export const WORKOUT_SESSION_LATEST_VERSION = 3;
```

### NUTRITION — `nutrition/mealEntry.ts`
```typescript
export const MealSourceSchema = z.enum(['manual', 'db', 'quick', 'custom']);
export const MealTypeSchema = z.enum(['suhoor', 'dejeuner', 'diner', 'collation']);

export const MealEntryV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  name: z.string().min(1),
  kcal: z.number().nonnegative(),
  p: z.number().nonnegative(),    // protéines (g)   ⚠ champ = 'p', PAS 'proteinG'
  c: z.number().nonnegative(),    // glucides  (g)   ⚠ champ = 'c'
  f: z.number().nonnegative(),    // lipides   (g)   ⚠ champ = 'f'
  timestamp: TimestampSchema,
  source: MealSourceSchema,
  meal: MealTypeSchema.optional(),                 // legacy enum
  grams: z.number().positive().optional(),
  timeHHMM: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  foodId: z.string().optional(),
  fiberG: z.number().nonnegative().optional(),
});

const MealItemSchema = z.object({
  foodId: z.string().min(1), grams: z.number().positive(), name: z.string().min(1),
  kcal: z.number().nonnegative(), p: z.number().nonnegative(),
  c: z.number().nonnegative(), f: z.number().nonnegative(),
});

export const MealEntryV2Schema = MealEntryV1Schema.extend({
  v: z.literal(2),
  mealSlot: z.number().int().min(1).max(5),        // 5 créneaux assignables
  mealLabel: z.string().optional(),                // libellé libre
  items: z.array(MealItemSchema).optional(),       // multi-aliments
  nutritionScore: z.number().int().min(0).max(100).optional(),
});

export const MEAL_ENTRY_LATEST_VERSION = 2;

// Helper de migration V1→V2
export const MEAL_TYPE_TO_SLOT: Record<MealType, number> = {
  suhoor: 1, dejeuner: 2, diner: 3, collation: 4,
};
```

### ISLAM / PRIÈRES — `islam/prayerLog.ts`
**Un enregistrement = un jour entier** (pas une prière individuelle). V2 = nomenclature malékite à **7 prières** :
```typescript
// V1 (legacy) : 5 prières
const PRAYER_NAMES_V1 = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export const PrayerLogV1Schema = z.object({
  v: z.literal(1), id: IdSchema, date: DateStringSchema,
  prayers: z.record(z.enum(PRAYER_NAMES_V1), z.boolean()),
  savedAt: TimestampSchema,
});

// V2 : 7 prières + scores pré-calculés
export const PRAYER_NAMES = ['fajr_sunnah','sobh','dhuhr','asr','maghrib','isha','witr'] as const;
export const FARD_PRAYERS = ['sobh','dhuhr','asr','maghrib','isha'] as const;

export const PrayerLogV2Schema = z.object({
  v: z.literal(2), id: IdSchema, date: DateStringSchema,
  prayers: z.record(z.enum(PRAYER_NAMES), z.boolean()),
  prayerTimes: z.record(z.enum(PRAYER_NAMES), TimeHHMMSchema.nullable()).optional(),
  savedAt: TimestampSchema,
  adherenceScore: z.number().min(0).max(1).optional(),  // trueCount / 7
  fardScore: z.number().min(0).max(1).optional(),       // fardTrueCount / 5
});

export const PRAYER_LOG_LATEST_VERSION = 2;

// Scores calculés à l'écriture (stockés top-level → SUM/AVG SQL sans charger les records)
export function computePrayerScores(prayers: Record<string, boolean>) {
  const trueCount = Object.values(prayers).filter(Boolean).length;
  const fardCount = FARD_PRAYERS.filter(p => prayers[p]).length;
  return {
    adherenceScore: parseFloat((trueCount / PRAYER_NAMES.length).toFixed(3)),
    fardScore: parseFloat((fardCount / FARD_PRAYERS.length).toFixed(3)),
  };
}
```

### JOURNAL — `journal/journalEntry.ts` (cible directe du `DailyCanvas`)
```typescript
export const JournalEntryV1Schema = z.object({
  v: z.literal(1),
  id: IdSchema,
  date: DateStringSchema,
  content: z.string().min(1),
  mood: z.number().int().min(1).max(5),
  module: z.string(),
  tags: z.array(z.string()),
  timestamp: TimestampSchema,
});

export const JOURNAL_ENTRY_LATEST_VERSION = 1;   // mono-version, migrations = {}
```

---

## 2. Structure exacte des clés `kv`

> **Le séparateur est `.` (point), jamais `:`.** Format réel : `<silo>.<entité>.<discriminant>`.

| Silo | Préfixe | Builder de clé | Discriminant de date |
|---|---|---|---|
| **Sport routine** | `sport.routine` | `sport.routine.${routine.id}` | **UUID** (date = champ JSON `createdAt`) |
| **Sport séance** | `sport.session` | `sport.session.${session.id}` | **UUID** (date = champ JSON `date`) |
| **Nutrition** | `nutrition.meal` | `nutrition.meal.${id}` | **UUID** (date = champ JSON `$.date`, requêté via `json_extract`) |
| **Prière** | `islam.prayer` | `islam.prayer.${date}` | **DATE dans la clé** → `islam.prayer.2026-06-10` (1 log/jour, clé déterministe) |
| **Coran progress** | — | `islam.quran.progress` | **Singleton** (clé fixe, pas de discriminant) |
| **Coran session** | `islam.quran.session` | `islam.quran.session.${date}.${id}` | **DATE + UUID** → `islam.quran.session.2026-06-10.<uuid>` |
| **Journal** | `journal.entry` | `journal.entry.${entry.id}` | **UUID** (date = champ JSON, filtré **en JS**, pas SQL) |

### Faits clés pour l'optimisation d'index
- L'`id` est un **UUID v4 pur** (`z.string().uuid()`) — il **ne contient aucun timestamp**. L'horodatage est toujours un champ séparé (`timestamp`, `startTime`, `savedAt`, epoch ms).
- **Deux stratégies de filtrage par date coexistent :**
  - **SQL-native** (`json_extract`) : Nutrition (`MealService.getByDate` → `listFiltered(prefix, { date })`) et Coran session. Scalable.
  - **Full-scan + filtre JS** : Journal (`JournalService.getByDate` charge **toutes** les entrées via `list()` puis `.filter(e => e.date === date)`) et Sport (`getSessionsByDateRange` → `listByPrefix` puis filtre `s.date >= from`). C'est le hotspot.
  - **Clé-déterministe** : Prière (`get(prayerKey(date))` — lecture O(1), zéro scan).

### Extraits services (construction des clés)
```typescript
// mealService.ts
const MEAL_PREFIX = 'nutrition.meal';
function mealKey(id: string) { return `${MEAL_PREFIX}.${id}`; }
async getByDate(date) {
  const keys = await storage.listFiltered(MEAL_PREFIX, { date });   // SQL json_extract
  // …
}

// islamService.ts
const PRAYER_LOG_PREFIX = 'islam.prayer';
const QURAN_KEY = 'islam.quran.progress';                 // singleton
const QURAN_SESSION_PREFIX = 'islam.quran.session';
function prayerKey(date) { return `${PRAYER_LOG_PREFIX}.${date}`; }          // date DANS la clé
function quranSessionKey(date, id) { return `${QURAN_SESSION_PREFIX}.${date}.${id}`; }

// journalService.ts
const JOURNAL_PREFIX = 'journal.entry';
async getByDate(date) {
  const keys = await storage.list(JOURNAL_PREFIX);          // full-scan…
  const all = await Promise.all(keys.map(k => storage.get(k, migrateJournalEntry)));
  return all.filter(e => e !== null && e.date === date);    // …puis filtre EN JS
}
```

---

## 3. Mécanisme de migration et versioning

### Moteur — `src/data/migrations/runner.ts`
```typescript
type MigrationFn = (data: any) => unknown;
type MigrationMap = Record<number, MigrationFn>;  // clé N = "migre v.N → v.N+1"

export function createMigrator<TUnion, TLatest extends TUnion>(
  schema: z.ZodType<TUnion, z.ZodTypeDef, any>,
  migrations: MigrationMap,
  latestVersion: number,
): (raw: unknown) => TLatest {
  return function migrate(raw: unknown): TLatest {
    const parsed = schema.parse(raw);   // 1er passage : parse l'union → connaît `v`
    let data: any = parsed;
    while ((data as { v: number }).v < latestVersion) {   // marche la chaîne
      const currentVersion = (data as { v: number }).v;
      const step = migrations[currentVersion];
      if (!step) throw new Error(`No migration defined from version ${currentVersion} to ${currentVersion + 1}`);
      data = step(data);
    }
    return data as TLatest;
  };
}
```

### Registre central — `src/data/migrations/registry.ts`
```typescript
export const migrators = {
  'sport.workoutLog':    migrateWorkoutLog,
  'sport.routine':       migrateRoutine,
  'sport.session':       migrateWorkoutSession,
  'nutrition.meal':      migrateMealEntry,
  'anthropo.measurement':migrateMeasurement,
  'islam.prayer':        migratePrayerLog,
  'islam.quran':         migrateQuranProgress,
  'journal.entry':       migrateJournalEntry,
  'coach.rule':          migrateRule,
  'coach.assessment':    migrateAssessment,
  'planning.task':       migrateScheduleTask,
  'planning.schedule':   migrateDaySchedule,
  'activity.record':     migrateActivityRecord,
  'activity.summary':    migrateDailySummary,
  'sleep.entry':         migrateSleepEntry,
} as const;
```

### Comment Zod intercepte un ancien payload et applique des défauts à la lecture

Trois mécanismes superposés, **tous appliqués au moment du `get()`** (migration paresseuse au read —
il n'y a **aucune** migration batch ; l'écriture stocke toujours la dernière version) :

1. **`z.discriminatedUnion('v', […])`** : le 1er `schema.parse(raw)` lit le champ `v` du JSON brut et
   route vers le bon sous-schéma. ⚠️ Implique qu'un payload **sans champ `v`** fait échouer le parse
   (aucun membre d'union ne matche).
2. **`.default(x)`** : remplit un champ absent à la lecture. Ex. — `kind: SetKindSchema.default('working')` :
   un set legacy sans `kind` devient `working` au parse, sans migration de version.
3. **`.optional()`** : champ retro-compatible — son absence est tolérée, pas de migration requise
   (commentaire explicite dans `mealEntry.ts` : « rétro-compatibles, pas de migration requise »).

Exemples de fonctions de migration (interception + valeurs dérivées) :
```typescript
// mealEntry — V1→V2 : dérive mealSlot depuis l'ancien enum meal
1: (data: MealEntryV1): MealEntryV2 => ({
  ...data, v: 2,
  mealSlot: data.meal ? (MEAL_TYPE_TO_SLOT[data.meal] ?? 5) : 5,
  mealLabel: data.meal ?? undefined,
}),

// prayerLog — V1→V2 : 'fajr' (5 prières) devient 'sobh', +fajr_sunnah/witr=false, +scores
1: (data: PrayerLogV1): PrayerLogV2 => {
  const prayers = { fajr_sunnah:false, sobh:data.prayers.fajr ?? false, /* … */ witr:false };
  return { v:2, id:data.id, date:data.date, savedAt:data.savedAt, prayers, ...computePrayerScores(prayers) };
},

// workoutSession — V2→V3 : calcule tonnage/durationMin/rpe à la volée
2: (data: WorkoutSessionV2): WorkoutSessionV3 => ({
  ...data, v: 3,
  tonnage: computeTonnage(data.exercises),
  durationMin: data.endTime && data.startTime ? Math.round((data.endTime - data.startTime)/60000) : 0,
  rpe: data.sessionRPE,
}),
```

---

## 4. Abstraction de stockage

### Interface exacte — `src/data/storage/IStorage.ts`
```typescript
export type ParseFn<T> = (raw: unknown) => T;

export interface ITransaction {
  get<T>(key: string, parse: ParseFn<T>): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface IStorage {
  get<T>(key: string, parse: ParseFn<T>): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  listFiltered(prefix: string, where: Record<string, unknown>): Promise<string[]>;
  listByPrefix(prefix: string, limit?: number, offset?: number): Promise<string[]>;
  aggregate(prefix: string, field: string, op: 'SUM'|'AVG'|'COUNT', where?: Record<string, unknown>): Promise<number>;
  query<T>(table: string, where: Partial<T>, parse: ParseFn<T>): Promise<T[]>;
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;
  clear(): Promise<void>;
  exportAll(): Promise<string>;
  importAll(data: Record<string, unknown>): Promise<void>;
  getSizeBytes(): Promise<number>;
}

export const MAX_DB_BYTES = 10 * 1024 * 1024;   // quota 10 MB → DbFullError au-delà
```

### Implémentation SQLite — `src/data/storage/SqliteStorage.ts` — où s'exécute le `CREATE TABLE`

Initialisation via **`expo-sqlite`** (`openDatabaseAsync`, JSI). Tout passe par **une seule table générique `kv`**
— les requêtes d'init (PRAGMA + CREATE TABLE) sont dans `open()` :

```typescript
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export class SqliteStorage implements IStorage {
  private db: SQLiteDatabase | null = null;
  private readonly dbName: string;
  constructor(config: SqliteStorageConfig = {}) { this.dbName = config.dbName ?? 'awan'; }

  async open(): Promise<void> {
    this.db = await openDatabaseAsync(this.dbName);
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS kv (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }
```

Lecture/écriture et requêtes JSON (c'est ici que se jouent les index potentiels) :
```typescript
async get<T>(key, parse): Promise<T|null> {
  const row = await this.handle.getFirstAsync('SELECT value FROM kv WHERE key = ?', [key]);
  return row ? parse(JSON.parse(row.value)) : null;   // ← parse = migrateXxx
}

async set<T>(key, value): Promise<void> {
  const json = JSON.stringify(value);
  const current = await this.getSizeBytes();
  if (current + json.length > MAX_DB_BYTES) throw new DbFullError(current);
  await this.handle.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, json]);
}

// Filtre par préfixe + égalité sur champ JSON (utilisé par getByDate nutrition)
async listFiltered(prefix, where): Promise<string[]> {
  let sql = 'SELECT key FROM kv WHERE key LIKE ?';
  const params = [`${prefix}%`];
  for (const [k, v] of Object.entries(where)) {
    sql += ` AND json_extract(value, '$.${k}') = ?`;   // ← extraction JSON, PAS d'index
    params.push(v);
  }
  return (await this.handle.getAllAsync(sql, params)).map(r => r.key);
}

// Agrégation SQL native (SUM/AVG/COUNT) sur champ JSON
async aggregate(prefix, field, op, where?): Promise<number> {
  const extract = op === 'COUNT' ? '1' : `CAST(json_extract(value, '$.${field}') AS REAL)`;
  let sql = `SELECT ${op}(${extract}) as result FROM kv WHERE key LIKE ?`;
  // … + json_extract pour chaque clause where
}
```

### Faits structurants pour l'index natif
- **Schéma physique = 1 table `kv(key PRIMARY KEY, value TEXT)`.** Aucune colonne typée, aucun index
  secondaire. Le seul index est le `PRIMARY KEY` sur `key`.
- Le filtrage par date (`listFiltered`, `aggregate`) se fait par **`json_extract(value, '$.date')` sur scan
  `key LIKE 'prefix%'`** — non indexable en l'état (pas de colonne générée / index d'expression).
- `getSizeBytes()` = `PRAGMA page_count × page_size`, caché 2 s.
- `transaction()` = `withTransactionAsync`. `clear()` = `DELETE FROM kv`.

### Câblage d'init — `src/data/storage/storageService.ts` (où `open()` est appelé)
**Deux instances de DB séparées** :
```typescript
async function createStorage(role: 'app' | 'user'): Promise<IStorage> {
  if (isNativePlatform()) {                          // android | ios
    const { SqliteStorage } = await import('./SqliteStorage');   // lazy → pas de bundle web/test
    const sqlite = new SqliteStorage({ dbName: role === 'app' ? 'awan-app' : 'awan-user', encrypted: false });
    await sqlite.open();                             // ← CREATE TABLE exécuté ICI
    return sqlite;
  }
  if (typeof indexedDB !== 'undefined') { /* IndexedDBStorage (web) */ }
  /* sinon MemoryStorage (tests) */
}
```
- `getUserStorage()` → DB **`awan-user`** (données perso). `getStorage()` en est l'alias — **tous les services pointent dessus**.
- `getAppStorage()` → DB **`awan-app`** (catalogues read-only).
- Migration one-shot legacy : ancienne DB unique `awan` → `awan-user`, gardée par le flag `awan.migration.multidb` dans `safeStorage`.

---

## Synthèse — 3 points qui conditionnent le plan hybride (reconnexion DailyCanvas + index SQLite)

1. La date n'est **dans la clé** que pour Prière (`islam.prayer.<date>`) et Coran session. Partout ailleurs
   c'est un **UUID pur** + date en champ JSON.
2. Journal et Sport filtrent la date **en JS après full-scan** (≠ Nutrition/Coran qui utilisent `json_extract`
   SQL) — asymétrie de performance directement pertinente pour le `DailyCanvas`.
3. Aucun index secondaire n'existe : tout repose sur `kv.key PRIMARY KEY` + `json_extract` non indexé sur
   scan `LIKE`.
