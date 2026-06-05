# AWAN — Impact des Jalons sur les Widgets d'Analyse
**Document de référence — 2026-06-04**

---

## Cartographie actuelle : 5 domaines, 15 onglets

```
AnalyseScreen
├── TEMPS
│   ├── BudgetTab        — T_production / T_friction / T_slack / C_et
│   └── TempsTab         — Répartition chronologique (jour/semaine/mois/an)
├── CORPS
│   ├── ReadinessTab     — BPM + sommeil + humeur → badge OPTIMAL/VIGILANCE/REPOS
│   ├── RecoveryTab      — ACWR + courbe 28j + prévision deload
│   ├── PerformanceTab   — 1RM top 5 + tonnage + répartition Push/Pull/Legs/Core
│   ├── MuscuTab         — Tonnage journalier + séries
│   ├── BiometrieTab     — Poids + mensurations (évolution)
│   └── OrthometryTab    — Symétrie bilatérale + plis cutanés (3 formules)
├── ÉNERGIE
│   ├── NutritionTab     — Kcal/P/C/F du jour + moyenne + histogramme 30j
│   ├── FluxDensiteTab   — Barres empilées P/C/F + TDEE + phase surplus/déficit
│   ├── SynoptiqueTab    — Tonnage + macros double axe + courbe rendement
│   └── MetaboliqueTab   — Anabolisme/catabolisme + balance cumulée
├── ÂME
│   └── IslamTab         — Score fard 30j + adhérence + streak + Coran 8 semaines
└── SYSTÈME
    ├── ActivityTab      — Camembert 24h (sport + sommeil + libre)
    ├── CorrelationTab   — Corrélation sport × poids 30j
    └── ScanTab          — Évolution BF% (3 formules, 30/90/365j)
```

---

## J0 — Migration Capacitor → Expo

**Onglets impactés : tous les 15**
**Changement visible utilisateur : aucun**
**Changement technique : couche de données**

### Ce qui change en interne

`@capacitor/sqlite` est remplacé par `expo-sqlite` v14 (JSI natif).
L'API `getStorage()` conserve son interface — les onglets ne touchent pas directement SQLite.

```
Avant : Capacitor → WebView → Bridge JSON → SQLite
Après : JSI direct → SQLite (< 1ms vs ~5ms)
```

Chaque onglet qui appelle un service (`MealService.getByDate()`, `SleepService.getAll()`…)
bénéficie automatiquement de la réduction de latence.

### Risque de régression

Toutes les clés de stockage (`nutrition.meal`, `sport.session`, `sleep.entry`, etc.)
doivent être migrées à l'identique. Le critère de sortie J0 impose de vérifier
les 15 onglets avant de considérer la migration terminée.

---

## J1 — Architecture réactive (Workers + Dirty Flags + RRULE)

**Onglets directement impactés :**
- `BudgetTab` — calculs T_* déplacés dans un Worker
- `RecoveryTab` — `computeACWR()` déplacé dans un Worker
- `PerformanceTab` — `oneRmTrendPerExercise()` + tonnage dans un Worker

### BudgetTab

Aujourd'hui : `buildWeekTimeFrame()` tourne de manière synchrone dans le cycle React.
Après J1 : appel au Worker, résultat reçu en async, UI affiche un skeleton pendant < 50ms.

```typescript
// Après J1 — appel non bloquant
const frame = await planningWorker.buildWeekTimeFrame(weekStart);
```

### RecoveryTab

`computeACWR()` sur 28 jours de sessions est le calcul le plus lourd de l'écran Analyse.
Après J1 : isolé dans le Worker. `ACWRGauge` et `ACWRCurve` reçoivent le résultat sans
jamais bloquer le scroll.

### PerformanceTab

`oneRmTrendPerExercise()` sur 90 jours + `computeWeeklyTonnage()` sur 8 semaines.
Après J1 : même traitement Worker. Les 5 sparklines 1RM s'animent de manière fluide
à 120 Hz même avec 300 séances en base.

### Dirty Flags — ReadinessTab / RecoveryTab

Le Coach est marqué `is_dirty = false` au démarrage.
`ReadinessTab` et `RecoveryTab` affichent les données métriques directement.
Le badge OPTIMAL/VIGILANCE/REPOS et le score ACWR sont calculés uniquement
quand l'utilisateur ouvre l'onglet concerné, pas en arrière-plan.

---

## J2 — Dimension Temporelle

**Onglets directement impactés :**
- `BudgetTab` — transformation majeure (données réelles vs estimées)
- `TempsTab` — couche "Travail" alimentée par données réelles

### BudgetTab — avant J2

```
T_somatique  : calculé depuis workouts + prières + sommeil  ✅
T_production : estimé (tâches Planning, timeCategory non exploitée)  ⚠️
T_friction   : absent  ❌
T_slack      : déduit par soustraction (non fiable)  ❌
C_et         : ratio partiel (sport + prières uniquement)  ⚠️
```

### BudgetTab — après J2

```
T_somatique  : inchangé  ✅
T_production : toutes tâches DaySchedule avec timeCategory='production'  ✅
T_friction   : toutes tâches DaySchedule avec timeCategory='friction'  ✅
T_slack      : toutes tâches DaySchedule avec timeCategory='slack'  ✅
C_et         : (tâches Completed / tâches Pending) sur 7 jours glissants  ✅
```

Le store `useWeeklyTimeStore` (nouveau en J2) alimente le composant `BudgetTab`.
Il persiste les totaux hebdomadaires en SQLite — recalcul uniquement si dirty.

**Alertes nouvelles dans BudgetTab :**
- Badge rouge si `T_friction > 15h/semaine`
- Badge orange si `C_et < 70%`
- Indicateur vert si `T_slack` dans la fourchette 20–30h

### TempsTab — couche "Travail"

La couche "Travail" dans le `ClockPie` (camembert 24h) et les `StackedBars`
repose actuellement sur des données partielles du Planner.
Après J2 : alimentée par `DaySchedule.slots` avec `timeCategory` → la répartition
est exacte à la minute.

```
Avant : couche Travail = estimation depuis tâches templates
Après : couche Travail = heures réelles complétées + heures planifiées non complétées (grisées)
```

---

## J3 — Planning complet (Timeline unifiée + Notifications headless)

**Onglets directement impactés :**
- `TempsTab` — fusion complète de toutes les sources
- `BudgetTab` — C_et enrichi par le statut des tâches headless
- `ActivityTab` — couche "active" remplacée par données réelles

### TempsTab — fusion complète

Avant J3, la vue "Jour" du `ClockPie` manque :
- Les repas (slots nutritionnels)
- Les tâches du scheduler (`DaySchedule.slots`)

Après J3 :

```
ClockPie 24h (vue Jour) =
  Sommeil (SleepService)        ✅ déjà présent
  Islam — 5 prières (15min)     ✅ déjà présent
  Nutrition — repas (30min)     ✅ ajouté J3
  Tâches production             ✅ ajouté J3
  Tâches friction               ✅ ajouté J3
  Tâches slack                  ✅ ajouté J3
  Sport (WorkoutService)        ✅ déjà présent
  Libre (reste de la journée)   ✅ calculé par déduction
```

Les `StackedBars` (vue Semaine) et `StackedArea` (vue Année) héritent
automatiquement de cette richesse de données.

### ActivityTab

Aujourd'hui : données d'activité partielles (sport + sommeil uniquement).
Après J3 : le camembert intègre sport + sommeil + tâches planifiées + libre réel.
Le "Système veille" (heures libres) est calculé avec précision.

### BudgetTab — C_et enrichi

Les actions headless ("Fait" depuis la notification) écrivent directement le statut
`Completed` en SQLite. `C_et` reflète donc les completions sans que l'utilisateur
ait ouvert l'app. Le ratio est plus fidèle à la réalité.

---

## J4 — Coach systémique (règles cross-domaines)

**Onglets directement impactés :**
- `ReadinessTab` — diagnostic synthétique cross-domaine en tête
- `RecoveryTab` — alerte charge allostatique intégrée
- `BudgetTab` — alerte Coach déclenchée si T_friction > 15h ou C_et < 70%

### ReadinessTab — transformation majeure

Avant J4 : badge OPTIMAL/VIGILANCE/REPOS basé sur BPM + sommeil + humeur (3 signaux).

Après J4 : le diagnostic Coach cross-domaine s'affiche au-dessus du badge :

```
┌─────────────────────────────────────────────────────────┐
│ DIAGNOSTIC SYSTÈME                                       │
│ T_friction 4h évitables · Perf sport -15% · Nutrition   │
│ 62% · Dette sommeil 6h → Charge allostatique élevée     │
│ Proposition : deload cette semaine + déléguer [tâche X] │
└─────────────────────────────────────────────────────────┘
[badge VIGILANCE]
BPM 62  Sommeil 6h  Humeur 3/5
```

Le `InstrumentCard` badge existant est conservé. Le bloc diagnostic
est un nouveau composant `CoachDiagnosticCard` au-dessus.

### RecoveryTab

Nouvelle règle Coach affichée dans un `GuardCard` converti en `CoachAlertCard` :
- Si ACWR > 1.3 ET T_friction > 15h → "Surcharge combinée — prioriser la récupération active"
- Si ACWR < 0.8 ET dette sommeil > 6h → "Sous-stimulus ET récupération insuffisante"

### BudgetTab

Le bloc alertes T_friction/C_et (J2) est maintenant couplé aux règles Coach J4.
Quand une alerte se déclenche dans BudgetTab, le lien "Voir le diagnostic complet"
ouvre directement `ReadinessTab` avec le diagnostic Coach développé.

---

## J5 — Sommeil profond

**Onglets directement impactés :**
- `ReadinessTab` — enrichissement des métriques sommeil
- `RecoveryTab` — score de récupération affiné
- `CorrelationTab` — nouvelle corrélation sommeil × performance

### ReadinessTab — métriques sommeil étendues

Avant J5 :
```
Sommeil : 7h30  ← durée seule
```

Après J5 :
```
Sommeil : 7h30  Latence : 18min  Réveils : 1  Profondeur : 7/10
Score récupération : 82/100
```

Le composant `InstrumentCard` existant est enrichi de 3 sous-métriques.
Schéma `SleepEntryV2` avec migration automatique depuis V1.

### RecoveryTab

Le score de récupération affiché dans la courbe 7 jours est recalculé
avec la formule étendue (durée + latence + réveils + profondeur).
La prévision deload du Coach intègre ce score dans son algorithme.

### CorrelationTab — nouvelle corrélation

Troisième corrélation ajoutée aux deux existantes (sport × poids) :
- **Récupération sommeil × performance séance du lendemain**
  - Axe X : `recoveryScore` nuit N
  - Axe Y : tonnage séance jour N+1 (% par rapport à la moyenne 30j)
  - Période : 30 jours glissants

---

## J6 — Économétrique

**Onglets impactés : création d'un nouveau domaine**

### Nouveau domaine "VALEUR" dans AnalyseScreen

Un 6e domaine s'ajoute à la navigation principale, avec 2 onglets :

**Onglet VHN (Valeur Horaire Nette)**

```
VHN = revenu_net_mensuel / T_production_réelle_mensuelle

┌──────────────────────────────────────────────────────┐
│ VHN actuelle : 87 €/h                                │
│ T_production ce mois : 34h (sur 47h planifiées)      │
│ Runway : 8.2 mois                                    │
└──────────────────────────────────────────────────────┘

[BarChart] VHN mensuelle — 6 mois glissants
```

**Onglet Délégation**

```
Tâches friction éligibles à la délégation :
┌────────────────────────────────┬──────┬───────────┐
│ Tâche                          │ h/mois│ Décision  │
├────────────────────────────────┼──────┼───────────┤
│ Courses alimentaires           │ 4h   │ 🔴 Déléguer│
│ Ménage hebdomadaire            │ 6h   │ 🔴 Déléguer│
│ Comptabilité mensuelle         │ 2h   │ 🟡 Borderline│
└────────────────────────────────┴──────┴───────────┘
```

Le badge "À déléguer" (rouge) apparaît si `VHN > coût_délégation_horaire`.

### Impact sur BudgetTab

La VHN calculée en J6 s'affiche comme métrique complémentaire dans `BudgetTab` :
- "Coût réel de ta friction cette semaine : X €" (T_friction × VHN)
- Ce chiffre rend le coût de la friction concret et non abstrait.

---

## J7 — Cognitive (Deep Work sanctuarisé)

**Onglets directement impactés :**
- `BudgetTab` — distinction T_production_deep vs T_production_shallow
- `TempsTab` — couche "Deep Work" distincte dans le ClockPie

### BudgetTab — granularité T_production

Avant J7 :
```
T_production : 22h cette semaine
```

Après J7 :
```
T_production : 22h
  └── Deep Work : 14h  (blocs ≥ 90min, inviolables)
  └── Shallow Work : 8h (réunions, admin légère, etc.)
```

Les blocs Deep Work (`locked: true, type: 'production:deep_work'`) sont
affichés en couleur distincte dans tous les graphiques temporels.

### TempsTab

Le `ClockPie` et les `StackedBars` distinguent désormais :
- Deep Work (violet, blocs sanctuarisés)
- Shallow Work (bleu clair)

La vue annuelle `StackedArea` montre l'évolution du ratio Deep/Shallow sur 52 semaines.

### Nouveau KPI dans BudgetTab

```
T_production réel / T_production nominal = 63%
(14h réalisées sur 22h planifiées en Deep Work)
```

Ce ratio est le signal de l'ego depletion et des interruptions non planifiées.

---

## J8 — Conative + Anthropométrie visuelle

**Onglets directement impactés :**
- `ReadinessTab` — C_et par domaine + ego depletion
- `BiometrieTab` — timeline photos corporelles

### ReadinessTab — C_et par domaine

Avant J8 : C_et global (une seule valeur).

Après J8 :
```
Complétude des intentions
  Sport      : 91%  ✅
  Nutrition  : 74%  ⚠️
  Planning   : 58%  🔴
  Prières    : 100% ✅
```

Le composant `InstrumentCard` avec status indicator est répété 4 fois.
La corrélation entre le C_et Planning faible et la charge allostatique
est intégrée dans la règle Coach J4 (signal d'ego depletion).

### ReadinessTab — Ego depletion

Le journal humeur 1–5 est remplacé par un questionnaire rapide 3 items :
1. "Capacité à démarrer une tâche difficile" (1–5)
2. "Qualité des décisions prises hier" (1–5)
3. "Résistance aux distractions" (1–5)

Score moyen → indicateur Ego Depletion dans `ReadinessTab`.
Corrélé par le Coach avec `T_production réel / nominal` (J7).

### BiometrieTab — Timeline photos

Nouvel onglet "PHOTOS" dans le domaine CORPS (4 photos : face, profil G/D, dos) :

```
┌─────────────────────────────────────────────────┐
│ COMPARAISON VISUELLE                            │
│ [← Jan 2026]  [Mar 2026]  [Juin 2026 →]        │
│                                                  │
│  [Photo]  vs  [Photo]  vs  [Photo]              │
│  Face          Profil       Dos                 │
│                                                  │
│ Poids : 84.2kg → 81.4kg → 79.1kg               │
│ Tour taille : 92cm → 88cm → 85cm               │
└─────────────────────────────────────────────────┘
```

Stockage : `expo-file-system` chiffré, jamais transmis.
Zéro IA, zéro cloud, zéro analyse automatique — affichage local uniquement.

---

## J9 — Core natif (conditionnel)

**Onglets impactés : tous — de manière transparente**

Si déclenché, les calculs les plus lourds migrent vers Rust :
- `computeACWR()` → temps de calcul divisé par ~10
- `oneRmTrendPerExercise()` → instantané même sur 5 ans de données
- `buildWeekTimeFrame()` → < 0.1ms

Aucun onglet ne change visuellement. L'utilisateur perçoit uniquement
la disparition des skeletons de chargement.

---

## Récapitulatif par onglet

| Onglet | J0 | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 |
|---|---|---|---|---|---|---|---|---|---|
| BudgetTab | Perf | Worker | ★ Refonte | C_et enrichi | Alertes Coach | — | VHN coût friction | Deep Work | C_et par domaine |
| TempsTab | Perf | — | Travail réel | ★ Fusion complète | — | — | — | Deep/Shallow | — |
| ReadinessTab | Perf | Dirty flag | — | — | ★ Diagnostic synthétique | Sommeil étendu | — | — | ★ C_et + Ego depletion |
| RecoveryTab | Perf | Worker | — | — | Alerte allostatique | Score affiné | — | — | — |
| PerformanceTab | Perf | Worker | — | — | — | — | — | — | — |
| MuscuTab | Perf | — | — | — | — | — | — | — | — |
| BiometrieTab | Perf | — | — | — | — | — | — | — | ★ Timeline photos |
| OrthometryTab | Perf | — | — | — | — | — | — | — | — |
| NutritionTab | Perf | — | — | — | — | — | — | — | — |
| FluxDensiteTab | Perf | — | — | — | — | — | — | — | — |
| SynoptiqueTab | Perf | — | — | — | — | — | — | — | — |
| MetaboliqueTab | Perf | — | — | — | — | — | — | — | — |
| IslamTab | Perf | — | — | — | Alerte dérive axiologique | — | — | — | — |
| ActivityTab | Perf | — | — | ★ Sources complètes | — | — | — | — | — |
| CorrelationTab | Perf | — | — | — | — | ★ +corrélation sommeil | — | — | — |
| ScanTab | Perf | — | — | — | — | — | — | — | — |
| **Nouveau : VHN** | — | — | — | — | — | — | ★ Création | — | — |
| **Nouveau : Délégation** | — | — | — | — | — | — | ★ Création | — | — |

**Légende : ★ = transformation majeure · Perf = gain performance transparent · — = non impacté**

---

## Nouveaux composants UI à créer

| Composant | Jalon | Usage |
|---|---|---|
| `CoachDiagnosticCard` | J4 | Diagnostic cross-domaine en tête de ReadinessTab |
| `CoachAlertCard` | J4 | Alertes contextuelles dans RecoveryTab, BudgetTab |
| `WeeklyTimeStore` | J2 | Store T_friction/T_production/T_slack/C_et |
| `SleepQualityBar` | J5 | Latence + réveils + profondeur dans ReadinessTab |
| `DomainCetGrid` | J8 | Grille C_et × 4 domaines |
| `EgoDepletionScore` | J8 | Score 3 items dans ReadinessTab |
| `PhotoTimeline` | J8 | Comparatif visuel face/profil/dos dans BiometrieTab |
| `VHNDashboard` | J6 | Nouveau domaine VALEUR — VHN + runway |
| `DelegationList` | J6 | Liste tâches à déléguer avec badge coût |

Tous ces composants DOIVENT étendre les primitives existantes (`InstrumentCard`,
`Card`, `BarChart`, `StaggerList/StaggerItem`) — aucune primitive inventée.

---

*Document généré le 2026-06-04 — base commit `c311efc`.*
*Basé sur inspection directe de : AnalyseScreen.tsx + 15 onglets + shared.tsx + 14 services.*
