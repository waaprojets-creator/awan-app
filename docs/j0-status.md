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

## J0.3 — Storage : expo-sqlite + WAL ❌

**Dépend de :** J0.1 ✅ — peut démarrer.

| Tâche | Fichier | Détail |
|---|---|---|
| Réécrire `SqliteStorage` | `src/data/storage/SqliteStorage.ts` | `@capacitor-community/sqlite` → `expo-sqlite` v15 (`openDatabaseAsync`) |
| Adapter `storageService` | `src/data/storage/storageService.ts` | `Capacitor.isNativePlatform()` → `Platform.OS !== 'web'` |
| PRAGMA WAL + busy_timeout | SqliteStorage.open() | `journal_mode=WAL`, `synchronous=NORMAL`, `busy_timeout=5000` |
| Méthodes à réécrire | — | `get`, `set`, `list`, `listFiltered`, `listByPrefix`, `query`, `aggregate` (JSON_EXTRACT), `transaction`, `exportAll`, `importAll` |
| Supprimer `initStorageEncryption()` | storageService.ts | Capacitor-specific, inutile sous Expo |
| Benchmark | nouveau test | 100 écritures < 2ms/op en moyenne |

---

## J0.4 — Plugins natifs ❌

**Dépend de :** J0.1 ✅ — peut démarrer en parallèle avec J0.3.

| Tâche | Fichier(s) | Migration |
|---|---|---|
| Notifications Islam | `IslamScreen.tsx` (L176, L208) | `@capacitor/local-notifications` → `expo-notifications` |
| Notifications Sport | `SportScreen.tsx` (L118) | idem |
| Filesystem export | `SettingsScreen.tsx` (L78) | `@capacitor/filesystem` → `expo-file-system` + `expo-sharing` |
| App lifecycle | `MainLayout.tsx` (L102) | `@capacitor/app` → `BackHandler` (react-native) |
| Back button | `useAndroidBack.ts` (L18) | idem |
| StatusBar | `useTheme.ts` (L2, L119) | `@capacitor/status-bar` → `expo-status-bar` |
| Media cache | `mediaCacheService.ts` (L1) | `Capacitor.isNativePlatform()` → `Platform.OS !== 'web'` |
| Leaflet (TrajetScreen) | `TrajetScreen.tsx` | Désactiver temporairement → `GuardCard` placeholder |

**Vérification :** `grep -rn "@capacitor" src/` → 0 résultat (actuellement : 11).

---

## J0.5 — Navigation : wouter → React Navigation ❌

**Dépend de :** J0.1 ✅ — peut démarrer en parallèle.

| Tâche | Fichier | Migration |
|---|---|---|
| Routing principal | `MainLayout.tsx` | `Switch/Route` → `createBottomTabNavigator` |
| Navigation impérative | `SettingsScreen.tsx` | `useLocation` → `useNavigation().navigate()` |
| Transitions | options native-stack | `animation: 'slide_from_right'` |

**Vérification :** `grep -rn "from 'wouter'" src/` → 0 résultat (actuellement : 2).

---

## J0.6 — Animations : motion → react-native-reanimated ❌

**Dépend de :** J0.2 ✅ + J0.5.

| Jour | Composants | Complexité |
|---|---|---|
| 1-2 | `Touch.tsx` (réécriture complète → Gesture API v2) | Haute |
| 3 | `Animated.tsx` (PageWrapper, StaggerItem/List) | Moyenne |
| 4 | `Toast.tsx` (slide bottom→top) | Basse |
| 5-6 | UI restants (InstrumentCard, QuickActions, Heading) | Basse |
| 7-8 | AppHeader (collapse), MoonMenu (radial spring), AwanScoreDisplay | Moyenne |
| 9-10 | `AnimatePresence` → bool + `withTiming` sur opacity (tous écrans) | Moyenne |
| 11-12 | PlanningScreen DnD (`useDragControls` → Gesture.Pan) | Haute |

**Vérification :** `grep -rn "from 'motion" src/` → 0 résultat (actuellement : 22).

---

## J0.7 — Icons : lucide-react → lucide-react-native ❌

**Dépend de :** J0.6.

| Tâche | Détail |
|---|---|
| Remplacement global | `sed -i "s/from 'lucide-react'/from 'lucide-react-native'/g"` |
| Vérification manuelle | Certains props diffèrent (`absoluteStrokeWidth`) |
| Dépendance | `react-native-svg` (déjà installé) |

**Vérification :** `grep -rn "from 'lucide-react'" src/` → 0 résultat sauf `lucide-react-native` (actuellement : 37).

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
grep -rn "var(--" src/        # → 0  ✅ (fait)
grep -rn "@capacitor" src/    # → 0  ❌ (11 restants)
grep -rn "from 'motion" src/  # → 0  ❌ (22 restants)
grep -rn "from 'wouter'" src/ # → 0  ❌ (2 restants)
npx tsc --noEmit              # → 0  ✅ (fait)
npm test                      # → ✅  ✅ (1030/1030)
```

---

## Séquence d'exécution

```
J0.1 ✅
├── J0.2 ✅
├── J0.3 ❌ (prêt à démarrer) ────────────────────┐
├── J0.4 ❌ (prêt à démarrer) ────────────────────├── J0.8 ❌
└── J0.5 ❌ (prêt à démarrer) → J0.6 ❌ → J0.7 ❌ ┘
```

**J0.3, J0.4, J0.5 peuvent démarrer immédiatement en parallèle.**
J0.6 dépend de J0.5. J0.7 dépend de J0.6. J0.8 dépend de tous.
