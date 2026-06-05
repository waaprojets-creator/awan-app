# J0 — Plan de Migration Capacitor → Expo Bare
**Plan complet avec micro-jalons sécurisés — 2026-06-04**

---

## Constat d'audit préalable

Avant de planifier, voici l'état réel du codebase (commit `c311efc`) :

### Ce qui est favorable

| Élément | État | Impact migration |
|---|---|---|
| Composants UI | Utilisent `View`, `ScrollView`, `FlatList` (RN primitives) | ✅ Zéro réécriture composants |
| Routing | `wouter` utilisé dans **2 fichiers seulement** | ✅ Migration rapide |
| DnD (`@dnd-kit`) | Présent dans `package.json` mais **jamais importé** dans le code | ✅ À retirer, rien à réécrire |
| Design Tokens JS | `light.js`, `dark.js`, `black.js` auto-générés par `style-dictionary` | ✅ Tokens JS existent déjà |
| Storage | Abstraction `IStorage` isole `SqliteStorage` → swap chirurgical | ✅ Interface preservée |
| Icons | `lucide-react` → `lucide-react-native` : même API, package différent | ✅ Migration automatisable |
| `expo-crypto` + `expo-secure-store` | **Déjà dans les dépendances** | ✅ Déjà installés |

### Ce qui est bloquant (dette à liquider)

| Blocage | Ampleur | Risque |
|---|---|---|
| `var(--color-awan-*)` dans le code source | **666 occurrences, 46 fichiers** | 🔴 CRITIQUE — CSS vars invalides en RN natif |
| `motion` (Framer Motion) | Importé dans ~15 fichiers | 🔴 CRITIQUE — web-only, pas de RN |
| `@capacitor-community/sqlite` | 2 fichiers (`SqliteStorage.ts`, `storageService.ts`) | 🟡 HAUTE — swap expo-sqlite |
| `@capacitor/local-notifications` | 2 fichiers (`IslamScreen`, `SportScreen`) | 🟡 HAUTE |
| `@capacitor/filesystem` | 1 fichier (`SettingsScreen`) | 🟢 MOYENNE |
| `@capacitor/app` | 2 fichiers (`MainLayout`, `useAndroidBack`) | 🟢 MOYENNE |
| `wouter` | 2 fichiers (`MainLayout`, `SettingsScreen`) | 🟢 FAIBLE |

---

## Séquence des micro-jalons

```
J0.0  Audit final & bascule de branche       3 jours
J0.1  Initialisation Expo bare               4 jours
J0.2  Design Tokens (CSS vars → useTheme)    2 semaines  ← Le plus gros bloc
J0.3  Storage : expo-sqlite + WAL            4 jours
J0.4  Plugins natifs                         5 jours
J0.5  Navigation (wouter → React Navigation) 3 jours
J0.6  Animations (motion → reanimated)       2 semaines
J0.7  Icons (lucide-react → native)          2 jours
J0.8  Build & Régression complète            5 jours
──────────────────────────────────────────────────────
Total J0 : 7-8 semaines
```

> **Note :** Le plan initial disait 3 semaines. C'était basé sur des hypothèses
> incorrectes. Après audit du code réel : 666 occurrences CSS vars + motion
> imposent 7-8 semaines. Une estimation erronée corrigée vaut mieux qu'un
> jalon raté.

---

## J0.0 — Audit final & bascule de branche

**Durée : 3 jours**

### Tâches

1. Créer la branche de migration : `feat/expo-migration` depuis `main`
2. Générer la liste exhaustive des incompatibilités restantes :
   ```bash
   grep -rn "var(--" src/ --include="*.tsx" | wc -l   # → 666
   grep -rn "from 'motion" src/ --include="*.tsx" -l
   grep -rn "@capacitor" src/ --include="*.tsx" --include="*.ts" -l
   ```
3. Documenter chaque fichier touché par migration dans un fichier de suivi
4. Vérifier que `npx tsc --noEmit` passe à zéro sur `main` avant de commencer

### Critères de sortie J0.0

- [ ] Branche `feat/expo-migration` créée depuis `main` propre
- [ ] Liste des 46 fichiers CSS vars documentée et trackée
- [ ] `npx tsc --noEmit` → 0 erreurs sur `main` (baseline)

---

## J0.1 — Initialisation Expo Bare

**Durée : 4 jours**

### Tâches

1. **Initialiser** le projet Expo bare dans un dossier parallèle :
   ```bash
   npx create-expo-app@latest awan-native --template bare-minimum
   ```

2. **Configurer Metro** dans `metro.config.js` :
   ```javascript
   const { getDefaultConfig } = require('expo/metro-config');
   const config = getDefaultConfig(__dirname);
   config.resolver.sourceExts.push('cjs');
   module.exports = config;
   ```

3. **Migrer `package.json`** — ajouter les nouvelles dépendances Expo,
   retirer les Capacitor. Packages à ajouter :
   ```
   expo                          ~52.0.0
   expo-sqlite                   ~15.0.0   ← remplace @capacitor-community/sqlite
   expo-notifications             ~0.30.0   ← remplace @capacitor/local-notifications
   expo-file-system               ~18.0.0   ← remplace @capacitor/filesystem
   expo-status-bar                ~2.0.0    ← remplace @capacitor/status-bar
   @react-navigation/native       ^6.0.0    ← remplace wouter
   @react-navigation/bottom-tabs  ^6.0.0
   @react-navigation/stack        ^6.0.0
   react-native-reanimated        ~3.16.0   ← remplace motion
   react-native-gesture-handler   ~2.20.0
   react-native-safe-area-context ~4.12.0   ← déjà utilisé
   react-native-screens           ~4.4.0
   lucide-react-native            ^0.511.0  ← remplace lucide-react
   ```

4. **Retirer** de `package.json` :
   ```
   @capacitor/core, @capacitor/android, @capacitor/app
   @capacitor/filesystem, @capacitor/local-notifications
   @capacitor/status-bar, @capacitor-community/sqlite
   @capacitor/cli
   @dnd-kit/* (jamais utilisé dans le code)
   vite, @vitejs/plugin-react, vite-plugin-react-native-web
   @tailwindcss/vite, tailwindcss
   wouter
   motion
   ```

5. **Vérifier** que le projet compile à vide (sans écrans) sur émulateur Android

### Critères de sortie J0.1

- [ ] `npx expo start` → pas d'erreur Metro
- [ ] Build Android vide fonctionnel sur émulateur
- [ ] Toutes les nouvelles dépendances Expo installées sans conflit
- [ ] `@capacitor/*` et `motion` absents de `package.json`

---

## J0.2 — Design Tokens : CSS vars → useTheme

**Durée : 2 semaines**
**Blocage critique — 666 occurrences, 46 fichiers**

### Stratégie

Les tokens JS existent déjà (`light.js`, `dark.js`, `black.js` via style-dictionary).
L'objectif est de créer un hook `useTheme()` qui retourne les tokens du thème actif,
et de remplacer chaque `'var(--color-awan-*)'` par la valeur JS correspondante.

### Étape 1 — Créer le hook centralisé (Jour 1)

Nouveau fichier `src/hooks/useThemeTokens.ts` :

```typescript
import { useThemeMode } from './useTheme';
import * as Light from '../constants/light';
import * as Dark from '../constants/dark';
import * as Black from '../constants/black';

export type ThemeTokens = {
  bg: string;
  surface: string;
  title: string;
  tx: string;
  txMute: string;
  selected: string;
  danger: string;
  statusOk: string;
  statusWarn: string;
  statusError: string;
  // ... tous les tokens du design system
};

export function useThemeTokens(): ThemeTokens {
  const mode = useThemeMode(); // 'light' | 'dark' | 'black'
  if (mode === 'light') return mapTokens(Light);
  if (mode === 'black') return mapTokens(Black);
  return mapTokens(Dark);
}
```

### Étape 2 — Table de correspondance CSS → token JS

| CSS variable | Token JS | Fichier source |
|---|---|---|
| `var(--color-awan-bg)` | `UiBgLight` / `UiBgDark` | `light.js` / `dark.js` |
| `var(--color-awan-surface)` | `UiSurfaceLight` | idem |
| `var(--color-awan-title)` | `UiTitleLight` | idem |
| `var(--color-awan-tx)` | `UiTextLight` | idem |
| `var(--color-awan-tx-mute)` | `UiMuteLight` | idem |
| `var(--color-awan-selected)` | `UiSelectedLight` | idem |
| `var(--color-awan-status-ok)` | à identifier | idem |
| `var(--color-awan-status-warn)` | à identifier | idem |
| `var(--color-awan-status-error)` | `UiDangerLight` | idem |

### Étape 3 — Migration fichier par fichier (Jours 2-10)

**Ordre de migration** (du plus simple au plus complexe) :

```
Jour 2  : src/components/ui/Touch.tsx, Heading.tsx, InstrumentCard.tsx
Jour 3  : src/components/ui/Toast.tsx, QuickActions.tsx
Jour 4  : src/components/AppHeader.tsx, MainLayout.tsx, MoonMenu.tsx
Jour 5  : src/components/Animated.tsx, BilanZen.tsx, AwanScoreDisplay.tsx
Jour 6  : src/screens/LockScreen.tsx, JournalScreen.tsx
Jour 7  : src/screens/MensurationScreen.tsx, SettingsScreen.tsx
Jour 8  : src/screens/IslamScreen.tsx, TrajetScreen.tsx, TasksScreen.tsx
Jour 9  : src/screens/SportScreen.tsx, PlanningScreen.tsx
Jour 10 : src/screens/NutritionScreen.tsx, AnalyseScreen.tsx + onglets Analyse
```

Pattern de migration type (même pour chaque fichier) :

```typescript
// AVANT
fill={'var(--color-awan-status-ok)'}
color={'var(--color-awan-tx-mute)'}

// APRÈS
const colors = useThemeTokens();
fill={colors.statusOk}
color={colors.txMute}
```

### Règle de sécurité

Après chaque fichier migré : `npx tsc --noEmit` doit passer.
Ne jamais migrer plusieurs fichiers avant de vérifier le typage.

### Critères de sortie J0.2

- [ ] `grep -rn "var(--color-awan" src/` → 0 résultat
- [ ] `npx tsc --noEmit` → 0 erreurs
- [ ] L'app compile et s'affiche correctement sur émulateur (thème dark + light)
- [ ] Aucune couleur en dur (`#FFFFFF`, `#000000`) introduite — uniquement tokens

---

## J0.3 — Storage : expo-sqlite + WAL

**Durée : 4 jours**

### Tâches

Réécrire `src/data/storage/SqliteStorage.ts` avec `expo-sqlite` v14.
L'interface `IStorage` est **conservée identique** — seule l'implémentation change.

```typescript
// src/data/storage/SqliteStorage.ts — APRÈS J0.3
import * as ExpoSQLite from 'expo-sqlite';

export class SqliteStorage implements IStorage {
  private db: ExpoSQLite.SQLiteDatabase | null = null;

  async open(): Promise<void> {
    this.db = await ExpoSQLite.openDatabaseAsync(this.dbName);
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }

  async get<T>(key: string, parse: ParseFn<T>): Promise<T | null> {
    const row = await this.db!.getFirstAsync<{value: string}>(
      'SELECT value FROM kv WHERE key = ?', [key]
    );
    if (!row) return null;
    return parse(JSON.parse(row.value));
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.db!.runAsync(
      'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)]
    );
  }
  // ... reste de l'interface IStorage
}
```

Modifier `storageService.ts` :
- Supprimer `initStorageEncryption()` (Capacitor SQLite spécifique)
- Remplacer `isNativePlatform()` par `Platform.OS !== 'web'` (react-native)
- Sur web : conserver `IndexedDBStorage` (inchangé)

### Vérification de performance après migration

```typescript
// Test à écrire dans tests/storage.bench.ts
const t0 = Date.now();
for (let i = 0; i < 100; i++) {
  await storage.set(`test.${i}`, { value: i });
}
const avg = (Date.now() - t0) / 100;
expect(avg).toBeLessThan(2); // < 2ms par écriture
```

### Critères de sortie J0.3

- [ ] `SqliteStorage` compilé avec `expo-sqlite`, sans référence `@capacitor-community/sqlite`
- [ ] WAL activé et vérifié (`PRAGMA journal_mode` retourne `wal`)
- [ ] Temps d'écriture moyen < 2ms mesuré (100 écritures)
- [ ] Toutes les données Nutrition + Sport + Sommeil lisibles après migration
- [ ] `npx tsc --noEmit` → 0 erreurs

---

## J0.4 — Plugins natifs

**Durée : 5 jours**

### Notifications : `expo-notifications` (Jour 1-2)

Remplace `@capacitor/local-notifications` dans `IslamScreen.tsx` et `SportScreen.tsx`.

```typescript
// AVANT
const { LocalNotifications } = await import('@capacitor/local-notifications');
await LocalNotifications.schedule({ notifications: [...] });

// APRÈS
import * as Notifications from 'expo-notifications';
await Notifications.scheduleNotificationAsync({
  content: { title, body },
  trigger: { date: triggerDate },
});
```

Points spécifiques :
- `LocalNotifications.cancel()` → `Notifications.cancelScheduledNotificationAsync(id)`
- `LocalNotifications.checkPermissions()` → `Notifications.getPermissionsAsync()`
- `LocalNotifications.requestPermissions()` → `Notifications.requestPermissionsAsync()`

### Filesystem : `expo-file-system` (Jour 3)

Remplace `@capacitor/filesystem` dans `SettingsScreen.tsx` (export données).

```typescript
// AVANT
const { Filesystem, Directory } = await import('@capacitor/filesystem');
await Filesystem.writeFile({
  path: 'awan-export.json',
  data: json,
  directory: Directory.ExternalStorage,
});

// APRÈS
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
const uri = FileSystem.documentDirectory + 'awan-export.json';
await FileSystem.writeAsStringAsync(uri, json);
await Sharing.shareAsync(uri); // partage natif
```

### App lifecycle : BackHandler (Jour 4)

Remplace `@capacitor/app` dans `MainLayout.tsx` et `useAndroidBack.ts`.

```typescript
// AVANT
const { App } = await import('@capacitor/app');
App.addListener('backButton', handler);
App.exitApp();

// APRÈS
import { BackHandler } from 'react-native';
BackHandler.addEventListener('hardwareBackPress', handler);
BackHandler.exitApp();
```

### StatusBar : `expo-status-bar` (Jour 5)

Remplace la logique `@capacitor/status-bar` déjà dans `useTheme.ts` :

```typescript
// AVANT (dynamic import Capacitor)
import('@capacitor/status-bar').then(({ StatusBar, Style }) => { ... });

// APRÈS
import { setStatusBarBackgroundColor, setStatusBarStyle } from 'expo-status-bar';
setStatusBarBackgroundColor(colors.bg);
setStatusBarStyle(mode === 'light' ? 'dark' : 'light');
```

### Critères de sortie J0.4

- [ ] Prières : notifications programmées et reçues sur émulateur Android
- [ ] Sport : alerte de séance reçue
- [ ] Export données : fichier partageable depuis SettingsScreen
- [ ] Bouton retour Android : comportement identique à avant
- [ ] StatusBar : couleur synchronisée avec le thème
- [ ] Zéro import `@capacitor/*` restant dans le code source

---

## J0.5 — Navigation : wouter → React Navigation

**Durée : 3 jours**

### Contexte

`wouter` n'est utilisé que dans 2 fichiers. C'est la migration la plus rapide de J0.

### Architecture React Navigation cible

```
RootNavigator (Stack)
├── LockScreen
└── MainApp (Tab Navigator)
    ├── Planning
    ├── Nutrition
    ├── Sport
    ├── Islam
    ├── Analyse
    ├── Journal
    ├── Sommeil
    ├── Mensuration
    ├── Trajet
    ├── Tasks
    └── Settings
```

### Réécriture MainLayout.tsx

```typescript
// AVANT (wouter)
import { Switch, Route, useLocation } from 'wouter';
<Switch>
  <Route path="/nutrition" component={NutritionScreen} />
  ...
</Switch>

// APRÈS (React Navigation)
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
const Tab = createBottomTabNavigator();
<Tab.Navigator>
  <Tab.Screen name="Nutrition" component={NutritionScreen} />
  ...
</Tab.Navigator>
```

### SettingsScreen.tsx

```typescript
// AVANT
import { useLocation } from 'wouter';
const [, setLocation] = useLocation();
setLocation('/nutrition');

// APRÈS
import { useNavigation } from '@react-navigation/native';
const navigation = useNavigation();
navigation.navigate('Nutrition');
```

### Critères de sortie J0.5

- [ ] Navigation entre tous les écrans fonctionnelle
- [ ] Bouton retour Android géré par React Navigation
- [ ] `wouter` absent de `package.json` et du code source
- [ ] Aucune URL dans la barre d'adresse (comportement natif)

---

## J0.6 — Animations : motion → react-native-reanimated

**Durée : 2 semaines**
**Deuxième bloc le plus complexe après J0.2**

### Inventaire motion dans le codebase

```
src/components/Animated.tsx        — PageWrapper (transition entrée)
src/components/ui/Touch.tsx        — feedback press
src/components/ui/InstrumentCard.tsx — animation status badge
src/components/ui/Toast.tsx        — slide in/out
src/components/ui/QuickActions.tsx — spring actions rapides
src/components/ui/Heading.tsx      — fade in
src/components/MainLayout.tsx      — transitions de navigation
src/components/MoonMenu.tsx        — menu radial
src/components/AppHeader.tsx       — collapse/expand
src/screens/NutritionScreen.tsx    — modals, list items
src/screens/LockScreen.tsx         — unlock animation
src/screens/PlanningScreen.tsx     — drag items
```

### Table de correspondance API

| motion | reanimated | Notes |
|---|---|---|
| `motion.div` / `motion.View` | `Animated.View` | Composant de base |
| `initial={{ opacity: 0 }}` | `useSharedValue(0)` + `useAnimatedStyle` | Style animé |
| `animate={{ opacity: 1 }}` | `withTiming(1, { duration })` | Animation |
| `exit={{ opacity: 0 }}` | Géré manuellement avant unmount | Plus complexe |
| `AnimatePresence` | `useAnimatedStyle` conditionnel | Remplacer |
| `transition={{ type: 'spring' }}` | `withSpring(value, config)` | Direct |
| `whileTap={{ scale: 0.95 }}` | `useAnimatedStyle` + gesture | `Touch.tsx` |

### Stratégie par composant

**`PageWrapper` (Animated.tsx)** — animation d'entrée de page :
```typescript
// AVANT
<motion.View initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

// APRÈS
const opacity = useSharedValue(0);
const translateY = useSharedValue(20);
useEffect(() => {
  opacity.value = withTiming(1, { duration: 300 });
  translateY.value = withTiming(0, { duration: 300 });
}, []);
const style = useAnimatedStyle(() => ({
  opacity: opacity.value,
  transform: [{ translateY: translateY.value }],
}));
<Animated.View style={style}>
```

**`Touch.tsx`** — feedback press (le plus utilisé) :
```typescript
// AVANT : whileTap={{ scale: 0.97 }}
// APRÈS : Pressable + withSpring
const scale = useSharedValue(1);
const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
<Animated.View style={style}>
  <Pressable
    onPressIn={() => { scale.value = withSpring(0.97); }}
    onPressOut={() => { scale.value = withSpring(1); }}
  >
```

**`Toast.tsx`** — slide in/out :
Utiliser `useAnimatedStyle` avec `withTiming` pour translateY.

**`MoonMenu.tsx`** — menu radial :
Animation spring sur chaque item. Même pattern Touch.tsx.

### Ordre de migration (Jours 1-10)

```
Jour 1-2  : Touch.tsx (le plus critique, utilisé partout)
Jour 3    : Heading.tsx, Toast.tsx
Jour 4    : Animated.tsx (PageWrapper)
Jour 5    : InstrumentCard.tsx, QuickActions.tsx
Jour 6-7  : AppHeader.tsx, MainLayout.tsx
Jour 8-9  : MoonMenu.tsx, LockScreen.tsx
Jour 10   : NutritionScreen.tsx (modals), PlanningScreen.tsx
```

### Critères de sortie J0.6

- [ ] `motion` et `AnimatePresence` absents du code source
- [ ] Toutes les animations visuellement identiques à l'avant (ou meilleures)
- [ ] 120 Hz maintenu lors des transitions de page (profiler React Native)
- [ ] `npx tsc --noEmit` → 0 erreurs

---

## J0.7 — Icons : lucide-react → lucide-react-native

**Durée : 2 jours**

### Tâche

`lucide-react-native` expose exactement la même API que `lucide-react`.
La migration est mécanique : remplacer les imports.

```typescript
// AVANT
import { ChevronRight, Plus, Trash2 } from 'lucide-react';

// APRÈS
import { ChevronRight, Plus, Trash2 } from 'lucide-react-native';
```

Script de migration automatique :
```bash
find src -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i "s/from 'lucide-react'/from 'lucide-react-native'/g"
```

Vérifier après : certains composants Lucide utilisent `strokeWidth` différemment.
`lucide-react-native` requiert `react-native-svg` (déjà installé ✅).

### Critères de sortie J0.7

- [ ] `lucide-react` absent des imports (sauf `lucide-react-native`)
- [ ] Toutes les icônes s'affichent correctement sur émulateur
- [ ] `npx tsc --noEmit` → 0 erreurs

---

## J0.8 — Build & Validation Régression Complète

**Durée : 5 jours**

### Checklist de régression par module

#### Nutrition (Jour 1)
- [ ] Ajouter un repas → données persistées en SQLite
- [ ] Recherche aliment → résultats corrects
- [ ] Aliment custom → réutilisable après fermeture (fix C3)
- [ ] Export nutrition → fichier partageable
- [ ] Coach nutrition → déclenché après ajout repas (fix C1)

#### Sport (Jour 1)
- [ ] Créer une séance → données persistées
- [ ] Notification de séance → reçue à l'heure
- [ ] Coach sport → déclenché après séance (fix C1)

#### Islam (Jour 2)
- [ ] Prières programmées → notifications reçues 5 fois/jour
- [ ] Score adhérence → calculé correctement
- [ ] Onglet IslamTab Analyse → graphiques affichés

#### Sommeil + Mensuration (Jour 2)
- [ ] Ajout entrée sommeil → Coach day.ended déclenché (fix C1)
- [ ] Mesures → persistées et affichées dans BiometrieTab
- [ ] Poids → courbe d'évolution correcte

#### Analyse — 15 onglets (Jour 3)
- [ ] BudgetTab : T_production/T_friction/T_slack affichés (même si partiels)
- [ ] TempsTab : ClockPie affiché avec données réelles
- [ ] ReadinessTab : badge OPTIMAL/VIGILANCE/REPOS calculé
- [ ] RecoveryTab : ACWR calculé et courbe 28j affichée
- [ ] PerformanceTab : 1RM top 5 et tonnage affichés
- [ ] NutritionTab : kcal/P/C/F du jour affichés
- [ ] IslamTab : score fard 30j affiché
- [ ] Tous les autres onglets : aucune erreur JS ni écran blanc

#### Planning (Jour 4)
- [ ] Créer une tâche → persistée
- [ ] Optimiser un jour → schedule généré
- [ ] StatusBar → couleur synchronisée avec le thème

#### Thèmes (Jour 4)
- [ ] Thème light → toutes les couleurs correctes (tokens JS, pas CSS vars)
- [ ] Thème dark → idem
- [ ] Thème black → idem
- [ ] Changement de thème → StatusBar mise à jour

#### Performance (Jour 5)
- [ ] 100 écritures SQLite → moyenne < 2ms
- [ ] Scroll timeline Analyse → 120 Hz stable (profiler)
- [ ] Ouverture app → < 3 secondes cold start

### Build signé Android

```bash
npx expo build:android --type apk
# OU via EAS Build :
eas build --platform android --profile preview
```

### Critères de sortie J0.8 (= critères de sortie J0 complet)

- [ ] Build Android signé fonctionnel sur vrai appareil (pas seulement émulateur)
- [ ] Zéro import `@capacitor/*` dans le code source
- [ ] Zéro `var(--color-awan-*)` dans le code source
- [ ] Zéro `motion` / `AnimatePresence` dans le code source
- [ ] Zéro `wouter` dans le code source
- [ ] `npx tsc --noEmit` → 0 erreurs
- [ ] WAL SQLite actif et vérifié
- [ ] Temps d'écriture SQLite < 2ms moyen
- [ ] Toutes les cases de la checklist de régression cochées
- [ ] `npm test` (vitest) → suite existante 100% verte

---

## Tableau de bord J0

| Micro-jalon | Durée | Dépend de | Risque principal |
|---|---|---|---|
| J0.0 Audit & branche | 3j | — | Aucun |
| J0.1 Init Expo | 4j | J0.0 | Conflits dépendances |
| J0.2 Design Tokens | 2 sem | J0.1 | 666 occurrences — le plus risqué |
| J0.3 expo-sqlite | 4j | J0.1 | Migration données existantes |
| J0.4 Plugins natifs | 5j | J0.1 | Permissions Android |
| J0.5 Navigation | 3j | J0.4 | Deep links si futurs |
| J0.6 Animations | 2 sem | J0.2 + J0.5 | Parité visuelle motion → reanimated |
| J0.7 Icons | 2j | J0.6 | Aucun |
| J0.8 Build & Régression | 5j | tous | Écrans blancs non détectés |

**Séquence parallélisable :**
J0.3, J0.4, J0.5 peuvent démarrer en parallèle une fois J0.1 terminé.
J0.2 et J0.6 doivent rester séquentiels (J0.2 d'abord, J0.6 ensuite).

---

## Règles de sécurité pendant J0

1. **`npx tsc --noEmit` après chaque fichier modifié** — ne jamais accumuler des erreurs TS.
2. **Un commit par micro-jalon terminé** — pas de méga-commit J0 en une seule fois.
3. **Jamais de valeur de couleur en dur** (`#FFFFFF`, `#1A1A1A`) — uniquement `colors.tokenName`.
4. **L'app web (IndexedDB) doit rester fonctionnelle** pendant toute la durée de J0.
5. **Aucune feature nouvelle pendant J0** — migration pure, zéro ajout.

---

*Plan généré le 2026-06-04 — basé sur audit direct du commit `c311efc`.*
*Durée révisée : 7-8 semaines (vs 3 semaines estimées initialement — correction après audit code réel).*
