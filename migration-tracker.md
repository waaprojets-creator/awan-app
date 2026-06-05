# AWAN — Migration Tracker : Capacitor → Expo Bare
**Branche : `feat/expo-migration` — Base : commit `4aae919` (main)**
**Date d'audit : 2026-06-04**

---

## Baseline TypeScript

```
npx tsc --noEmit → 0 erreurs ✅
```

---

## Résumé des incompatibilités

| Catégorie | Volume | Jalons concernés |
|---|---|---|
| CSS vars | 723 occurrences, 47 fichiers | J0.2 |
| motion/Framer Motion | 22 fichiers | J0.6 |
| Capacitor plugins | 9 fichiers | J0.3, J0.4 |
| wouter (routing) | 2 fichiers | J0.5 |
| leaflet/react-leaflet | 1 fichier (TrajetScreen) | J0.4 étendu |
| Tokens JS manquants | 14 CSS vars sans équivalent JS | J0.2 (prérequis) |

---

## Section A — CSS vars (47 fichiers, 723 occurrences)

Chaque `var(--color-awan-*)` est invalide en React Native natif.
Migration : remplacer par `useThemeTokens()` hook (à créer en J0.2).

| Occurrences | Fichier | J0.2 Statut |
|---|---|---|
| 112 | src/screens/IslamScreen.tsx | ⬜ À faire |
| 65  | src/screens/DashboardScreen.tsx | ⬜ À faire |
| 56  | src/screens/TasksScreen.tsx | ⬜ À faire |
| 52  | src/screens/PlanningScreen.tsx | ⬜ À faire |
| 50  | src/screens/analyse/ScanTab.tsx | ⬜ À faire |
| 42  | src/screens/analyse/TempsTab.tsx | ⬜ À faire |
| 28  | src/screens/analyse/RecoveryTab.tsx | ⬜ À faire |
| 27  | src/screens/MensurationScreen.tsx | ⬜ À faire |
| 24  | src/components/AwanScoreDisplay.tsx | ⬜ À faire |
| 21  | src/screens/analyse/BudgetTab.tsx | ⬜ À faire |
| 21  | src/screens/SleepScreen.tsx | ⬜ À faire |
| 19  | src/screens/SportScreen.tsx | ⬜ À faire |
| 18  | src/screens/NutritionScreen.tsx | ⬜ À faire |
| 17  | src/components/ui/InstrumentCard.tsx | ⬜ À faire |
| 15  | src/screens/analyse/BiometrieTab.tsx | ⬜ À faire |
| 14  | src/screens/SettingsScreen.tsx | ⬜ À faire |
| 12  | src/components/ui/DateSelectPopup.tsx | ⬜ À faire |
| 10  | src/screens/SanteScreen.tsx | ⬜ À faire |
| 9   | src/components/MoonMenu.tsx | ⬜ À faire |
| 8   | src/screens/analyse/shared.tsx | ⬜ À faire |
| 8   | src/screens/analyse/SynoptiqueTab.tsx | ⬜ À faire |
| 8   | src/screens/analyse/FluxDensiteTab.tsx | ⬜ À faire |
| 7   | src/screens/analyse/PerformanceTab.tsx | ⬜ À faire |
| 7   | src/screens/analyse/IslamTab.tsx | ⬜ À faire |
| 7   | src/hooks/useDbFill.ts | ⬜ À faire |
| 7   | src/components/ui/WidgetInfo.tsx | ⬜ À faire |
| 5   | src/screens/TrajetScreen.tsx | ⬜ À faire |
| 5   | src/components/ui/Toast.tsx | ⬜ À faire |
| 5   | src/components/AppHeader.tsx | ⬜ À faire |
| 4   | src/screens/analyse/MetaboliqueTab.tsx | ⬜ À faire |
| 4   | src/screens/PhilosophieScreen.tsx | ⬜ À faire |
| 4   | src/screens/CoachScreen.tsx | ⬜ À faire |
| 4   | src/components/MainLayout.tsx | ⬜ À faire |
| 4   | src/components/DbFillGauge.tsx | ⬜ À faire |
| 3   | src/screens/analyse/ReadinessTab.tsx | ⬜ À faire |
| 3   | src/screens/analyse/CorrelationTab.tsx | ⬜ À faire |
| 3   | src/screens/LockScreen.tsx | ⬜ À faire |
| 3   | src/components/ui/ScreenHeader.tsx | ⬜ À faire |
| 2   | src/screens/analyse/OrthometryTab.tsx | ⬜ À faire |
| 2   | src/screens/AnalyseScreen.tsx | ⬜ À faire |
| 2   | src/components/BodySvg.tsx | ⬜ À faire |
| 2   | src/components/BodyMeasureSvg.tsx | ⬜ À faire |
| 1   | src/screens/analyse/ActivityTab.tsx | ⬜ À faire |
| 1   | src/screens/JournalScreen.tsx | ⬜ À faire |
| 1   | src/hooks/useTemporalMode.ts | ⬜ À faire |
| 1   | src/constants/tokenIcons.tsx | ⬜ À faire |

---

## Section B — motion/Framer Motion (22 fichiers)

Toutes les importations sont depuis `'motion/react'` (v6+). Web-only, incompatible RN natif.
Migration : `react-native-reanimated` v3 + `react-native-gesture-handler`.

| Fichier | Usage spécifique | Complexité | J0.6 Statut |
|---|---|---|---|
| src/screens/PlanningScreen.tsx | `useDragControls` — DnD tâches | 🔴 HAUTE | ⬜ À faire |
| src/components/MainLayout.tsx | `AnimatePresence` transitions nav | 🟡 MOYENNE | ⬜ À faire |
| src/screens/LockScreen.tsx | `AnimatePresence` unlock | 🟡 MOYENNE | ⬜ À faire |
| src/screens/NutritionScreen.tsx | `AnimatePresence` modals | 🟡 MOYENNE | ⬜ À faire |
| src/screens/JournalScreen.tsx | `AnimatePresence` | 🟡 MOYENNE | ⬜ À faire |
| src/screens/MensurationScreen.tsx | `AnimatePresence` | 🟡 MOYENNE | ⬜ À faire |
| src/screens/SettingsScreen.tsx | `AnimatePresence` | 🟡 MOYENNE | ⬜ À faire |
| src/screens/IslamScreen.tsx | `AnimatePresence` | 🟡 MOYENNE | ⬜ À faire |
| src/screens/TrajetScreen.tsx | `AnimatePresence` | 🟡 MOYENNE | ⬜ À faire |
| src/components/MoonMenu.tsx | `AnimatePresence` menu radial | 🟡 MOYENNE | ⬜ À faire |
| src/components/Animated.tsx | `AnimatePresence` PageWrapper | 🟢 FAIBLE | ⬜ À faire |
| src/components/ui/Toast.tsx | `AnimatePresence` slide | 🟢 FAIBLE | ⬜ À faire |
| src/components/ui/QuickActions.tsx | `AnimatePresence` spring | 🟢 FAIBLE | ⬜ À faire |
| src/components/ui/Touch.tsx | `motion` press feedback | 🟢 FAIBLE | ⬜ À faire |
| src/components/ui/InstrumentCard.tsx | `motion` badge | 🟢 FAIBLE | ⬜ À faire |
| src/components/ui/Heading.tsx | `motion` fade in | 🟢 FAIBLE | ⬜ À faire |
| src/components/AppHeader.tsx | `motion` collapse/expand | 🟢 FAIBLE | ⬜ À faire |
| src/components/BilanZen.tsx | `motion` | 🟢 FAIBLE | ⬜ À faire |
| src/components/AwanScoreDisplay.tsx | `motion` | 🟢 FAIBLE | ⬜ À faire |
| src/screens/SportScreen.tsx | `motion` | 🟢 FAIBLE | ⬜ À faire |
| src/screens/AnalyseScreen.tsx | `motion` | 🟢 FAIBLE | ⬜ À faire |
| src/screens/TasksScreen.tsx | `motion` | 🟢 FAIBLE | ⬜ À faire |

**Note DnD :** `PlanningScreen` utilise `useDragControls` de motion pour le drag des tâches.
Remplacer par `react-native-gesture-handler` + `react-native-reanimated` (Gesture API v2).

---

## Section C — Capacitor plugins (9 fichiers)

Tous les imports `@capacitor/*` doivent être remplacés par les équivalents Expo.

| Fichier | Plugin Capacitor | Remplacé par | Jalon |
|---|---|---|---|
| src/data/storage/SqliteStorage.ts | `@capacitor-community/sqlite` | `expo-sqlite` v15 (JSI) | J0.3 |
| src/data/storage/storageService.ts | `@capacitor-community/sqlite` | `expo-sqlite` v15 | J0.3 |
| src/screens/IslamScreen.tsx | `@capacitor/local-notifications` | `expo-notifications` | J0.4 |
| src/screens/SportScreen.tsx | `@capacitor/local-notifications` | `expo-notifications` | J0.4 |
| src/screens/SettingsScreen.tsx | `@capacitor/filesystem` | `expo-file-system` + `expo-sharing` | J0.4 |
| src/components/MainLayout.tsx | `@capacitor/app` (exitApp) | `BackHandler.exitApp()` RN | J0.4 |
| src/hooks/useAndroidBack.ts | `@capacitor/app` (backButton) | `BackHandler` RN | J0.4 |
| src/hooks/useTheme.ts | `@capacitor/status-bar` | `expo-status-bar` | J0.4 |
| src/services/mediaCacheService.ts | `@capacitor/core` + `@capacitor/filesystem` | `Platform.OS` + `expo-file-system` | J0.4 |

**Fichiers concernés — J0.3 Statut :**
- src/data/storage/SqliteStorage.ts : ⬜ À faire
- src/data/storage/storageService.ts : ⬜ À faire

**Fichiers concernés — J0.4 Statut :**
- src/screens/IslamScreen.tsx : ⬜ À faire
- src/screens/SportScreen.tsx : ⬜ À faire
- src/screens/SettingsScreen.tsx : ⬜ À faire
- src/components/MainLayout.tsx : ⬜ À faire
- src/hooks/useAndroidBack.ts : ⬜ À faire
- src/hooks/useTheme.ts : ⬜ À faire
- src/services/mediaCacheService.ts : ⬜ À faire

---

## Section D — Tokens JS manquants (prérequis J0.2)

Les fichiers `light.js`, `dark.js`, `black.js` (style-dictionary) ne couvrent pas
toutes les CSS vars utilisées dans le code. Avant de migrer les 723 occurrences,
il faut créer les tokens JS manquants.

| CSS variable | Token JS à créer | Valeur probable | Présent dans JS ? |
|---|---|---|---|
| `--color-awan-bg` | `UiBg` | `UiBgLight/Dark/Black` | ✅ Existe |
| `--color-awan-surface` | `UiSurface` | `UiSurfaceLight/Dark/Black` | ✅ Existe |
| `--color-awan-surface-dim` | `UiSurfaceDim` | À définir | ❌ Manquant |
| `--color-awan-border` | `UiBorder` | À définir | ❌ Manquant |
| `--color-awan-border-soft` | `UiBorderSoft` | À définir | ❌ Manquant |
| `--color-awan-overlay` | `UiOverlay` | À définir | ❌ Manquant |
| `--color-awan-overlay-deep` | `UiOverlayDeep` | À définir | ❌ Manquant |
| `--color-awan-tx` | `UiText` | `UiTextLight/Dark/Black` | ✅ Existe |
| `--color-awan-tx-mute` | `UiMute` | `UiMuteLight/Dark/Black` | ✅ Existe |
| `--color-awan-tx-dim` | `UiTextDim` | À définir | ❌ Manquant |
| `--color-awan-gold` | `UiSelected` | `UiSelectedLight/Dark/Black` | ✅ Existe (alias) |
| `--color-awan-status-ok` | `UiStatusOk` | `Palette2 #27AE60` | ❌ Manquant |
| `--color-awan-status-warn` | `UiStatusWarn` | `Palette3 #F39C12` | ❌ Manquant |
| `--color-awan-status-error` | `UiDanger` | `UiDangerLight #8A0C0C` | ✅ Existe (alias) |
| `--color-awan-status-info` | `UiStatusInfo` | `Palette1 #3498DB` | ❌ Manquant |
| `--color-awan-status-spirit` | `UiStatusSpirit` | `Palette4 #8E44AD` | ❌ Manquant |
| `--font-sans` | `FontSans` | À lire depuis CSS | ❌ Manquant |
| `--font-mono` | `FontMono` | À lire depuis CSS | ❌ Manquant |
| `--fw-label/body/mute/display/value` | `FwLabel…` | Valeurs numériques | ❌ Manquant |

**Action J0.2 (Jour 1) :** Lire les valeurs CSS actuelles depuis le fichier CSS racine,
puis ajouter les tokens manquants dans `light.js`, `dark.js`, `black.js`,
et régénérer via `npm run build:theme`.

---

## Section E — leaflet/react-leaflet (découverte d'audit)

Non prévu dans le plan J0 initial. Ajout à J0.4.

| Fichier | Dépendance | Remplacé par | Jalon |
|---|---|---|---|
| src/screens/TrajetScreen.tsx | `leaflet` + `react-leaflet` | `react-native-maps` | J0.4 étendu |

**Note :** `react-native-maps` requiert une clé API Google Maps Android (à configurer).
Alternative : désactiver temporairement TrajetScreen pendant J0 et le traiter en J0.4+.

**J0.4 Statut :**
- src/screens/TrajetScreen.tsx (leaflet) : ⬜ À faire

---

## Section F — wouter (routing)

Migration vers React Navigation (J0.5).

| Fichier | Usage | J0.5 Statut |
|---|---|---|
| src/components/MainLayout.tsx | `Switch`, `Route`, `useLocation` | ⬜ À faire |
| src/screens/SettingsScreen.tsx | `useLocation` | ⬜ À faire |

---

## Critères de sortie J0.0 ✅

- [x] Branche `feat/expo-migration` créée depuis `main` (commit `4aae919`)
- [x] `migration-tracker.md` créé avec 6 sections exhaustives
- [x] `npx tsc --noEmit` → 0 erreurs documenté
- [x] Aucune modification du code de l'application

---

*Tracker généré le 2026-06-04 — audit direct commit `4aae919`.*

---

## Section G — Checklist de clôture J0 (à valider en J0.8)

**Ces critères doivent tous être cochés avant de merger `feat/expo-migration` dans `main`.**

### G1 — Intégrité des données SQLite

- [ ] **Checksum de migration** : row-count identique entre base Capacitor (avant) et base expo-sqlite (après). Vérifier pour chaque préfixe clé : `nutrition.meal`, `sport.session`, `sleep.entry`, `body.weight`, `anthropo.measurement`, `islam.prayer`
- [ ] **WAL actif** : `PRAGMA journal_mode;` retourne `wal` au démarrage (log console confirmé)
- [ ] **IStorage inchangée** : aucune modification de signature dans `src/data/storage/IStorage.ts` — tous les services appellent la même interface

### G2 — Parité fonctionnelle et design

- [ ] **CSS vars purgées** : `grep -rn "var(--" src/` → 0 résultat
- [ ] **Tokens couverts** : tous les tokens manquants (Section D) ajoutés dans `light.js`/`dark.js`/`black.js`
- [ ] **Parité visuelle** : thème light + dark + black validés sur émulateur (captures d'écran comparatives)
- [ ] **120 Hz** : profiler React Native — aucun drop de frame lors des transitions et du scroll timeline

### G3 — Stabilité technique

- [ ] **TypeScript** : `npx tsc --noEmit` → 0 erreurs
- [ ] **Tests** : `npm test` (vitest) → suite existante 100% verte
- [ ] **Build physique** : APK signé installé et démarré sur appareil réel Android sans crash ni écran blanc
- [ ] **Question de clôture** : `rm -rf node_modules android/ ios/ && eas build` → build réussi, base de données lue avec 0 erreur de schéma

### G4 — Gouvernance et sécurité

- [ ] **Audit réseau** : network monitor Android Studio — aucune requête sortante émise pendant une session complète
- [ ] **Zéro Capacitor** : `grep -rn "@capacitor" src/` → 0 résultat
- [ ] **Zéro motion** : `grep -rn "from 'motion" src/` → 0 résultat
- [ ] **Zéro wouter** : `grep -rn "from 'wouter" src/` → 0 résultat
- [ ] **Critères j0_plan_migration_expo.md** : toutes les cases J0.0→J0.8 cochées
