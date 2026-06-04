# Questionnaire de Cadrage Fonctionnel et Technique — AWAN v5.0
**Réponses basées sur audit codebase — commit `ca2652c` (main, 2026-06-04)**

---

## 1. Introduction

Ce document constitue la réponse officielle au questionnaire de cadrage. Chaque réponse est vérifiable directement dans le code source ; les chemins de fichiers sont fournis comme références.

---

## 2. Pilier 1 : Module Nutrition & Base d'Aliments

### Q1.1 — Comment l'utilisateur renseigne-t-il ses repas ?

- [x] **Sélection dans une base de données d'aliments pré-existante** — base embarquée de **578 aliments** (`public/data/foods.json`). Chaque aliment contient : `id`, `n` (nom), `kcal`, `p` (protéines), `c` (glucides), `f` (lipides), flag `halal`. L'utilisateur recherche par nom, sélectionne l'aliment, entre le grammage → les macros sont calculées automatiquement.
- [ ] Saisie textuelle libre + calories estimées
- [ ] Création de recettes personnalisées réutilisables

> **Fonctionnalité absente :** Les recettes personnalisées ne sont pas implémentées (aucun schéma `Recipe` dans `src/data/schemas/`). Cette fonctionnalité est à planifier.

### Q1.2 — Où est stockée la base d'aliments ?

- [x] **Fichier JSON statique embarqué localement dans l'APK**
  - Fichier : `public/data/foods.json`
  - **Poids actuel : 75 171 octets (~73 Ko)**
  - 578 aliments, dont un flag `halal` sur chaque entrée
  - Chargé en mémoire au premier accès via `getFoods()` (`src/utils/nutritionData.ts`)

> **Absence notable :** Aucun des 578 aliments ne possède de code-barres renseigné dans la base actuelle (champ `barcode` présent dans le schéma Zod et dans `getFoodByBarcode()`, mais 0 valeurs peuplées).

### Q1.3 — Scanner de code-barres prévu ?

**Infrastructure partiellement présente, fonctionnalité non active :**
- Le schéma `FoodItem` possède le champ `barcode?: string` (`src/data/schemas/nutrition/foodItem.ts`, ligne 17)
- La fonction `getFoodByBarcode(barcode)` existe (`src/utils/nutritionData.ts`, lignes 41–42)
- **Aucun plugin Capacitor caméra/barcode** n'est installé (`package.json` vérifié — ni `@capacitor/camera`, ni `@capacitor-community/barcode-scanner`)
- **Conclusion : le scanner n'est pas opérationnel.** L'interface utilisateur ne propose pas de bouton scan. L'infrastructure est prête pour une activation future si la base est enrichie de codes-barres.

### Q1.4 — Granularité de l'historique nutrition

**Stockage granulaire par aliment — aucune agrégation quotidienne.**

Chaque entrée `MealEntryLatest` (`src/data/schemas/nutrition/mealEntry.ts`) conserve :
- `id` unique (UUID)
- `date` (YYYY-MM-DD)
- `mealSlot` (1–5, librement nommés par l'utilisateur)
- `name`, `grams` (quantité pesée au gramme près)
- `kcal`, `p`, `c`, `f`, `fiberG` (macros calculés)
- `timeHHMM` (heure de consommation optionnelle)
- Score nutritionnel (`nutritionScore`)

Les totaux journaliers (`totals.kcal`, `totals.p`, etc.) sont **recalculés à la volée** à chaque affichage. Il n'y a pas de fusion/agrégation automatique — l'historique détaillé est conservé indéfiniment.

---

## 3. Pilier 2 : Module Sport & Entraînements

### Q2.1 — Profondeur de la donnée par séance

Toutes les cases ci-dessous s'appliquent :

- [x] **Nom de la séance / Date / Durée** (`durationMin`, `date`, nom de la routine)
- [x] **Liste des exercices effectués** (avec `exerciseId`, `name`, groupes musculaires)
- [x] **Détail complet de chaque série** — schéma `ExerciseSetV2` (`src/data/schemas/sport/exerciseSet.ts`) :
  - `kind` : `warmup | working | drop | failure`
  - `reps`, `weightKg` (valeurs réelles)
  - `plannedWeightKg`, `plannedReps` (valeurs planifiées pour suivi d'adhérence)
  - `rir` (Reps In Reserve, 0–5)
  - `rpe` (Rate of Perceived Exertion, 1–10)
  - `restActualSec` (repos réel mesuré)
  - `durationSec`, `distanceM` (pour exercices cardio/duration)
  - `note`, `completedAt` (timestamp Unix)
  - `substitutedFrom` (exercice remplacé)
- [x] **Chronomètre actif intégré** — timer de session + countdown de repos implémentés dans `SportScreen.tsx` avec le composant `ChronoOverlay` (voir Q2.3)

Métriques calculées et stockées au niveau session : `tonnage` total (kg), `sessionRPE`, `recoveryScore` (1–10).

### Q2.2 — Bibliothèque d'exercices par défaut

**Oui — 873 exercices embarqués dans l'APK.**

- Fichier : `public/data/exercises.json`
- **Poids : 343 493 octets (~335 Ko)**
- Champs par exercice : `id`, `n` (nom), `pm` (muscles primaires), `sm` (muscles secondaires), `eq` (équipement), `cat` (catégorie), `lvl` (niveau), `force` (type de force), `images` (chemins CDN)
- Les images d'exercices sont mises en cache localement via `mediaCacheService.ts` (stratégie LRU éviction)
- Pas de tutoriels vidéo ni de GIFs animés embarqués — images statiques uniquement

### Q2.3 — Mode d'exécution : pendant ou après la séance ?

**Les deux modes sont supportés, avec priorité sur la saisie en temps réel :**

- **Mode live (principal)** : l'écran reste allumé pendant la séance. `SportScreen.tsx` gère un `setInterval` à 1 000 ms pour le chronomètre de session. Un countdown de récupération (`restActualSec`) est déclenché après chaque série. Saisie série par série avec préchargement des valeurs planifiées.
- **Mode post-séance (secondaire)** : l'utilisateur peut ouvrir une séance passée et compléter/corriger les données via le journal Sport.

---

## 4. Pilier 3 : Module Évolution Physique & Photos

### Q3.1 — Catégorisation des visuels

**Ce module n'existe pas dans la version actuelle (v5.0).**

Il n'y a ni écran dédié, ni composant, ni schéma de données pour les photos de suivi physique. Les seules photos présentes dans l'application sont les **illustrations d'exercices** (873 images CDN mises en cache par `mediaCacheService.ts`), non les photos corporelles de l'utilisateur.

### Q3.2 — Expérience de comparaison

**Non implémentée.** Aucune des trois options (curseur Avant/Après, grille, mode fantôme) n'existe.

### Q3.3 — Lien photo ↔ mesure corporelle

**Non applicable dans l'état actuel.** Le schéma `MeasurementLatest` (`src/data/schemas/anthropo/measurement.ts`) ne contient pas de champ photo. Les mesures corporelles (poids, tour de taille, hanches, etc.) existent et sont gérées dans `MensurationScreen`, mais sans aucune pièce jointe visuelle.

> **Planification requise.** L'estimation de 78–156 Mo/an mentionnée dans le questionnaire impose de définir avant développement :
> - La stratégie de compression (JPEG quality, résolution cible)
> - Le stockage binaire (Capacitor Filesystem vs BLOB SQLite vs stockage cloud)
> - Les limites de la base locale (quota actuel : 10 Mo pour les données ; les photos nécessiteront un compartiment séparé)

---

## 5. Pilier 4 : Le Coach Engine & Les Algorithmes

### Q4.1 — Nature du Coach

**Moteur de règles logiques et mathématiques — pas d'IA générative.**

Le Coach engine (`src/modules/coach/engine/`) est un système d'évaluation basé sur **26 règles JSON** (`src/modules/coach/rules/*.json`) réparties par domaine :

| Domaine | Nb règles | Exemples |
|---|---|---|
| Sport | 10 | ACWR danger, déconditionnement, décharge prévue, fatigue RPE, fréquence insuffisante |
| Nutrition | 8 | Déficit agressif, protéines faibles, lipides bas, fibres insuffisantes |
| Anthropo | 5 | Perte rapide, gain rapide, WHtR élevé, absence de mesure > 21j |
| Sommeil | 1 | Durée moyenne insuffisante |
| Cross-domaines | 2 | Sommeil + entraînement, underfueled training |

Chaque règle définit : signal(s) source, fenêtre temporelle, seuil(s), message d'assessment, forecast optionnel (ex: décharge dans N jours). Le moteur calcule des `avg`, `count`, `ratio`, `latest` sur les données brutes SQLite — aucune inférence probabiliste, aucun modèle LLM.

### Q4.2 — Fréquence des rapports

- [x] **En temps réel (déclenché à chaque événement métier)**

Le Coach est **event-driven** (`src/modules/coach/api.ts`). Il se déclenche sur :
`workout.completed` · `meal.logged` · `measurement.recorded` · `day.ended`

Un run complet analyse les signaux pertinents, persiste l'assessment dans SQLite (`coach.assessment.YYYY-MM-DD`), puis émet `coach.assessment.ready` pour rafraîchir l'UI. Il ne tourne pas selon un timer périodique.

- [ ] Une fois par jour
- [ ] Bilan hebdomadaire

> **Bilan hebdomadaire** : présent dans `NutritionScreen` (onglet "Bilan") — généré à la demande sur la semaine glissante, indépendamment du Coach engine.

### Q4.3 — Profondeur d'analyse pour les tendances long terme

Les fenêtres temporelles par règle vont de **1 à 42 jours** :

| Fenêtre | Usage |
|---|---|
| 1 jour | Lipides, fibres, protéines du jour |
| 2 jours | Repos minimum entre séances |
| 5–7 jours | Fréquence d'entraînement, RPE moyen, kcal moyen |
| 14 jours | Durée sommeil, charge RPE |
| 21 jours | Fréquence de mesures anthropo |
| 28 jours | ACWR (ratio charge aiguë/chronique — Gabbett 2016) |
| 42 jours | Déconditionnement (6 semaines sans séance) |

Les analytics graphiques (PerformanceTab, RecoveryTab) utilisent des fenêtres plus larges : **90 jours** pour les 1RM, **8 semaines** pour le tonnage. Il n'y a pas de calcul sur plus de 90 jours dans la version actuelle — pertinent sur 6 à 18 mois d'utilisation, à affiner si l'utilisateur accumule plusieurs années de données.

---

## 6. Pilier 5 : Priorités UX & Parcours Utilisateur

### Q5.1 — Classement des fonctionnalités par fréquence d'utilisation

Classement basé sur la structure de navigation et les données seed (185 jours) :

| Rang | Module | Fréquence cible | Nb entrées seed / 185j |
|---|---|---|---|
| 1 | **Nutrition** (saisie repas) | Plusieurs fois/jour | 925 repas (5,0/jour) |
| 2 | **Planning** (tâches / agenda) | 1–3 fois/jour | 270 plannings + 60 tâches |
| 3 | **Sport** (suivi séances) | 4–5 fois/semaine | 143 séances |
| 4 | **Analyses & Graphiques** | 1–2 fois/semaine | Lecture seule |

> Photos d'évolution (non implémentées) : 1 fois/semaine estimé, mais volume de données disproportionné — nécessite une strate de stockage dédiée avant tout développement.

### Q5.2 — Design System & Mode Sombre

**Mode sombre obligatoire — pas de mode clair.**

- Palette : CSS custom properties `var(--color-awan-*)` — gold (`#D4AF37`), surfaces sombres, statuts colorés (ok/warn/error/spirit/info)
- Polices : `var(--font-sans)` et `var(--font-mono)` — classes `font-mono` sur toutes les valeurs numériques pour lecture précise sous forte luminosité
- Typographie : toutes les étiquettes en `UPPERCASE` + `tracking-widest` — lisibilité maximale en environnement gym (éclairage indirect, écran en main)
- Couleur dominante or/dark : contraste élevé adapté aux écrans AMOLED (pixels noirs = pixels éteints → économie batterie)
- Aucun thème clair prévu dans le code actuel

---

## 7. Zone de Réponses Libres — Spécificités Métier et Contraintes d'Usage

### 7.1 — Contrainte de quota 10 Mo et évolutivité

Le quota actuel (`MAX_DB_BYTES = 10 Mo`) est conçu pour les données structurées (texte/JSON). À 185 jours de seed, la base occupe **~0,01 Mo** sur l'appareil de test. En usage réel intensif (5 repas/j + 5 séances/sem + mesures hebdo), la base atteindra ~1–2 Mo après 2 ans — loin du quota.

Les photos d'évolution physique (Pilier 3) nécessiteront **un compartiment de stockage séparé** (Capacitor Filesystem ou objet blob hors SQLite) avec son propre quota — la limite de 10 Mo ne doit pas s'appliquer aux binaires.

### 7.2 — Calculs analytics sur thread principal

Risque documenté : les calculs de charts (ACWR, tonnage 8 semaines, 1RM trend) sont synchrones sur le JS thread de la WebView. Sur des datasets > 500 séances, un jank de navigation pourrait apparaître. Mitigation planifiée : Web Worker dédié pour les analyses lourdes (non implémenté à ce jour).

### 7.3 — Identité de l'application

AWAN est un tracker de vie systémique personnel — **non un coach IA, non un réseau social**. La devise fondatrice : *"L'avenir s'esquisse en encrant aujourd'hui dans les lignes du passé."* L'application ne collecte, ne transmet et ne partage aucune donnée utilisateur. Tout est local, privé, chiffrable (SQLite encryption v6 planifiée). L'intégration islamique (prières, journal spirituel) est un pilier de premier ordre, non une fonctionnalité optionnelle.

---

## 8. Fichiers de Référence

| Fichier | Sujet |
|---|---|
| `public/data/foods.json` | Base alimentaire (578 items, 73 Ko) |
| `public/data/exercises.json` | Bibliothèque exercices (873 items, 335 Ko) |
| `src/data/schemas/nutrition/mealEntry.ts` | Schéma entrée repas granulaire |
| `src/data/schemas/sport/exerciseSet.ts` | Schéma série (V2 : prévu vs réel, RIR, RPE) |
| `src/data/schemas/sport/routine.ts` | Schéma session + agrégats |
| `src/modules/coach/rules/*.json` | 26 règles Coach (JSON, seuils justifiés) |
| `src/modules/coach/engine/analyzer.ts` | Moteur d'analyse (avg, count, ratio, latest) |
| `src/services/mediaCacheService.ts` | Cache images exercices (LRU) |
| `src/utils/nutritionData.ts` | Fonctions food DB + getFoodByBarcode() |
| `src/screens/SportScreen.tsx` | Timer session + ChronoOverlay |

---

*Document généré le 2026-06-04 — basé sur audit codebase `/home/user/awan-app`, commit `ca2652c` (branch `main`).*
