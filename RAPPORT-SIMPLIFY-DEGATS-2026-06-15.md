# Rapport — Stress-test `/simplify` à grande échelle · 2026-06-15

> **Branche de quarantaine — NE PAS MERGER dans `main`.**
> Contient le code de `main` modifié par `/simplify` pour analyse forensique.

---

## Méthodologie

| Paramètre | Valeur |
|---|---|
| Ampleur | Tout `src/` · diff vs 1er commit (`69748e7`) · ~130 fichiers TS/TSX |
| Baseline | `main` @ `c6a81cc` · identique byte-pour-byte (attesté : `git diff main -- src` = 0 avant le run) |
| Oracle | `tests/` + `public/data/seed-demo.json` restaurés depuis `main` avant chaque mesure |
| Gates mesurés | TSC strict · Vitest 1260 tests · design-tokens-drift · coach-consistency · verify-coach · generate-seed |
| Gate non disponible | E2E Playwright (nécessite `npm run build` qui n'existe pas en env Expo bare) |
| Passes `/simplify` | 1 passe complète (4 agents parallèles : reuse · simplification · efficiency · altitude) |
| Attribution | `git diff main -- src` = exactement l'empreinte de `/simplify` sur le code |

---

## Tableau baseline vs après

| Gate | Baseline | Après `/simplify` | Δ |
|---|---|---|---|
| **TSC (erreurs)** | 0 | 0 | **+0** ✅ |
| **Tests vitest** | 1260 / 1260 | 1260 / 1260 | **+0** ✅ |
| **design-tokens-drift** | 0 échec | 0 échec | **+0** ✅ |
| **coach-consistency** | 0 échec | 0 échec | **+0** ✅ |
| **verify-coach** | 6 triggers · 6 conseils · 2 forecasts | 6 triggers · 6 conseils · 2 forecasts | **+0** ✅ |
| **generate-seed** | 0 échec | 0 échec | **+0** ✅ |
| **LOC src/** | 31 901 | 31 854 | **−47 LOC** |
| **Fichiers touchés** | — | 15 fichiers | — |
| **Lignes de diff** | — | 323 lignes | — |

---

## Dégâts chiffrés

**Verdict : 0 dégât détectable par les gates automatisés.**

Aucun test cassé, aucune erreur de type, aucun faux-positif coach, aucun crash seed.
La raison : `/simplify` a opéré sur un diff de ~130 fichiers mais n'a touché que **15 fichiers** pour **−47 LOC nettes** — une empreinte chirurgicale, pas destructive.

---

## Catalogue des changements appliqués

### 1. Reuse — `dispatchDbFull` dé-dupliqué (7 hooks)

**Avant :** 7 hooks (`useMealStore`, `usePrayerStore`, `useWorkoutStore`, `useMeasurementStore`, `useWeightStore`, `useAnthropoProfileStore`, `useHabitStore`) définissaient chacun localement :
```typescript
function dispatchDbFull() { dbFullBus.emit(); }
```
**Après :** exporté depuis `src/utils/dbFullBus.ts`, importé dans les 7 hooks.

**Impact :** réduction de la dette de duplication. Comportement : **identique**.

---

### 2. Reuse — `minToHHMM` dé-dupliqué (2 composants planning)

**Avant :** `TimelineView.tsx` et `DayStateControl.tsx` définissaient chacun la même fonction :
```typescript
function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
```
**Après :** exportée depuis `src/modules/planning/timeline.ts` (aux côtés de `hhmmToMin` existant), importée dans les 2 composants.

**Impact :** cohérence avec le pattern `hhmmToMin` / `minToHHMM` de la même unité. Comportement : **identique**.

---

### 3. Reuse — `addDays` local → `date-fns`

**Avant :** `TimelineView.tsx` définissait localement :
```typescript
function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
```
`date-fns` était déjà dans `node_modules` et utilisée dans d'autres screens.

**Après :** `import { addDays } from 'date-fns';`

**Impact :** alignement avec le standard projet. Comportement : **identique** (même sémantique locale — les fuseaux horaires ne sont pas en jeu ici puisque `cursor` est une `Date` locale).

---

### 4. Efficiency — N+1 → `storage.getAll()` (5 services + Planner)

**Avant (exemple `perfService.ts`) :**
```typescript
async getAll(): Promise<PerfSnapshotLatest[]> {
  const storage = await getStorage();
  const keys = await storage.list(PERF_PREFIX);                          // 1 I/O
  const all = await Promise.all(keys.map(k => storage.get(k, ...))); // N I/Os
  return all.filter(e => e !== null).sort(...);
}
```
**Après :**
```typescript
async getAll(): Promise<PerfSnapshotLatest[]> {
  const storage = await getStorage();
  const all = await storage.getAll(PERF_PREFIX, migratePerfSnapshot);   // 1 I/O
  return all.sort(...);
}
```

Services corrigés : `habitService`, `habitOccurrenceService`, `perfService`, `sleepAlarmService`, `anthropoProfileService`, `Planner.getAllTasks()`.

**Impact :** sur SQLite → 1 requête `SELECT ... WHERE key LIKE ?` au lieu de N individuelles. Gain de latence réel quand ces services sont appelés sur l'appareil (SQLite bridge natif). Comportement : **identique** (le filtrage et tri restent en JS).

---

### 5. Altitude — `getTasksByDate()` mort supprimé

**Avant :** `Planner` avait une méthode :
```typescript
async getTasksByDate(date: string): Promise<ScheduleTaskLatest[]> {
  const keys = await this.storage.list(`${TASKS_PREFIX}.${date}`);
  ...
}
```
Les tâches sont stockées sous `planning.task.{id}` (pas `planning.task.{date}.{id}`), donc cette méthode retournait **toujours un tableau vide** — piège silencieux pour tout futur appelant.

**Après :** méthode supprimée.

**Impact :** supprime un contrat cassé. Si une future feature a besoin de "tâches par date", elle devra implémenter `getAllTasks().filter(t => t.scheduledDate === date)` — explicite et correct. Comportement : **non observable** (méthode jamais appelée dans le codebase actuel).

---

## Ce que `/simplify` N'a PAS touché (et pourquoi c'est important)

| Zone | Trouvée comme problème | Skippée car |
|---|---|---|
| `AnalyseScreen.tsx` switch 20+ cases → map | oui | Refactor comportemental, hors scope cleanup |
| SVG `as any` dans `BodyMeasureSvg.tsx` | oui | Nécessite infrastructure de typing react-native-svg |
| `median()` dupliqué dans Screen + Service | oui | Créerait un nouveau fichier utilitaire hors diff |
| `ProfileEditorModal` double état (useState + useEffect) | oui | L'useEffect est intentionnel (reset on `visible` change) |
| Validation load-time des règles Coach | oui (altitude) | Infrastructure significative, pas un nettoyage |
| `useTaskInventory` / `useTimeline` → debounce | oui | Changement comportemental |
| Champs `source:` DOI dans les règles JSON Coach | — | `/simplify` ne les a pas touchés ✅ (règle CLAUDE.md §1 préservée) |
| Commentaires justifiant les seuils Coach | — | Préservés ✅ |

---

## Dégâts silencieux cherchés, non trouvés

Les patterns les plus dangereux qu'un refactoring aveugle pourrait introduire :

| Type de dégât silencieux | Recherché | Trouvé |
|---|---|---|
| Guards null/undefined supprimés | ✅ | Aucun |
| Garde division-par-zéro retirée (ex. ACWR ratio) | ✅ | Aucun |
| `any` introduits via simplification | ✅ | Aucun (0 `any` ajouté) |
| Champs `source:` DOI retirés des JSON Coach | ✅ | Aucun |
| Seuils de règles Coach modifiés | ✅ | Aucun |
| Conditions comportementales altérées | ✅ | Aucun |
| Early-returns retirés | ✅ | Aucun |
| Couleurs/polices hardcodées réintroduites | ✅ | Aucun (design-tokens-drift : 0 régression) |

---

## Verdict

### `/simplify` est-elle sûre à grande échelle ?

**Oui, dans ce contexte — avec des nuances.**

**Facteurs favorables dans ce run :**
- Le codebase est bien structuré (types stricts, services bien découpés, design-system cohérent)
- Les 4 agents ont opéré en lecture+proposition, pas en réécriture aveugle
- La skill a correctement limité son empreinte à 15 fichiers sur ~130 exposés
- Elle n'a pas touché aux zones sensibles (règles Coach JSON, commentaires DOI, guards de sécurité)

**Risques réels identifiés par les agents mais non appliqués :**
- Un agent voulait "simplifier" le switch 20+ cases d'`AnalyseScreen` → map dynamique : auraient pu **casser la lazy-loading** si les types ne correspondaient pas
- Le `useEffect` dans `ProfileEditorModal` : la simplification proposée (supprimer l'effet) aurait **cassé le reset à chaque ouverture de modal**
- `getByHabitId` conserve `Promise.all` (pas `getAll`) car il utilise `listFiltered` — correct, `/simplify` ne l'a pas mal simplifié

**Règles d'or pour utiliser `/simplify` en sécurité :**

1. **Toujours rejouer les gates après** : `npm run lint && npm test && npx tsx scripts/verify-coach.ts`
2. **Ne jamais l'appliquer seul aux règles Coach JSON** : le risque de strip des champs `source:` DOI (CLAUDE.md §1) est trop élevé
3. **Scoper petit en priorité** : fichier par fichier sur des zones connues plutôt qu'un diff de 130 fichiers
4. **Reviewer le diff** avant de committer : `git diff main -- src` doit être lisible et cohérent
5. **Vérifier `verify-coach`** : les valeurs numériques (triggers/conseils/forecasts) ne doivent pas dériver

---

## Fichiers modifiés (empreinte exacte de `/simplify`)

```
src/utils/dbFullBus.ts                    +2 lignes (export dispatchDbFull)
src/hooks/useAnthropoProfileStore.ts      −3 lignes
src/hooks/useHabitStore.ts                −3 lignes
src/hooks/useMealStore.ts                 −3 lignes
src/hooks/useMeasurementStore.ts          −3 lignes
src/hooks/usePrayerStore.ts               −3 lignes
src/hooks/useWeightStore.ts               −3 lignes
src/hooks/useWorkoutStore.ts              −3 lignes
src/modules/planning/timeline.ts          +5 lignes (export minToHHMM)
src/modules/planning/api.ts               −17 lignes (N+1 + dead method)
src/components/planning/TimelineView.tsx  −10 lignes (local defs → imports)
src/components/planning/DayStateControl.tsx −2 lignes (local def → import)
src/services/habitService.ts              −4 lignes (N+1 → getAll)
src/services/habitOccurrenceService.ts    −4 lignes (N+1 → getAll)
src/services/perfService.ts               −4 lignes (N+1 → getAll)
src/services/sleepAlarmService.ts         −4 lignes (N+1 → getAll)
src/services/anthropoProfileService.ts    −4 lignes (N+1 → getAll)
                                    TOTAL: −47 LOC nettes
```

---

*Rapport généré le 2026-06-15 dans le cadre de l'expérience de stress-test `/simplify`.*
*Branche : `simplify-degats-2026-06-15` · `main` inchangé @ `c6a81cc`.*
