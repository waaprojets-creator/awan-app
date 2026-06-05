# J0 — État de la migration Capacitor → Expo Bare

> Dernière mise à jour : 2026-06-05

---

## J0.1 — Initialisation Expo Bare ✅

| Tâche | Statut |
|---|---|
| `app.json` créé (expo config) | ✅ |
| `metro.config.js` créé | ✅ |
| `babel.config.js` + reanimated plugin | ✅ |
| `capacitor.config.json` supprimé | ✅ |
| Deps Expo ajoutées (`expo`, `expo-sqlite`, `expo-notifications`, `expo-file-system`, `expo-status-bar`, `expo-sharing`) | ✅ |
| Deps RN ajoutées (`@react-navigation/*`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-screens`) | ✅ |
| `npx tsc --noEmit` → 0 erreurs | ✅ |

**Non vérifié :** `npx expo start` (émulateur non disponible dans cet environnement).

---

## J0.2 — Design Tokens : CSS vars → useTheme ✅

| Métrique | Valeur |
|---|---|
| `grep -rn "var(--" src/` | **0 résultat** |
| `npx tsc --noEmit` | **0 erreur** |
| `npm test` | **34/34 fichiers, 1030/1030 tests** |
| Fichiers migrés | **46 fichiers** |
| Variables CSS liquidées | **~666** |

### Fichiers modifiés (par jour d'exécution)

| Jour | Fichiers |
|---|---|
| 2-7 | tokenIcons, useTemporalMode, ActivityTab, JournalScreen, BodySvg, BodyMeasureSvg, AnalyseScreen, LockScreen, CorrelationTab, ReadinessTab, ScreenHeader, MainLayout, DbFillGauge, CoachScreen, PhilosophieScreen, OrthometryTab, MetaboliqueTab, AppHeader, Toast, TrajetScreen, useDbFill, WidgetInfo, IslamTab |
| 8 | SynoptiqueTab, FluxDensiteTab, shared (BarChart, StackedBarChart, GuardCard) |
| 9 | SanteScreen, DateSelectPopup, MoonMenu |
| 10 | InstrumentCard, NutritionScreen, SportScreen, SleepScreen |
| 11 | BudgetTab, AwanScoreDisplay, MensurationScreen |
| 12 | RecoveryTab, TempsTab, ScanTab |
| 13 | PlanningScreen, TasksScreen |
| 14 | DashboardScreen, IslamScreen |

### Patterns appliqués

- **Constante module-level avec CSS var** → fonction `getXxx(t: Pick<AwanTheme, ...>)`, appelée dans le composant avec `const XXX = getXxx(theme)`
- **Helper retournant une CSS var** → paramètre `t: ThemeColors` ajouté à la signature
- **Attribut JSX SVG** (`stroke="var(--...)"`) → `stroke={theme.selected}` (accolades obligatoires)
- **Template-literal border** (`'1px solid var(--...)'`) → `` `1px solid ${theme.border}` ``
- **`color-mix()`** → `rgba()` équivalent hardcodé (ex: `rgba(212,175,55,0.08)`)

---

## J0.3 — Storage : expo-sqlite + WAL ✅

**Dépend de :** J0.1 ✅ — fait.

| Tâche | Fichier | Statut |
|---|---|---|
| Réécrire `SqliteStorage` | `src/data/storage/SqliteStorage.ts` | ✅ `openDatabaseAsync` v15 |
| PRAGMA WAL + busy_timeout | SqliteStorage.open() | ✅ `WAL` / `synchronous=NORMAL` / `busy_timeout=5000` |
| Méthodes réécrites | — | ✅ `get/set/list/listFiltered/listByPrefix/query/aggregate/transaction/exportAll/importAll` |
| Adapter `storageService` | `storageService.ts` | ✅ `Platform.OS` au lieu de `globalThis.Capacitor` |
| Supprimer `initStorageEncryption()` | storageService.ts | ✅ no-op (compat API conservée pour LockScreen) |

API expo-sqlite : `getFirstAsync`/`getAllAsync`/`runAsync`/`execAsync`/`withTransactionAsync`.

---

## J0.4 — Plugins natifs ✅

**Dépend de :** J0.1 ✅ — fait (hors Leaflet).

| Tâche | Fichier(s) | Statut |
|---|---|---|
| Notifications Islam | `IslamScreen.tsx` | ✅ `expo-notifications` (`scheduleNotificationAsync`) |
| Notifications Sport | `SportScreen.tsx` | ✅ idem (`trigger: null`) |
| Filesystem export | `SettingsScreen.tsx` | ✅ `expo-file-system` + `expo-sharing` |
| App lifecycle / Back | `MainLayout.tsx`, `useAndroidBack.ts` | ✅ `BackHandler` |
| StatusBar | `useTheme.ts` | ✅ `expo-status-bar` derrière `Platform.OS` |
| Media cache | `mediaCacheService.ts` | ✅ `Platform.OS !== 'web'` |
| **Leaflet (TrajetScreen)** | `TrajetScreen.tsx` | ❌ **reste à désactiver** → `GuardCard` placeholder |

**Vérification :** `grep -rn "@capacitor" src/` → **0**. (Reste : imports `leaflet`/`react-leaflet` à neutraliser — 3 erreurs tsc.)

---

## J0.5 — Navigation : wouter → React Navigation ✅

**Dépend de :** J0.1 ✅ — fait.

| Tâche | Fichier | Statut |
|---|---|---|
| Routing principal | `MainLayout.tsx` | ✅ `NavigationContainer` + `createBottomTabNavigator` (tabBar masquée, MoonMenu conservé) |
| Navigation impérative | `SettingsScreen.tsx` | ✅ `useNavigation().navigate()` |
| Back Android | `MainLayout.tsx` | ✅ `BackHandler.exitApp()` via `Alert` |

**Vérification :** `grep -rn "from 'wouter'" src/` → **0**. `react-native` ajouté à `package.json` (peer dep Expo).

---

## J0.6 — Animations : motion → react-native-reanimated ✅

**Dépend de :** J0.2 ✅ + J0.5 ✅ — fait.

**Stratégie :** adaptateur centralisé `src/components/motion.tsx` exposant la surface
`motion.<tag>` / `AnimatePresence` au-dessus des Layout Animations reanimated
(`FadeIn*`/`FadeOut*`). Réduit 80+ usages `motion.div/span/button` à un seul point.

| Composant | Traitement |
|---|---|
| `Touch.tsx` | ✅ réécriture `Pressable` + `useSharedValue`/`withSpring` (scale/opacity) |
| `Animated.tsx` | ✅ `PageWrapper`/`StaggerItem` → `Animated.View` + `FadeIn*` ; `AnimatedPressable` → `Touch` |
| `MoonMenu.tsx` | ✅ SVG-DOM dé-motion (statique ; animations d'apparition reviennent au jalon DOM→RN) |
| `PlanningScreen.tsx` | ✅ DnD `useDragControls`→`Gesture.Pan().activateAfterLongPress(500)` + reanimated |
| 17 écrans/UI | ✅ import routé vers `@/components/motion` |
| `App.tsx` | ✅ `GestureHandlerRootView` au root |

**Vérification :** `grep -rn "from 'motion" src/` → **0**. Mocks vitest : reanimated + gesture-handler.

---

## J0.7 — Icons : lucide-react → lucide-react-native ✅

**Dépend de :** J0.6 ✅ — fait.

| Tâche | Statut |
|---|---|
| Remplacement global (36 fichiers) | ✅ `lucide-react` → `lucide-react-native` |
| `style={{ color }}` → `color={}` (7 icônes) | ✅ DateSelectPopup, WidgetInfo, MensurationScreen |
| `className` sur icônes (107) | ✅ augmentation `SvgProps` (`src/types/svg.d.ts`) — recolor className→color différé au jalon DOM→RN |

**Vérification :** `grep -rn "from 'lucide-react'" src/` (hors `-native`) → **0**.

---

## J0.8 — Build & Régression ❌

**Dépend de :** tous J0.1–J0.7.

| Jour | Checklist |
|---|---|
| 1 | Nutrition + Sport : repas persisté, séance persistée, Coach déclenché |
| 2 | Islam + Sommeil + Mensuration : notifications, courbes, mesures |
| 3 | 15 onglets Analyse : aucun écran blanc, données affichées |
| 4 | Thèmes (light/dark/black), StatusBar sync, perf (120Hz, SQLite < 2ms) |
| 5 | Build à froid : `rm -rf node_modules android/ ios/ && eas build` → APK installable |

### Vérification finale

```bash
grep -rn "var(--" src/        # → 0  ✅
grep -rn "@capacitor" src/    # → 0  ✅
grep -rn "from 'motion" src/  # → 0  ✅
grep -rn "from 'wouter'" src/ # → 0  ✅
grep -rn "from 'lucide-react'" src/  # → 0 (hors -native) ✅
npx tsc --noEmit              # → 3 erreurs résiduelles (leaflet TrajetScreen, J0.4)
npm test                      # → ✅ 34/34 fichiers, 1042/1042 tests
```

**Reste avant J0.8 :** neutraliser Leaflet dans `TrajetScreen.tsx` (J0.4, placeholder
`GuardCard`) → ramène tsc à 0 ; chargement des polices Cairo/JetBrains Mono via
`expo-font` ; conversion className→color/style des écrans (jalon DOM→RN).

---

## Séquence d'exécution

```
J0.1 ✅
├── J0.2 ✅
├── J0.3 ✅ ─────────────────────────────────────┐
├── J0.4 ✅ (sauf Leaflet) ──────────────────────├── J0.8 ❌
└── J0.5 ✅ → J0.6 ✅ → J0.7 ✅ ─────────────────┘
```

**Restent :** J0.4-Leaflet (placeholder), jalon DOM→RN (`<div>`/`className`→RN), polices, J0.8 (build).
