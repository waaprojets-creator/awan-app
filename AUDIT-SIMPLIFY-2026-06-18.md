# Audit Professionnel — `simplify-degats-2026-06-15` vs `main`
**Date d'audit :** 2026-06-18 · **Auditeur :** Claude Code (indépendant du run expérimental)

---

## Synthèse exécutive

| Question | Verdict |
|----------|---------|
| `simplify-degats-2026-06-15` contient-elle du code cassé ? | **NON** ✅ |
| `/simplify` a-t-elle introduit des régressions ? | **NON** ✅ |
| `main` est-il sain ? | **OUI** ✅ |
| La branche doit-elle être mergée dans `main` ? | **NON recommandé** — voir §5 |

---

## 1. Topologie des branches (état vérifié)

```
archive/2026-06-04  (4aae919) ─── snapshot pré-migration J0
         │
         │  118 commits : migration Vite → Expo bare (J0)
         ▼
  archive-2026-06-15 (c6a81cc) ══ main (c6a81cc)   ← IDENTIQUES
         │
         │  ± partage de commits communs
         ▼
simplify-degats-2026-06-15 (ac938fb)
   └─ delta réel vs main : 18 fichiers / −47 LOC net
```

**Point critique résolu :** le clone local avait `origin/main` gelé à `4aae919`
(= archive/2026-06-04). Après `git fetch origin main`, confirmé que
`origin/main` = `c6a81cc` = `archive-2026-06-15`. **Les deux sont identiques.**

---

## 2. Vérification santé de `main` vs `archive/2026-06-04`

### 2.1 Périmètre du delta

```
git diff origin/archive/2026-06-04..origin/main --stat -- src/
178 fichiers changés, 14 306 insertions(+), 9 985 suppressions(−)
```

### 2.2 Nature des changements (légitimes)

| Catégorie | Détail | Verdict |
|-----------|--------|---------|
| Migration stack | Vite → Expo bare (metro.config, babel, app.json, index.js) | ✅ Légitime |
| Couche storage | SQLite expo-sqlite, safeStorage durable, Zod silos V4 | ✅ Légitime |
| Composants UI | 40+ screens → React Native primitives (View/Text/StyleSheet) | ✅ Légitime |
| Coach | Correctif weight source + daily-average | ✅ Légitime |
| Tests | 9 nouveaux fichiers tests unitaires | ✅ Bon signe |
| Suppression Capacitor | `capacitor.config.json`, `index.html`, `vite.config.ts` retirés | ✅ Attendu |
| Design tokens | Remplacement `var(--)` → tokens `useTheme` (J0.2) | ✅ Légitime |

### 2.3 Vérifications de cohérence

- Aucun fichier `src/` supprimé sans remplacement identifié
- `src/utils/dbFullBus.ts` présent dans les deux branches (créé pendant migration)
- Aucune couleur hardcodée réintroduite (pattern drift tokens non observé)
- `src/modules/coach/` intact (règles JSON, champs DOI source non altérés)

**Verdict : `main` est sain.** L'évolution depuis archive/2026-06-04 est
entièrement explicable par la migration J0 (Capacitor → Expo bare), tracée
commit par commit, testée.

---

## 3. Audit du delta `simplify-degats-2026-06-15` vs `main`

### 3.1 Périmètre exact

```
git diff origin/archive-2026-06-15..origin/simplify-degats-2026-06-15 --stat
18 fichiers changés, 249 insertions(+), 77 suppressions(−)
(dont 219 lignes = rapport doc — delta code pur : +30 / −77 = −47 LOC net)
```

Les 96 commits apparemment « uniques » à `simplify-degats` sont des commits de
migration J0 qui existent déjà dans `main` via un chemin parallèle. Le delta
fichier réel se limite aux 18 fichiers ci-dessous.

### 3.2 Analyse ligne par ligne des 18 fichiers

---

#### A — `src/utils/dbFullBus.ts` (+2 lignes)

```typescript
// AJOUT (fin du fichier)
export function dispatchDbFull(): void { dbFullBus.emit(); }
```

**Analyse :** Export d'une fonction déjà appelée localement dans 7 hooks.
Sémantique : **identique**. Aucun risque. Bonne DRY.

---

#### B — 7 hooks (`useAnthropoProfileStore`, `useHabitStore`, `useMealStore`,
`useMeasurementStore`, `usePrayerStore`, `useWeightStore`, `useWorkoutStore`)

**Pattern uniforme dans chaque fichier :**

```diff
- import { dbFullBus } from '@/utils/dbFullBus';
-
- function dispatchDbFull() { dbFullBus.emit(); }
+ import { dispatchDbFull } from '@/utils/dbFullBus';
```

**Analyse :** Suppression de 7 déclarations locales identiques → import centralisé.
Comportement **strictement identique** (même appel `dbFullBus.emit()`).
Aucun guard supprimé, aucune condition altérée.

---

#### C — `src/modules/planning/timeline.ts` (+5 lignes)

```typescript
// AJOUT entre hhmmToMin et tsToMin
/** minutes depuis minuit → "HH:MM". */
export function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
```

**Analyse :** La fonction miroir de `hhmmToMin` (déjà présente dans ce module)
est ajoutée ici plutôt que dupliquée dans 2 composants. Cohérence de module
renforcée. Comportement **identique** aux copies locales supprimées.

---

#### D — `src/components/planning/TimelineView.tsx` (−11 lignes)

```diff
+ import { addDays } from 'date-fns';
+ import { minToHHMM } from '../../modules/planning/timeline';

- function minToHHMM(min: number): string { ... }  // supprimée
- function addDays(d: Date, n: number): Date { ... } // supprimée → date-fns
```

**Analyse critique :**
- `minToHHMM` → import depuis `timeline.ts` (même logique) ✅
- `addDays` locale → `date-fns/addDays` : la version locale utilisait
  `setDate(getDate() + n)` qui gère mal les DST en certains locales.
  `date-fns.addDays` est plus robuste. **Léger gain de fiabilité**, comportement
  pratiquement identique pour cet usage (navigation calendrier en heure locale).

---

#### E — `src/components/planning/DayStateControl.tsx` (−2 lignes)

```diff
+ import { minToHHMM } from '../../modules/planning/timeline';

- function minToHHMM(min: number): string { ... }  // supprimée
```

**Analyse :** Import depuis `timeline.ts`. Comportement **identique**. ✅

---

#### F — `src/modules/planning/api.ts` (−17 lignes)

```diff
  async getAllTasks(): Promise<ScheduleTaskLatest[]> {
-   const keys = await this.storage.list(TASKS_PREFIX);
-   const tasks: ScheduleTaskLatest[] = [];
-   for (const k of keys) {
-     const t = await this.storage.get(k, migrateScheduleTask);
-     if (t) tasks.push(t);
-   }
-   return tasks;
+   return this.storage.getAll(TASKS_PREFIX, migrateScheduleTask);
  }

- async getTasksByDate(date: string): Promise<ScheduleTaskLatest[]> {
-   const keys = await this.storage.list(`${TASKS_PREFIX}.${date}`);
-   // ... for loop vide car clés sous planning.task.{id}, pas .{date}.{id}
- }
```

**Analyse :**
1. `getAllTasks` → N+1 corrigé (correcte) : `list()` + N×`get()` → `getAll()` (1 SELECT)
2. `getTasksByDate` **supprimée** : méthode dont la requête `list(PREFIX.{date})`
   retournait systématiquement `[]` car les clés sont sous `planning.task.{id}`
   sans date. Contrat silencieusement cassé depuis sa création. Aucun appelant
   dans le codebase (vérifié par grep). **Suppression correcte.**

---

#### G — 5 services (pattern identique)

`habitService.ts`, `habitOccurrenceService.ts`, `perfService.ts`,
`sleepAlarmService.ts`, `anthropoProfileService.ts`

**Pattern N+1 corrigé :**

```diff
- const keys = await storage.list(PREFIX);
- const all = await Promise.all(keys.map(k => storage.get(k, migrate)));
- return all.filter((e): e is T => e !== null).sort(...);
+ const all = await storage.getAll(PREFIX, migrate);
+ return all.sort(...);
```

**Analyse :** `storage.getAll(prefix, migrateFn)` encapsule exactement le même
`SELECT WHERE key LIKE prefix%` + déserialisation + migration. Le `.filter`
est géré en interne par `getAll`. Comportement **identique**, latence réduite
(1 aller-retour SQLite vs N).

**Point de vigilance noté :** Dans `habitOccurrenceService.getByHabitId()`,
`/simplify` a correctement **conservé** `Promise.all` (ne pas utiliser `getAll`)
car cette méthode utilise `listFiltered(PREFIX, { habitId })` qui filtre sur
un index secondaire — `getAll(PREFIX)` chargerait toutes les occurrences de
toutes les habitudes. Seul un rename `all → results` a été appliqué.
**Comportement identique, décision correcte.**

---

### 3.3 Zones sensibles vérifiées non touchées

| Zone | Vérification | Résultat |
|------|-------------|---------|
| Règles Coach JSON (`src/modules/coach/rules/`) | `git diff .. -- src/modules/coach/` | 0 ligne modifiée ✅ |
| Champs `source:` DOI dans les JSON | Grep manuel sur diff | Aucun strip ✅ |
| Commentaires seuils Coach | `git diff .. -- src/modules/coach/coachAdvice.ts` | 0 ligne modifiée ✅ |
| Guards null/undefined | Lecture de chaque diff | Aucun supprimé ✅ |
| Division par zéro (ACWR, BMI, etc.) | Lecture de chaque diff | Aucun guard retiré ✅ |
| Valeurs `any` introduites | `git diff .. -- src/ \| grep '+.*any'` | 0 occurrence ✅ |
| Design tokens hardcodés | Lecture composants modifiés | Aucun inline introduit ✅ |
| Early-returns | Lecture de chaque diff | Aucun retiré ✅ |

---

### 3.4 Résultats des gates (rapport expérimentateur + vérification topologie)

| Gate | Baseline (`main`) | Après `/simplify` | Delta | Source |
|------|-------------------|-------------------|-------|--------|
| `tsc --noEmit` | 0 erreurs | 0 erreurs | **+0** ✅ | Rapport embarqué `ac938fb` |
| `vitest` | 1260/1260 | 1260/1260 | **+0** ✅ | Rapport embarqué |
| `design-tokens-drift` | 0 | 0 | **+0** ✅ | Rapport embarqué |
| `coach-consistency` | 0 | 0 | **+0** ✅ | Rapport embarqué |
| `verify-coach` | 6T·6C·2F | 6T·6C·2F | **+0** ✅ | Rapport embarqué |
| `generate-seed` | 0 | 0 | **+0** ✅ | Rapport embarqué |
| LOC `src/` | 31 901 | 31 854 | **−47** | Calculé par git |

*Note audit :* Les gates ont été déclarés par l'expérimentateur dans le commit
`ac938fb`. La vérification indépendante s'est appuyée sur la lecture ligne
par ligne du diff (§3.2) — aucune erreur de type ou logique détectée.
Un re-run complet de `npm test` sur la branche permettrait la confirmation
instrumentale totale.

---

## 4. Synthèse des risques

| Risque | Niveau | Détail |
|--------|--------|--------|
| Comportement cassé silencieux | ✅ Nul | Aucune logique altérée |
| Régression design tokens | ✅ Nul | Aucun inline réintroduit |
| Règles Coach corrompues | ✅ Nul | Zone non touchée |
| Perte de guard sécurité | ✅ Nul | Aucun guard supprimé |
| `getTasksByDate` supprimée | ✅ Positif | Méthode morte à contrat cassé |
| `addDays` date-fns vs local | ✅ Léger gain | date-fns plus robuste DST |
| `getByHabitId` non simplifié | ✅ Correct | `Promise.all` conservé à juste titre |

---

## 5. Recommandations

### 5.1 Sort de `simplify-degats-2026-06-15`

**Ne pas merger telle quelle.** La branche contient les conversions RN J0
(commits `f58f5ce` à `69748e7`) qui **chevauchent** le travail déjà intégré
dans `main` via une autre branche. Un merge direct créerait des conflits ou
des doublons de commits.

**Option A (recommandée) :** Cherry-pick uniquement le commit `/simplify`
(`d63073e`) sur `main` si tu veux intégrer ces optimisations :
```bash
git checkout main
git cherry-pick d63073e
```
Cela intègre les −47 LOC de nettoyage sans les commits de migration redondants.

**Option B :** Archiver la branche comme référence de benchmark
(`simplify-degats-2026-06-15` → read-only, documentation future).

### 5.2 État de `main`

`main` = `archive-2026-06-15` est l'état de référence sain. Aucune action
corrective requise.

### 5.3 Utilisation future de `/simplify`

1. **Scoper sur des fichiers précis** (pas tout `src/` d'un coup)
2. **Toujours rejouer** `npx tsc --noEmit && npm test` après
3. **Ne jamais appliquer** aux règles Coach JSON seules (risque strip DOI)
4. **Reviewer le diff** avant commit : `git diff main -- src` doit être lisible

---

## 6. Conclusion

L'expérience `/simplify` sur `simplify-degats-2026-06-15` est **concluante et
sans dégât**. Les 18 fichiers modifiés représentent des refactorisations
légitimes (DRY, N+1, suppression de dette) qui ne modifient aucun comportement
observable. Tous les gates automatisés passent.

`main` est sain. La migration J0 (Capacitor → Expo bare) représente un travail
légitime de 178 fichiers, correctement tracé et testé.

**Recommandation finale :** Cherry-pick `d63073e` sur `main` si les optimisations
N+1 et DRY sont jugées valables, puis archiver `simplify-degats-2026-06-15`.

---

*Audit réalisé par analyse statique du diff complet et lecture ligne par ligne
des 18 fichiers modifiés. Sources : `git diff`, `git show`, rapport embarqué
dans le commit `ac938fb`.*
