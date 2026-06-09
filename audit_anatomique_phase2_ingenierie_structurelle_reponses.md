# 🏗️ RÉPONSE CONSOLIDÉE — Audit anatomique Phase 2 : Ingénierie structurelle

**Projet :** AWAN — Stack **Expo bare SDK 52 / React Native 0.76.7**
**Date de réponse :** 2026-06-09
**Document traité :** *Dossier d'audit technique AWAN, Phase 2 — Démantèlement des God Components (> 1000 lignes)*
**Méthode :** analyse statique du commit courant (branche `claude/practical-fermat-bhp35s`). Chaque chiffre est mesuré sur le fichier réel (protocole anti-hallucination CLAUDE.md — lecture avant énoncé).

---

## 0. CONSTAT DÉCISIF (à lire en premier)

> **Les trois monolithes ne sont pas des « God Components » — ce sont des « God Files ».**

La distinction est structurante pour tout le plan de remédiation : les 3 fichiers > 1 000 lignes sont **déjà découpés en interne** en sous-composants nommés et en helpers purs. Le problème n'est **pas** un composant unique de 1 980 lignes au rendu indivisible, mais **~20 composants atomiques cohabitant dans un seul fichier**. La dette est donc **physique** (un fichier à éclater) et non **logique** (une fonction à refactorer). C'est une bonne nouvelle : l'extraction est mécanique et à faible risque.

| Fichier | Lignes | Sous-composants internes déjà définis | Helpers purs internes | `StyleSheet.create` |
|---|---|---|---|---|
| `src/screens/SportScreen.tsx` | **1 980** | **20** (`CycleScoreSection` … `WorkoutHistory`) | **5** | 1 (`ss`, 17 entrées) |
| `src/screens/NutritionScreen.tsx` | **1 237** | **5** (`ProgressBar` … `EditMealModal`) | **7** | 1 (`sn`, ~17 entrées) |
| `src/screens/analyse/TempsTab.tsx` | **1 036** | **4** (`ClockPie`, `StackedBars`, `StackedArea`, `Legend`) | **5** | **0** (SVG : `fill`/`stroke`) |

> ⚠️ **Dette transversale détectée hors périmètre du questionnaire**, mais bloquante pour la modularisation : les deux contextes legacy `AppStateContext` / `DailyContext` sont des **shims `@ts-nocheck` morts** (cf. §4.2). Tant qu'ils ne sont pas purgés, toute extraction recopie du code mort.

---

## SECTION 4 — DÉCOMPOSITION DES MONOLITHES (> 1000 LIGNES)

### 4.1 Cartographie des God Components — ratios Logique / UI / Styles

Ratios estimés par **attribution de plages de lignes** (lecture des bornes de chaque fonction/composant), pas par classifieur ligne-à-ligne — marge ± 5 %. La colonne « Styles dédiés » mesure le `StyleSheet.create`; la note rappelle que **le style effectif est majoritairement inline**, noyé dans l'UI.

#### `SportScreen.tsx` — 1 980 lignes

| Couche | Part | Preuve mesurée |
|---|---|---|
| **Logique métier** | **≈ 35 %** (~690 l.) | 5 helpers purs (`setKindColor`, `formatTime`, `computeOneRM`/Epley, `loadBestOneRMs`, `volumeToMuscleValues` = 87 l.) + orchestrateur : **10 `useState`**, **3 `useEffect`**, **1 `useMemo`** (`nextRoutine` = rotation de cycle A/B/C/D), **23 `useCallback`** (dont `startWorkout` avec auto-progression S7, `finishWorkout` avec scoring). Appels services : `WorkoutService`, `PeriodizationService`, `scoreSession`, `suggestProgression`, `computeCycleScore`. |
| **Rendu UI** | **≈ 63 %** (~1 250 l.) | **150 `<View>`**, **136 `<Text>`**, **57 `<Touch>`**, **10 `<ScrollView>`**, **5 `<Modal>`**, **38 `.map()`**. |
| **Styles dédiés** | **≈ 1 %** (18 l.) | `const ss = StyleSheet.create({…})` (17 entrées). **⚠️ 373 props `style={…}` inline** → le style réel n'est PAS dans `ss`, il est dispersé dans le JSX. |

#### `NutritionScreen.tsx` — 1 237 lignes

| Couche | Part | Preuve mesurée |
|---|---|---|
| **Logique métier** | **≈ 40 %** (~495 l.) | 7 helpers (`computeProfile`, `calcMacros`, `statusColor`, `loadProfile`/`saveProfile`, `shiftDate`, `formatDayLabel`) + orchestrateur le plus chargé en état : **17 `useState`**, **5 `useEffect`** (dont agrégations brutes, cf. §5.2), **4 `useMemo`** (`slotSummaries`, `mealEntries`). Services : `WaterService`, `estimateAdaptiveTDEE`, `buildWeeklyNutritionReport`, `scoreMeal`. |
| **Rendu UI** | **≈ 58 %** (~720 l.) | **100 `<View>`**, **107 `<Text>`**, **24 `<Touch>`**, **4 `<Modal>`** (Onboarding, AddMeal, EditMeal, DateSelect). |
| **Styles dédiés** | **≈ 1,5 %** (17 l.) | `const sn = StyleSheet.create({…})`. **⚠️ 240 props `style={…}` inline.** |

#### `TempsTab.tsx` — 1 036 lignes *(profil atypique : data-viz SVG)*

| Couche | Part | Preuve mesurée |
|---|---|---|
| **Logique métier** | **≈ 55 %** (~570 l.) | Dominante. 5 helpers de transformation (`computeDayLayers`, `computeDaySlots`, `computePeriod`, `getLayers`, `hhmmToMin` = ~150 l.) **+ la géométrie SVG** (calcul d'arcs `arcPath`, empilements `getLayerH`/`weekSum`, projections `xFor`/`yFor`) imbriquée dans les 4 composants graphiques. **6 `useState`**, **1 `useEffect`** (chargement unique). |
| **Rendu UI** | **≈ 43 %** (~445 l.) | Balisage SVG : **14 `<View>`/7 `<Text>`** mais surtout `<Rect>`, `<Path>`, `<Line>`, `<Circle>`, `<G>`, `<SvgText>`. **22 `.map()`** (séries de barres/jours). |
| **Styles dédiés** | **≈ 0 %** | **Aucun `StyleSheet.create`.** Couleurs portées par `fill`/`stroke` SVG (issues de `getLayers(theme)`, donc tokenisées via thème) + 26 `style={}` inline. |

**Lecture transversale :** la signature des trois fichiers est le **style inline omniprésent** (373 + 240 + 26 = **639 props `style={}`**) face à des `StyleSheet` faméliques. La maintenabilité native souffre moins de la longueur que de l'**absence de séparation styles/markup**.

### 4.2 Dépendances et Props Drilling

#### Profondeur de traversée des données métier

L'architecture est **plate, pas profonde** : chaque orchestrateur détient l'état et le passe **1 à 3 niveaux** au maximum. Pas de drilling pathologique sur 5+ couches.

| Fichier | Chaîne la plus profonde | Profondeur | Symptôme |
|---|---|---|---|
| `SportScreen` | `SportScreen` → `ActiveWorkout` → `SetRow` | **3** | `ActiveWorkout` reçoit **~10 props** (session + callbacks `onSet*`, `onFinish`, `timer`, `restRemaining`…) → *prop-list bloat* plutôt que drilling. |
| `NutritionScreen` | `NutritionScreen` → `AddMealModal` → `MacroPreview` | **3** | `slotSummaries`/`totals` calculés en haut, passés à 1 niveau. |
| `TempsTab` | `TempsTab` → `StackedBars` → (callback `onBarPress`) | **2** | `dayLayersList` calculé en haut puis distribué aux 4 graphiques. |

#### Contextes globaux (React Context)

**Trois contextes importés, dont deux morts.** C'est le point chaud architectural.

| Contexte | Statut | Réalité mesurée |
|---|---|---|
| `useTheme()` (`hooks/useTheme`) | ✅ **Vivant & légitime** | Source unique des couleurs (`theme.*`). Utilisé partout. |
| `useAppState()` (`context/AppStateContext`) | ⚠️ **Shim `@ts-nocheck`** | Renvoie un objet `any` avec `db: {}` vide, `updateDb`/`navigate` **no-op**. Délègue en réalité à Zustand `useAppStore`. **Appelé « à vide »** dans Sport (l. 267) et Nutrition (l. 648) — `useAppState();` sans destructuration : ne sert plus à rien. |
| `useDaily()` (`context/DailyContext`) | ❌ **Stub mort** | Renvoie `{ entries: [], addEntry: ()=>{}, … }` **codé en dur**. Or `addEntry` est **réellement appelé** (Sport l. 495, Nutrition l. 824) → **écritures dans le vide**. `moveEntry`/`getEntriesByDate` sont explicitement neutralisés (`void moveEntry;` l. 269). |

**Verdict :** les contextes ne sont **pas sur-utilisés pour éviter le props-drilling** — au contraire, ils sont **sous-utilisés et fantômes**. Le vrai état global passe par **Zustand `useAppStore`** (sélecteur `dataVersion` → invalidation des stores) consommé *indirectement* via `useWorkoutStore`/`useMealStore`. **Action prioritaire : purger `useAppState`/`useDaily` et les `addEntry` morts avant extraction.**

#### Effets de bord (`useEffect`) en cascade — risque thread UI

| Fichier | Effets orchestrateur | Cascade / risque mesuré |
|---|---|---|
| `SportScreen` | 3 | **`setInterval(setTimer(t=>t+1), 1000)`** (l. 307-315) pendant une séance active → `setTimer` re-render **tout l'arbre SportScreen chaque seconde**. `RoutineCard`/`MuscleFilterButton` sont `React.memo` (protégés), mais `ActiveWorkout`, `ChronoOverlay`, `SetRow` ne le sont pas → re-render à chaque tick. **Risque thread UI réel** sur séance longue. + persistance auto toutes les 30 s (l. 299-305). |
| `NutritionScreen` | 5 | **Cascade sur `selectedDate`** : changer de jour déclenche `useMealStore` (reload) **+** effet eau (l. 783) **+** effet adhérence protéique 7 j (l. 679, scan SQLite complet). **Cascade sur `profile`** : 3 effets (adhérence, cible eau, bilan). Effets **asynchrones** (hors thread JS principal) donc non bloquants, mais multiplient les `setState` séquentiels → re-renders en rafale. |
| `TempsTab` | 1 | **Sain à l'`useEffect`** (chargement unique au montage). **MAIS** `dayLayersList` (l. 850) est recalculé **à chaque render sans `useMemo`** : `period.days.map(computeDayLayers)` itère sur toutes sessions/repas/prières — jusqu'à **365 jours** en vue année. **Calcul lourd sur le thread UI à chaque re-render** (cf. §5.1). |

---

## SECTION 5 — LOGIQUE MÉTIER ET PERSISTANCE

> **Note de cadrage :** AWAN est **offline-first, 0 requête réseau** (cf. Phase 1 §0). Il n'existe **pas d'« appels API »** au sens HTTP. Le terme « API » ci-dessous désigne la **couche de services** (`WorkoutService`, `MealService`, `WaterService`…) qui encapsule le stockage `IStorage` (→ `expo-sqlite` en natif).

### 5.1 Gestion de l'état et flux

#### Centralisation des « appels API » (services)

| Écran | Voie propre (encapsulée) | Voie de contournement (fuite) |
|---|---|---|
| `SportScreen` | `useWorkoutStore()` → `WorkoutService` (CRUD routines/sessions) + invalidation `dataVersion` + gestion `DbFullError` via `dbFullBus`. | Appels services **directs dans les callbacks** : `WorkoutService.getAllSessions()` (l. 348, dans `startWorkout`), `PeriodizationService.getOrInit/advanceWeek`. Acceptable (pas de SQL brut) mais **non centralisé** dans le store. |
| `NutritionScreen` | `useMealStore(date)` → `MealService` + `WaterService`. | **3 `useEffect` font du `getStorage()` brut** (cf. §5.2). |
| `TempsTab` | — | **Tout passe en accès direct** `getStorage()` + `storage.list/get` (cf. §5.2). Aucun hook dédié. |

**Diagnostic :** la centralisation est **partielle**. `SportScreen`/`NutritionScreen` ont un store propre **mais le doublent** d'accès directs. `TempsTab` n'a **aucune** couche d'abstraction.

#### Complexité des calculs temps réel

| Calcul | Localisation | Complexité | Verdict |
|---|---|---|---|
| Volume hebdo / muscle | `SportScreen` `VolumeWeekSection`/`VolumeHeatmapSection` via `WorkoutService.getWeeklyVolumeByMuscle` | O(sessions × exercices × sets) | Borné (1 semaine), OK. |
| Rotation cycle A/B/C/D | `nextRoutine` **`useMemo`** (l. 317) | O(sessions) | ✅ Mémoïsé. |
| Auto-progression S7 | `suggestProgression` dans `startWorkout` (callback) | O(sessions historiques) | Hors render, OK. |
| `slotSummaries` / `mealEntries` | `NutritionScreen` **`useMemo`** (l. 760, 769) | O(repas du jour) | ✅ Mémoïsé. |
| Adhérence protéique 7 j | `NutritionScreen` `useEffect` l. 679 | **Scan de TOUTES les clés `nutrition.meal`** + N+1 `get` + agrégation JS | ⚠️ Async mais non borné (croît avec l'historique). |
| **`dayLayersList`** | `TempsTab` l. 850 (**hors `useMemo`**) | **O(jours_période × toutes entrées)**, jusqu'à 365 j | ❌ **Recalculé à chaque render sur le thread UI.** Point chaud n°1. |

### 5.2 Interaction avec `expo-sqlite`

#### Encapsulation : `expo-sqlite` est correctement abstrait

`import { openDatabaseAsync } from 'expo-sqlite'` n'apparaît **que dans `src/data/storage/SqliteStorage.ts`** (1 seul fichier). Tout passe par l'interface `IStorage` ; web/test basculent sur `IndexedDBStorage`/`MemoryStorage` via `storageService.ts`. **Aucun SQL brut dans un composant de rendu.** ✅

#### Liste exhaustive des accès stockage dans les 3 écrans de rendu

| Écran | Accès | Ligne(s) | Encapsulé ? |
|---|---|---|---|
| `SportScreen` | `safeStorage.get/set/remove` (session active, brouillon routine, best 1RM) | 290, 294, 300-301, 335, 915, 1382… | ⚠️ **Pas SQLite** — voir alerte ci-dessous. |
| `SportScreen` | `WorkoutService` / `PeriodizationService` | 348, 482, 486… | ✅ via service. |
| `NutritionScreen` | `safeStorage` (profil, libellés de slots) | 111, 120, 664, 1016 | ⚠️ idem. |
| `NutritionScreen` | **`import('…/storageService').then(getStorage).then(storage => storage.list/get)`** | **682-693**, **746-748** | ❌ **`getStorage()` brut injecté dans un `useEffect` du composant.** |
| `NutritionScreen` | `WaterService`, `WeightService`, `MealService` | 720, 784, 793 | ✅ via service. |
| `TempsTab` | **`getStorage()` + `storage.list('nutrition.meal')` + N+1 `storage.get(k, migrate…)` + `storage.list('islam.prayer')`** | **795-829** | ❌ **Scan/agrégation brut au cœur du composant.** Pattern N+1. |

#### 🔴 Alerte de persistance : `safeStorage` ≠ persistance native

`safeStorage` (l. 7 de `safeStorage.ts`) est, **sur natif (`Platform.OS !== 'web'`), un simple objet mémoire** (`memCache`) — **aucune écriture disque**. Conséquence : sur device, **session active, brouillon de routine, best 1RM (Sport), profil nutritionnel et libellés de slots (Nutrition) sont volatils** et **perdus au redémarrage à froid** de l'app. Les *drafts* éphémères tolèrent ce comportement ; **le profil nutritionnel et les best 1RM, non.** → À migrer vers `IStorage`/SQLite. *(Dette non listée par le questionnaire mais critique pour la fiabilité native.)*

#### Encapsulation dans des Custom Hooks dédiés ?

- ✅ **Bien encapsulé :** `useWorkoutStore` (Sport), `useMealStore` (Nutrition) — pattern propre : `useState` + `useEffect([dataVersion])` + `try/catch DbFullError → dbFullBus`.
- ❌ **Injecté au milieu du JSX/effets :** les scans bruts de `NutritionScreen` (adhérence 7 j, seed onboarding) et **l'intégralité de `TempsTab`**. → Doivent devenir `useProteinAdherence(profile)`, `useTimeAnalytics(view, offset)`.

#### Gestion des erreurs lecture/écriture & mode WAL

**Configuration WAL (preuve runtime, `SqliteStorage.open()` l. 17-28) :**
```
PRAGMA journal_mode = WAL;     -- écritures concurrentes non bloquantes
PRAGMA synchronous = NORMAL;   -- compromis durabilité/perf en WAL
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;    -- 5 s d'attente avant SQLITE_BUSY
```

| Aspect | État mesuré |
|---|---|
| **Saturation disque (écriture)** | ✅ Robuste. `set()` (l. 48-67) vérifie `MAX_DB_BYTES` **avant** insert (`DbFullError`), et **après** capture `disk I/O error` / `SQLITE_FULL`. Remonté jusqu'aux stores → `dbFullBus.emit()` → toast global. |
| **Contention écrivain (WAL)** | ✅ `busy_timeout = 5000` absorbe les `SQLITE_BUSY`. Pas de checkpoint WAL manuel (auto-checkpoint SQLite par défaut — acceptable à cette échelle KV). |
| **Erreurs de lecture** | ⚠️ **Inégal.** Les stores propres laissent remonter. Mais les **voies brutes avalent silencieusement** : `TempsTab` `catch (_) {}` (l. 834, « show empty state »), `NutritionScreen` `.catch(() => {})` (l. 731, 736). → **Un échec de lecture = écran vide sans signal utilisateur.** |

---

## SECTION 6 — ARCHITECTURE DES COMPOSANTS (PATTERN FEATURE DIRECTORY)

### 6.1 Préparation à la modularisation — composants à extraire immédiatement

Modèle cible déjà éprouvé dans le repo : `src/screens/analyse/` (16 onglets + `shared.tsx`) et `src/modules/sport/components/` (`WorkoutListView`, `RoutineGeneratorView` déjà extraits). On réplique : **`module/<feature>/components/` + `hooks/` + `<Feature>.styles.ts` + `<feature>.logic.ts` + `types.ts`.**

#### `SportScreen.tsx` → `src/modules/sport/`

Les composants existent déjà ; il s'agit de **les déplacer**, pas de les écrire. Lignes mesurées :

| Sous-composant à extraire | Lignes | Destination |
|---|---|---|
| `ActiveWorkout` (+ `SetRow`, `ChronoOverlay`, `RestRing`) | 1317-1596 + 1278-1316 | `components/workout-session/` |
| `RoutineEditor` (+ `NumField`, `PreEditExercises`) | 878-1095 + 1672-1744 | `components/routine-editor/` |
| `ExercisePicker` (+ `ExerciseDetail`, `MuscleFilterButton`) | 1141-1277 | `components/exercise-picker/` |
| `FinishWorkout` / `PreWorkout` | 1597-1671 + 1745-1899 | `components/workout-flow/` |
| `WorkoutHistory` | 1900-1962 | `components/history/` |
| `CycleScoreSection`, `VolumeHeatmapSection`, `VolumeWeekSection`, `BreakdownChip`, `RoutineCard` | 170-264 + 1096-1140 | `components/dashboard/` |
| Helpers purs (`computeOneRM`, `loadBestOneRMs`, `volumeToMuscleValues`, `setKindColor`, `formatTime`) | 83-169 | `sport.logic.ts` + tests |
| Sélecteur **score de récupération 1-10** (extrait Phase 1 §4.2, l. 551-591) | inline | `components/RecoveryScorePicker.tsx` |

> Après extraction, `SportScreen.tsx` ne garde que l'orchestrateur (état + machine d'états `view` + assemblage) : cible **< 300 lignes**.

#### `NutritionScreen.tsx` → `src/modules/nutrition/`

| Sous-composant à extraire | Lignes | Destination |
|---|---|---|
| `OnboardingModal` | 212-349 | `components/OnboardingModal.tsx` |
| `AddMealModal` (+ `MacroPreview`) | 350-568 | `components/AddMealModal.tsx` |
| `EditMealModal` | 569-645 | `components/EditMealModal.tsx` |
| `ProgressBar` (barres macro) | 187-211 | `components/MacroProgressBar.tsx` |
| Grille **slots de repas** (Suhoor/Déjeuner/Dîner/Collation/En-cas) | inline orchestrateur | `components/SlotTabs.tsx` |
| Bloc **hydratation** (`waterMl`/`waterTarget`/`handleAddWater`) | inline + l. 1187-1205 | `components/WaterTracker.tsx` |
| Helpers (`computeProfile`, `calcMacros`, `statusColor`, `loadProfile`/`saveProfile`) | 92-186 | `nutrition.logic.ts` + tests |
| Effet **adhérence protéique 7 j** | 679-706 | `hooks/useProteinAdherence.ts` |

#### `TempsTab.tsx` → `src/screens/analyse/temps/`

| Sous-composant à extraire | Lignes | Destination |
|---|---|---|
| `ClockPie` (cadran horaire + `arcPath`) | 233-392 | `components/ClockPie.tsx` |
| `StackedBars` | 393-542 | `components/StackedBars.tsx` |
| `StackedArea` | 543-708 | `components/StackedArea.tsx` |
| `Legend` | 709-779 | `components/Legend.tsx` |
| Helpers data (`computeDayLayers`, `computeDaySlots`, `computePeriod`, `getLayers`, `hhmmToMin`) | 81-232 | `temps.logic.ts` + tests |
| **Chargement données** (`getStorage` + scans repas/prières) | 789-843 | `hooks/useTimeAnalytics.ts` (+ **`useMemo` sur `dayLayersList`**) |

### 6.2 Logique de style partagée & valeurs inline à centraliser

**Constat :** **639 props `style={}` inline** au total et des **littéraux couleur bruts** qui violent la règle CLAUDE.md « zéro valeur inline ». Le système de tokens existe déjà (`src/theme/tokens.ts` : `Clr`, `Fs`, `Fw`, `Ls`, `Sp`, `T`) — il s'agit de **remapper**, pas de créer.

#### Littéraux couleur à remapper (mesurés)

| Littéral inline | Occurrences | Cible existante / à créer |
|---|---|---|
| `rgba(255,255,255,0.2)` | **8** (Nutrition) + 1 (Sport) | ✅ `Clr.white20` |
| `'#000'` (texte sur fond accent/gold actif) | **13** (Sport) + 5 (Nutrition) | ➕ créer `Clr.black` ou `theme.onAccent` |
| `rgba(128,128,128,0.25)` (bordures inactives) | 2 (Sport) | ➕ créer `Clr.grey25` |
| `rgba(0,0,0,0.75)` (overlays modales) | 3 (Sport) | ➕ créer `Clr.overlay75` (existe `overlay`=0.85, `overlayDeep`=0.92) |
| `rgba(255,255,255,0.03)` | 2 (Nutrition) | ➕ créer `Clr.white3` |
| `rgba(212,175,55,0.05)` (gold) | 1 (Sport) + 1 (Nutrition) | ➕ créer `Clr.gold5` (existe `gold8`…) |
| `'#F87171'` / `'#FB923C'` (rouge/orange statut) | 2 + 2 (Sport) | ➡️ `theme.danger` / `theme.statusWarn` (déjà dans le thème) |
| `fontSize: 14`, `fontFamily: FontMono` inline | nombreux | ➡️ `Fs.body` + fragments `T.*` |

#### Plan de centralisation

1. **Compléter `Clr`** (5 tokens manquants ci-dessus) dans `src/theme/tokens.ts` — **pas** de nouveau fichier, on étend l'existant (règle « étendre, ne pas inventer »).
2. **Remplacer `'#F87171'`/`'#FB923C'` par `theme.danger`/`theme.statusWarn`** : ce sont des couleurs sémantiques, elles doivent suivre le thème, pas être figées.
3. **Par feature extraite, créer un `<Feature>.styles.ts`** regroupant les `style={}` répétitifs (chips de score, lignes de set, cartes de slot) en `StyleSheet.create` — viser **< 50 props inline résiduelles** par écran (positionnement dynamique only).
4. **`TempsTab`** : pas de `Styles.ts` couleur (SVG `fill`/`stroke` déjà via `getLayers(theme)`) — centraliser plutôt les **constantes géométriques** (rayons, hauteurs de barre, marges) dans `temps.constants.ts`.

---

## 7. SYNTHÈSE & ORDRE D'EXÉCUTION RECOMMANDÉ

| # | Action | Effort | Risque | Pré-requis |
|---|---|---|---|---|
| 0 | **Purger** `useAppState`/`useDaily` morts + `addEntry` dans le vide (Sport l. 495, Nutrition l. 824) | S | Faible | — |
| 1 | **Migrer `safeStorage` → `IStorage`** pour profil nutrition + best 1RM (persistance native) | M | Moyen | tests |
| 2 | **`TempsTab`** : extraire `useTimeAnalytics` + `useMemo(dayLayersList)` (gain thread UI immédiat) | M | Faible | — |
| 3 | **Étendre `Clr`** (5 tokens) + remap couleurs sémantiques `theme.*` | S | Faible | capture écran |
| 4 | **Éclater les 3 God Files** en feature directories (déplacement mécanique) | L | Faible | tests par helper |
| 5 | **Mémoïser / `React.memo`** `ActiveWorkout` & enfants (timer 1 s) | S | Faible | — |

**Cibles post-refactor :** `SportScreen.tsx` < 300 l., `NutritionScreen.tsx` < 250 l., `TempsTab.tsx` < 200 l. — orchestrateurs purs. Aucun `> 1 000`. Tests obligatoires sur tout helper extrait (`sport.logic.ts`, `nutrition.logic.ts`, `temps.logic.ts`) couvrant `trigger=true`/`false` (règle CLAUDE.md §6).

---

## 8. PÉRIMÈTRE DE VÉRIFICATION (honnêteté technique)

**✅ Vérifié par lecture statique** (commit courant, branche `claude/practical-fermat-bhp35s`) : lignes, comptages de hooks/primitives/`style={}`, bornes des sous-composants, accès stockage, PRAGMA WAL, littéraux couleur.

**❌ Non vérifiable hors-ligne** (cf. Phase 1 §1) : `tsc` 0 erreur et exécution `vitest` (`node_modules` absent, réseau npm restreint). Les ratios Logique/UI/Styles sont des **estimations par plages de lignes** (± 5 %), pas un classifieur AST.

---

*Réponse générée le 2026-06-09. Mesures statiques sur le commit courant. Conforme au protocole anti-hallucination CLAUDE.md : aucun chiffre énoncé sans lecture préalable du fichier source.*
