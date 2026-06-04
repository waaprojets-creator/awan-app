# PROTOCOLE D'AUDIT TECHNIQUE ET UI/UX SANS DÉRIVE — AWAN v5.0
**Cahier de Vérification Formelle — Réponses par Inspection Directe du Disque**

---

## ATTESTATION PRÉLIMINAIRE

```text
Je soussigné, Claude Code, agissant en qualité d'expert d'architecture logicielle pour le projet AWAN,
certifie sur l'honneur avoir extrait les réponses ci-dessous par une inspection physique et directe
des fichiers de la codebase courante.

Commit audité : 8a1ec1c  (branch main, 2026-06-04)
Répertoire    : /home/user/awan-app/

Aucune omission volontaire, approximation ou conclusion non étayée par une ligne de code source.
```

---

## STRATE 1 : SYSTÈME DE THÈMES ET RENDU VISUEL (UI/UX)

### Q1.1 — Intégration des profils de couleur Light, Dark, Black

**Statut constaté sur le disque :**

- [x] **Les trois profils (Light, Dark, Pure Black/AMOLED) sont formellement implémentés et basculent de manière dynamique.**

**Preuves Techniques :**

*Chemins des fichiers de tokens :*
- `/home/user/awan-app/src/constants/light.js`
- `/home/user/awan-app/src/constants/dark.js`
- `/home/user/awan-app/src/constants/black.js`
- `/home/user/awan-app/src/hooks/useTheme.ts`
- `/home/user/awan-app/src/data/store/appStore.ts`
- `/home/user/awan-app/src/index.css`

*Tokens distincts par profil (extrait des fichiers constants) :*

```javascript
// src/constants/light.js
export const UiBgLight     = "#F8F5F2";
export const UiSurfaceLight= "#EDE8E2";
export const UiTitleLight  = "#1A1A1A";

// src/constants/dark.js
export const UiBgDark      = "#1A1A1A";
export const UiSurfaceDark = "#4C4A44";
export const UiTitleDark   = "#EDE8E2";

// src/constants/black.js
export const UiBgBlack     = "#000000";   // Pure AMOLED
export const UiSurfaceBlack= "#0F0F0F";
export const UiTitleBlack  = "#EDE8E2";
```

*Injection dynamique dans le DOM via `useThemeSync()` — `src/hooks/useTheme.ts` lignes 64–89 :*

```typescript
export function useThemeSync(): void {
  const theme = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-awan-bg',      theme.bg);
    root.style.setProperty('--color-awan-surface',  theme.surface);
    root.style.setProperty('--color-awan-gold',     theme.selected);
    root.style.setProperty('--color-awan-tx',       theme.title);
    root.style.setProperty('--color-awan-tx-dim',   theme.text);
    root.style.setProperty('--color-awan-tx-mute',  theme.mute);
    root.style.setProperty('--color-awan-status-error',  theme.danger);
    root.style.setProperty('--color-awan-status-spirit', theme.selected);
  }, [theme]);
}
```

*Sélection du profil — `src/data/store/appStore.ts` lignes 59–67 :*

```typescript
toggleTheme: () => set((s) => {
  const cycle: Theme[] = ['light', 'dark', 'black'];
  const next: Theme = cycle[(cycle.indexOf(s.theme) + 1) % cycle.length] as Theme;
  try { localStorage.setItem(THEME_KEY, next); } catch { /* ok */ }
  return { theme: next };
}),
```

*Valeurs sentinelles dans `index.css` (lignes 11–25) :*
Les valeurs par défaut CSS sont **magenta `#FF00FF` / cyan `#00FFFF`** — volontairement illisibles pour signaler immédiatement toute variable non couverte par `useThemeSync` au chargement.

```css
/* ALARM DEFAULTS — remplacés par useThemeSync au chargement. */
--color-awan-bg:      #FF00FF;
--color-awan-surface: #FF00FF;
--color-awan-tx:      #00FFFF;
```

**Note sur `radius-awan-*` :** Tous les rayons sont fixés à `0px` dans `index.css` (lignes 37–40) — design intentionnel, angles droits. Pas de conflit entre profils.

---

### Q1.2 — Continuité Visuelle avec le Système Natif (StatusBar)

**Statut constaté sur le disque :**

- [x] **ABSENT — Rupture visuelle : les barres système restent figées lors du switch de thème.**

**Preuves Techniques :**

Recherche exhaustive sur l'ensemble de `src/` :

```bash
grep -rn "StatusBar|@capacitor/status-bar|setBackgroundColor|setStyle" src/
# Résultat : (aucune sortie)
```

- `@capacitor/status-bar` n'est **pas installé** (`package.json` vérifié — absent).
- Aucune ligne de code ne fait appel à un plugin natif StatusBar.
- Le switch de thème (`toggleTheme` / `setTheme`) ne déclenche que la mutation des CSS variables via `useThemeSync` — **aucune synchronisation native**.

**Conséquence opérationnelle :** Sur Android (mode Dark ou Black), la barre système (heure, batterie, icônes de notification) reste en style clair ou dans l'état système par défaut. L'utilisateur voit une rupture visuelle entre la WebView et les bords de l'écran lors de chaque changement de thème.

**DETTE TECHNIQUE** : Priorité haute pour l'expérience haut de gamme visée. Fix minimal :

```typescript
// À ajouter dans useThemeSync(), après les setProperty() :
import { StatusBar, Style } from '@capacitor/status-bar';
// En Capacitor :
await StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark });
await StatusBar.setBackgroundColor({ color: theme.bg });
```

---

## STRATE 2 : LOGIQUE NUTRITION & AUTONOMIE DE LA BASE LOCALE

### Q2.1 — Cartographie de la base alimentaire embarquée

**Statut constaté sur le disque :**

- [x] **Nombre exact : 578 aliments.**
- [x] **Structure du modèle — champ `barcode` présent dans le schéma Zod, absent des données JSON.**

**Preuves Techniques :**

*Fichier catalogue :* `/home/user/awan-app/public/data/foods.json` — **75 171 octets (~73 Ko)**

*Comptage Python direct :*
```python
import json
d = json.load(open('public/data/foods.json'))
len(d)  # → 578
d[0].keys()  # → ['id', 'n', 'kcal', 'p', 'c', 'f', 'halal']
```

*Le JSON ne contient PAS de champ `barcode`* — les 578 objets ont exactement 7 clés : `id`, `n`, `kcal`, `p`, `c`, `f`, `halal`.

*Schéma Zod (`src/data/schemas/nutrition/foodItem.ts`, lignes 7–17) :*

```typescript
export const FoodItemV1Schema = z.object({
  v:       z.literal(1),
  id:      z.string(),
  n:       z.string(),
  kcal:    z.number(),
  p:       z.number(),
  c:       z.number(),
  f:       z.number(),
  halal:   z.boolean(),
  barcode: z.string().optional(),   // ← champ prévu, 0 valeur peuplée dans foods.json
});
```

---

### Q2.2 — Workflow d'urgence en cas d'aliment manquant

**Statut constaté sur le disque :**

- [x] **PRÉSENT — formulaire "ALIMENT CUSTOM" accessible directement dans la modal d'ajout de repas.**

**Nuance critique — PARTIEL sur la persistance :**

- [x] L'aliment custom est **logué immédiatement comme entrée repas** (persisté en SQLite sous `nutrition.meal.{id}`).
- [ ] **L'aliment custom n'est PAS ajouté à la base `foods.json`** (non réutilisable lors d'une prochaine recherche). Il disparaît du catalogue après la session.

**Preuves Techniques :**

*Composant `AddModal` — `src/screens/NutritionScreen.tsx`, lignes 465–527 :*

```typescript
const [customMode, setCustomMode] = useState(false);
const [customName, setCustomName] = useState('');
const [customKcal, setCustomKcal] = useState('');
const [customP, setCustomP]       = useState('');
const [customC, setCustomC]       = useState('');
const [customF, setCustomF]       = useState('');

const handleCustomSubmit = () => {
  const kcalNum = parseFloat(customKcal);
  if (!customName.trim() || isNaN(kcalNum) || kcalNum <= 0) {
    Alert.alert('Erreur', 'Nom et kcal requis');
    return;
  }
  const customFood: FoodEntry = {
    id: `custom-${Date.now()}`,       // ← ID éphémère, non persisté dans foods.json
    n:    customName.trim().toUpperCase(),
    kcal: Math.round(kcalNum),
    p:    Math.round(pNum * 10) / 10,
    c:    Math.round(cNum * 10) / 10,
    f:    Math.round(fNum * 10) / 10,
    halal: true,
  };
  onAdd(customFood, 100, t);          // → handleAdd → mealStore.add() → SQLite
};
```

*Intégration UI — onglet "ALIMENT CUSTOM" à côté de "CATALOGUE", ligne 573 :*

```tsx
<Touch onPress={() => setCustomMode(true)} className="...">
  <span className="...">ALIMENT CUSTOM</span>
</Touch>
```

**DETTE TECHNIQUE** : L'aliment custom ne peut pas être retrouvé dans la recherche lors d'un repas suivant. L'utilisateur doit re-saisir les données à chaque repas. Un store `nutrition.food.custom.*` en SQLite résoudrait le problème.

---

## STRATE 3 : ARCHITECTURE SPORT & PERFORMANCE DES FLUX (MOTEURS)

### Q3.1 — Isolation des Traitants Algorithmiques Lourds

**Statut constaté sur le disque :**

- [x] **DETTE DE PERFORMANCE — Tous les calculs s'exécutent de manière synchrone sur le thread JavaScript principal.**

**Preuves Techniques :**

Recherche de toute instanciation de Web Worker :

```bash
grep -rn "new Worker\|createWorker\|\.worker\." src/
# Résultat : (aucune sortie)
```

*Aucun fichier `.worker.ts` ou `.worker.js` n'existe dans le projet.*

*Calculs analytiques lourds dans `PerformanceTab.tsx` — tous en `useMemo` sur le thread principal :*

```typescript
// src/screens/analyse/PerformanceTab.tsx — lignes 66–138
const perio          = useMemo(() => PeriodizationService.getCurrent(), []);
const top5           = useMemo((): OneRMEntry[] => { ... }, [sessions]);
const oneRmTrend     = useMemo(() => oneRmTrendPerExercise(sessions, 90), [sessions]);
const weeklyTonnage  = useMemo((): WeekTonnage[] => { ... }, [sessions, anchorDate, range]);
const chainTonnage   = useMemo(() => tonnageByChain(sessions, 28), [sessions]);
const sessionMetrics = useMemo(() => { ... }, [sessions]);
```

*Calculs dans `RecoveryTab.tsx` — idem :*

```typescript
// src/screens/analyse/RecoveryTab.tsx — lignes 159–176
const acwr           = useMemo(() => computeACWR(sessions), [sessions]);
const acwrSeries     = useMemo(() => computeACWRSeries(sessions), [sessions]);
const recoveryAvg7   = useMemo(() => { ... }, [sessions]);
const last7Recovery  = useMemo(() => { ... }, [sessions, today]);
```

**Analyse du risque :** `oneRmTrendPerExercise(sessions, 90)` itère sur 90 jours × N exercices × M séries. `tonnageByChain(sessions, 28)` agrège 28 jours par chaîne musculaire. À 143 séances (seed 185j), aucun problème visible. À 500+ séances (3 ans d'usage), risque de freeze >16ms sur le thread de rendu — micro-saccades à 60Hz, potentiellement perceptibles à 120Hz.

---

### Q3.2 — Rythme de Sollicitation du Coach Engine

**Statut constaté sur le disque — RÉSULTAT CRITIQUE :**

- [x] **DETTE TECHNIQUE SÉVÈRE — 3 des 4 événements déclencheurs du Coach ne sont jamais émis.**

**Preuves Techniques :**

*Audit exhaustif de tous les `eventBus.emit()` dans `src/` :*

```bash
grep -rn "eventBus.emit" src/
```

| Événement émis | Fichier | Ligne |
|---|---|---|
| `workout.completed` | `src/services/workoutService.ts` | 85 |
| `steps.updated` | `src/modules/activity/api.ts` | 30 |
| `planning.optimized` | `src/modules/planning/api.ts` | 49 |
| `coach.assessment.ready` | `src/modules/coach/api.ts` | 70 |

*Événements écoutés par le Coach (`src/modules/coach/api.ts`, lignes 93–96) :*

```typescript
eventBus.on('workout.completed',    ({ date }) => { void this.run('sport', date); }),
eventBus.on('meal.logged',          ({ date }) => { void this.run('nutrition', date); }),
eventBus.on('measurement.recorded', ({ date }) => { void this.run('anthropo', date); }),
eventBus.on('day.ended',            ({ date }) => { void this.runAll(date); }),
```

**Conclusion :**

| Événement Coach | Émis dans le code ? | Résultat |
|---|---|---|
| `workout.completed` | ✅ Oui (`workoutService.ts:85`) | Coach sport ✅ fonctionne |
| `meal.logged` | ❌ **JAMAIS ÉMIS** | Coach nutrition ❌ **ne se déclenche jamais** |
| `measurement.recorded` | ❌ **JAMAIS ÉMIS** | Coach anthropo ❌ **ne se déclenche jamais** |
| `day.ended` | ❌ **JAMAIS ÉMIS** | `runAll()` ❌ **ne s'exécute jamais** |

Les règles Coach pour la nutrition, l'anthropométrie, le sommeil et les domaines cross ne se déclenchent **jamais automatiquement**. Seul le domaine sport est opérationnel via `workout.completed`.

**Note secondaire — absence de debounce :** Le seul événement fonctionnel (`workout.completed`) est émis une seule fois par sauvegarde de séance — pas de risque de rafale. Si `meal.logged` était corrigé et émis à chaque `mealStore.add()`, un debounce de 2–3 secondes serait recommandé pour éviter N runs consécutifs lors d'une saisie rapide de plusieurs aliments.

---

## STRATE 4 : PERSISTANCE ET INTÉGRITÉ DU QUOTA

### Q4.1 — Respect strict de la constante `MAX_DB_BYTES = 10 MB`

**Statut constaté sur le disque :**

- [x] **La constante est formellement déclarée et appliquée à chaque écriture.**
- [x] **La base SQLite ne contient aucun binaire — uniquement du texte et du JSON.**
- [x] **Poids du seed initial : 3 482 187 octets (~3,32 Mo).**

**Preuves Techniques :**

*Déclaration de la constante — `src/data/storage/IStorage.ts`, ligne 35 :*

```typescript
/** Capacité maximale par DB utilisateur. Au-delà, set() rejette avec DbFullError. */
export const MAX_DB_BYTES = 10 * 1024 * 1024;  // 10 485 760 octets
```

*Application de la garde à chaque écriture — `src/data/storage/SqliteStorage.ts`, lignes 59–66 :*

```typescript
async set<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  // Check storage quota before writing (bloqueur 10 MB)
  const current = await this.getSizeBytes();
  if (current + json.length > MAX_DB_BYTES) {
    throw new DbFullError(current);
  }
  // ... INSERT INTO kv ...
}
```

*Mesure SQLite — `SqliteStorage.getSizeBytes()`, lignes 93–102 :*

```typescript
async getSizeBytes(): Promise<number> {
  const pages    = await this.handle.query('PRAGMA page_count', []);
  const pageSize = await this.handle.query('PRAGMA page_size',  []);
  const pc = pages.values?.[0]?.page_count ?? 0;
  const ps = pageSize.values?.[0]?.page_size ?? 0;
  this.cachedSize = pc * ps;   // mesure native SQLite, cache 2s
  return this.cachedSize;
}
```

*Poids du seed de démonstration :*

```bash
wc -c public/data/seed-demo.json
# → 3 482 187 octets (~3,32 Mo)
```

Ce fichier est importé **une seule fois** via `autoLoadSeed()` dans `App.tsx` (protégé par un flag timestampé dans SQLite). Après import, les entrées JSON sont désérialisées et stockées ligne par ligne dans la table `kv`. La taille SQLite réelle sera inférieure au fichier JSON source (JSON → valeurs atomiques en base).

*Résultat de la garde :* À 3,32 Mo de seed + usage intensif (5 repas/j + 5 séances/sem), la base atteindra ~4–6 Mo après 2 ans — **bien en deçà du quota de 10 Mo**, à condition de n'y stocker aucun binaire. Le stockage binaire (photos d'évolution physique future) doit impérativement utiliser **Capacitor Filesystem** (`@capacitor/filesystem`) hors de cette base SQLite.

---

## RÉCAPITULATIF EXÉCUTIF — MATRICE DE RISQUES

| Référence | Sujet | Statut | Priorité |
|---|---|---|---|
| Q1.1 | Thèmes Light/Dark/Black | ✅ IMPLÉMENTÉ | — |
| Q1.2 | Synchronisation StatusBar native | ❌ ABSENT | HAUTE — UX premium |
| Q2.1 | Base alimentaire 578 items | ✅ CONFIRMÉ | — |
| Q2.2 | Aliment custom (saisie d'urgence) | ⚠️ PARTIEL — non réutilisable | MOYENNE |
| Q3.1 | Calculs analytiques sur thread principal | ⚠️ DETTE — useMemo synchrone | FAIBLE court terme / HAUTE > 500 séances |
| Q3.2 | Coach Engine — déclenchement automatique | ❌ SÉVÈRE — 3/4 événements jamais émis | CRITIQUE |
| Q4.1 | Quota MAX_DB_BYTES 10 Mo | ✅ GARDÉ ET MESURÉ | — |

---

*Document généré le 2026-06-04 par audit direct du disque — commit `8a1ec1c`, branch `main`.*
*Signature de l'IA : Claude Code (claude-sonnet-4-6)*
