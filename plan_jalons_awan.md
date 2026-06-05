# AWAN — Plan Général & Jalons
**Document de pilotage — 2026-06-04**

---

## Prémisse

WebView (Capacitor) est éliminé. La stack cible est **Expo SDK 52 + React Native bare**,
avec SQLite JSI natif, background tasks réels, et extraction progressive vers un core natif.

La priorité absolue est de livrer les 8 dimensions manquantes à l'utilisateur final.
L'architecture sert les features, pas l'inverse.

---

## Vue d'ensemble des jalons

```
J0   Fondation (migration Capacitor → Expo)             3 semaines
J1   Architecture réactive (JSI, Workers, WAL)          2 semaines
J2   Dimension Temporelle (T_friction, C_et)            4 semaines
J3   Planning complet (timeline unifiée, notifications) 5 semaines
J4   Coach systémique (règles cross-domaines)           5 semaines
J5   Sommeil profond (qualité glymphatique)             2 semaines
J6   Économétrique (VHN, runway, délégation)            3 semaines
J7   Cognitive (Deep Work sanctuarisé)                  3 semaines
J8   Conative + Anthropométrie visuelle                 4 semaines
J9   Core natif (performances plafond dépassé)          À déclencher si besoin
──────────────────────────────────────────────────────
Total J0→J8 : ~31 semaines (~8 mois)
```

---

## J0 — Fondation : migration Capacitor → Expo

**Durée estimée :** 3 semaines
**Bloquant pour :** tous les jalons suivants

### Objectif

Supprimer WebView. Passer sur React Native bare via Expo SDK 52.
L'utilisateur ne voit aucune différence visuelle à l'issue de ce jalon.

### Substitutions techniques

| Actuel (Capacitor) | Cible (Expo) |
|---|---|
| `@capacitor/sqlite` | `expo-sqlite` v14 (JSI natif) |
| `@capacitor/filesystem` | `expo-file-system` |
| `@capacitor/status-bar` | `expo-status-bar` |
| `@capacitor/app` | `expo-application` |
| Background Runner | `expo-task-manager` + `expo-background-fetch` |
| Vite + WebView | Metro bundler + React Native Fabric |

### Critères de sortie

- [ ] Build Android signé fonctionnel sous Expo
- [ ] Nutrition, Sport, Islam : zéro régression (données intactes, flux complets)
- [ ] SQLite WAL activé (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`)
- [ ] `npx tsc --noEmit` → 0 erreurs
- [ ] Temps d'écriture SQLite mesuré < 2ms (vs ~5ms actuel)

---

## J1 — Architecture réactive

**Durée estimée :** 2 semaines
**Dépend de :** J0 terminé

### Objectif

Garantir 120 Hz réel et calculs asynchrones sans bloquer le thread UI.

### Livrables

1. **Web Worker planning** — `buildSchedule()` et Coach Engine exécutés hors thread React.
   Seuil de sécurité : jusqu'à 300 tâches sans drop de frame.

2. **Dirty flags Coach** — `is_dirty: boolean` en SQLite sur le nœud Coach.
   Les 26 règles ne tournent que si l'utilisateur ouvre l'écran Coach.

3. **RRULE.js** — intégration `rrule` (RFC 5545) dans `ScheduleTask`.
   Remplace les tags `['recurring', 'every:7']` par une chaîne normalisée :
   `"FREQ=DAILY;BYHOUR=8;BYMINUTE=15"`.

4. **Schéma V4** — `ScheduleTaskV4` avec champ `rrule: string | null`.
   Migration automatique depuis V3 (rrule = null par défaut).

### Critères de sortie

- [ ] `buildSchedule(300 tasks)` < 8ms mesuré dans le Worker
- [ ] Coach ne calcule pas au démarrage (dirty flag = false)
- [ ] RRULE génère les occurrences correctement (tests unitaires : DAILY, WEEKLY, BYDAY)
- [ ] `npx tsc --noEmit` → 0 erreurs

---

## J2 — Dimension Temporelle

**Durée estimée :** 4 semaines
**Dépend de :** J1 terminé
**Priorité système :** 3 (critique selon CLAUDE.md)

### Objectif

Implémenter le cœur de l'équation AWAN :
`T_éveil (112h) = T_production + T_friction + T_slack`

### Livrables

1. **TimeCategory exploitée** — le champ `timeCategory` de `ScheduleTaskV3` alimente
   les compteurs hebdomadaires. Chaque tâche planifiée contribue à son bucket.

2. **Store hebdomadaire** — `useWeeklyTimeStore` calcule :
   - `T_production` (heures) — tâches `production`
   - `T_friction` (heures) — tâches `friction`
   - `T_slack` (heures) — tâches `slack`
   - `T_somatique` (heures) — sport + prières + sommeil
   - `C_et` (%) — tâches planifiées vs tâches complétées

3. **Écran Bilan Hebdomadaire** — vue dédiée affichant :
   - Répartition en anneau (donut chart) des 4 catégories
   - Évolution sur 4 semaines glissantes
   - Alerte si `T_friction > 15h` (rouge) ou `C_et < 70%` (orange)

4. **EventBus** — `week.summarized` émis chaque dimanche soir ou sur demande.

### Critères de sortie

- [ ] Bilan hebdomadaire affiché avec données réelles (non mockées)
- [ ] Alerte T_friction visible dans le Coach si seuil dépassé
- [ ] C_et calculé et affiché pour la semaine courante
- [ ] Données persistées en SQLite, non recalculées à chaque render

---

## J3 — Planning complet

**Durée estimée :** 5 semaines
**Dépend de :** J2 terminé

### Objectif

La timeline unifiée affiche TOUS les événements de la vie de l'utilisateur
sur un seul axe chronologique. Les notifications headless fonctionnent sans WebView.

### Livrables

1. **Timeline unifiée** — fusion dans la vue chronologique de :
   - Tâches planifiées (`DaySchedule.slots`) — **absentes actuellement**
   - Séances sport
   - Repas / nutrition
   - Prières (Islam) avec horaires calculés
   - Eau / hydratation
   - Événements libres

2. **Blocs sanctuarisés** — Sport, Prières, Deep Work marqués `locked: true`.
   Le scheduler ne peut pas les déplacer. Couleur distincte dans la timeline.

3. **Notifications headless** — via `expo-task-manager` :
   - Action "Fait" depuis la notification → écriture SQLite sans ouvrir l'UI
   - Action "Reporter +15min" → recalcul scheduler, mise à jour alarme suivante
   - Cycle complet < 5ms CPU (pas de réveil React)

4. **Geste swipe-to-validate** — glisser une tâche vers la droite = complétion.
   Swipe gauche = reporter. Haptic feedback natif.

5. **Réactions croisées** — `planning.optimized` → `Coach.run('sport', date)` si séance ce jour.

### Critères de sortie

- [ ] Timeline affiche tâches + repas + prières + sport en même vue
- [ ] Notification "Fait" écrit en SQLite sans ouvrir l'app (testé en arrière-plan)
- [ ] Blocs sanctuarisés non déplaçables par le scheduler
- [ ] `planning.optimized` déclenche le Coach (log observable)

---

## J4 — Coach systémique

**Durée estimée :** 5 semaines
**Dépend de :** J2 + J3 terminés
**Priorité système :** 4

### Objectif

Le Coach cesse d'être un agrégateur de métriques isolées.
Il diagnostique le **système entier** (charge allostatique, dérive axiologique).

### Livrables

1. **Règles cross-domaines** — nouvelles règles JSON Coach avec `"source"` DOI/PMC :
   - `T_friction > 15h` ET `C_et < 70%` → alerte charge allostatique
   - Déficit sommeil > 6h sur 7 jours ET performance sport -15% → alerte surcharge
   - Adhérence nutrition < 62% ET T_slack < 10h → alerte dérive système
   - Prières manquées > 2/semaine → signal dérive axiologique

2. **Diagnostic synthétique** — l'écran Coach affiche en tête :
   > "Cette semaine : 4h T_friction évitables, -15% perf musculaire,
   > adhérence nutrition 62%, dette sommeil 6h.
   > Cause : charge allostatique. Proposition : deload + déléguer [X]."

3. **Intégration VHN** (dépend J6) — si VHN calculée disponible :
   alerte automatique quand coût tâche < VHN → proposition délégation.

### Critères de sortie

- [ ] Au moins 5 règles cross-domaines avec source DOI vérifiable
- [ ] Diagnostic synthétique affiché en tête de l'écran Coach
- [ ] Tests : chaque règle couvre trigger=true ET trigger=false
- [ ] `npx tsc --noEmit` → 0 erreurs

---

## J5 — Sommeil profond

**Durée estimée :** 2 semaines
**Dépend de :** J0 terminé (indépendant de J2-J4)
**Priorité système :** 5

### Objectif

Passer du score grossier (durée seule) à la qualité glymphatique réelle.

### Livrables

1. **Schéma étendu** — `SleepEntryV2` ajoute :
   - `latencyMin: number` — minutes pour s'endormir
   - `wakeCount: number` — réveils nocturnes
   - `depthScore: number` (0–10) — profondeur auto-estimée
   - `recoveryScore: number` — calculé (formule documentée DOI)

2. **Corrélation J+1** — le Coach compare `recoveryScore` la nuit N
   à la performance cognitive et physique du lendemain (force séance, C_et journée).

3. **UI saisie** — formulaire de saisie du sommeil étendu (remplace le champ durée seul).

### Critères de sortie

- [ ] Migration V1→V2 sans perte de données
- [ ] Score de récupération affiché dans le résumé journalier
- [ ] Corrélation sommeil/performance visible dans l'écran Analyse

---

## J6 — Économétrique

**Durée estimée :** 3 semaines
**Dépend de :** J2 terminé
**Priorité système :** 6

### Objectif

Chaque heure a un prix. Ignorer ce prix est la plus grande source de friction.

### Livrables

1. **VHN (Valeur Horaire Nette)** = `revenus_nets_mensuel / T_production_réelle_mensuel`
   Saisie manuelle du revenu mensuel net. T_production vient du store J2.

2. **Runway financier** — `épargne_liquide / dépenses_mensuelles` = X mois d'autonomie.

3. **Calculateur de délégation** — pour chaque tâche `friction` dans le planning :
   - Champ `delegationCostPerHour: number` (optionnel)
   - Si `VHN > delegationCostPerHour` → badge "À déléguer" automatique dans la timeline

4. **Tableau de bord Économétrique** — écran dédié : VHN, runway, liste tâches à déléguer.

### Critères de sortie

- [ ] VHN calculée et affichée depuis données réelles
- [ ] Badge "À déléguer" visible sur les tâches éligibles dans la timeline
- [ ] Zéro donnée financière quitte l'appareil (audit local-only vérifié)

---

## J7 — Cognitive

**Durée estimée :** 3 semaines
**Dépend de :** J3 terminé
**Priorité système :** 7

### Objectif

Le Deep Work est le multiplicateur de tout le reste. Le protéger est non-négociable.

### Livrables

1. **Blocs Deep Work** — type de tâche `production:deep_work` dans le planning.
   `locked: true` par défaut. Durée minimale configurable (ex: 90 min).
   Le scheduler refuse tout placement de friction dans ces créneaux.

2. **T_production réel vs nominal** — comparaison hebdomadaire :
   - Nominal : heures Deep Work planifiées
   - Réel : heures Deep Work complétées (statut `Completed`)
   - Ratio affiché dans le bilan hebdomadaire (J2)

3. **N-Back** (optionnel, feature flag) — mini-jeu de mémoire de travail intégré.
   Score stocké localement, corrélé à la performance de la journée.

### Critères de sortie

- [ ] Blocs Deep Work inviolables par le scheduler
- [ ] Ratio T_production réel/nominal affiché dans le bilan hebdomadaire
- [ ] N-Back désactivé par défaut, activable dans les paramètres

---

## J8 — Conative + Anthropométrie visuelle

**Durée estimée :** 4 semaines
**Dépend de :** J2 terminé
**Priorité système :** 8 + backlog v5

### Objectif

Mesurer l'écart entre vouloir et faire. Ajouter le suivi visuel corporel.

### Livrables

**Conative :**
1. `C_et` par domaine (sport, nutrition, planning) — pas seulement global
2. Latence à l'effort : temps moyen entre création d'une tâche et début d'exécution
3. Remplacement du journal humeur 1–5 par un questionnaire rapide (3 items) mesurant
   la fatigue décisionnelle (ego depletion)

**Anthropométrie visuelle :**
1. Capture photo face/profil/dos via `expo-camera`
2. Stockage local chiffré (jamais transmis)
3. Timeline visuelle comparative (avant/après par période)
4. Aucune IA, aucun upload — affichage local uniquement

### Critères de sortie

- [ ] C_et par domaine visible dans le Coach
- [ ] Photos capturées et affichées en timeline locale
- [ ] Zéro photo quitte l'appareil (audit réseau vérifié)

---

## J9 — Core natif (conditionnel)

**Durée estimée :** 3-4 mois
**Déclencheur :** profiler mesure un goulot réel après J0-J8

### Condition de déclenchement

Ce jalon ne s'ouvre **que si** l'une de ces conditions est observée en production :
- `buildSchedule()` dépasse régulièrement 16ms (drop de frame à 60 Hz)
- Écriture SQLite dépasse régulièrement 5ms
- Le Coach Engine dépasse 100ms de calcul

### Stratégie d'extraction

Extraction progressive module par module. L'UI React Native n'est pas touchée.

```
Phase 1 : Scheduler → Rust (.so via JNI)        4 semaines
Phase 2 : Coach Engine → Rust                   4 semaines
Phase 3 : RRULE Interval Tree → Rust            3 semaines
Phase 4 : Notification handler → Rust headless  3 semaines
```

### Architecture finale (si J9 déclenché)

```
React Native Shell (Fabric + Reanimated 120 Hz)
        │ JSI synchrone < 1μs
        ▼
Rust Core (.so)
  ├── Scheduler (Interval Tree)
  ├── Coach Engine (26+ règles)
  ├── RRULE parser (RFC 5545)
  └── Notification handler headless
        │
        ▼
expo-sqlite WAL (< 0.5ms)
```

---

## Tableau de bord des jalons

| Jalon | Durée | Dimension AWAN | État actuel | Déclencheur |
|---|---|---|---|---|
| J0 | 3 sem | Fondation | Capacitor WebView | Immédiat |
| J1 | 2 sem | Architecture | Calculs sync, pas de WAL | Après J0 |
| J2 | 4 sem | Temporelle | ❌ Non implémentée | Après J1 |
| J3 | 5 sem | Planning | ⚠️ Scheduler sans UI | Après J2 |
| J4 | 5 sem | Coach systémique | ⚠️ 0 règle cross-domaine | Après J2+J3 |
| J5 | 2 sem | Sommeil profond | ⚠️ Score grossier | Après J0 |
| J6 | 3 sem | Économétrique | ❌ Non implémentée | Après J2 |
| J7 | 3 sem | Cognitive | ❌ Non implémentée | Après J3 |
| J8 | 4 sem | Conative + Photos | ❌/⚠️ Embryonnaire | Après J2 |
| J9 | 3-4 mois | Core natif | N/A | Si profiler l'exige |

**Durée totale J0→J8 : ~31 semaines**
**J9 : conditionnel, non planifié**

---

## Règles de gouvernance du plan

1. **Aucun jalon n'ouvre avant que le précédent soit vert** (critères de sortie cochés).
2. **Aucune dette technique** — pas d'implémentation partielle mergée.
3. **Tests obligatoires** pour toute règle Coach et tout nouveau service.
4. **Zéro valeur inline** dans le code (variables CSS et constantes SP uniquement).
5. **Aucun commit sans demande explicite** de l'utilisateur.
6. **APK uniquement sur validation explicite** — jamais automatique.

---

*Plan généré le 2026-06-04 — base commit `c311efc`, branch `main`.*
*Architecture cible : Expo SDK 52 + React Native bare + expo-sqlite JSI.*
