# AWAN — Inventaire des calculs (Sport, Nutrition, Anthropométrie, Santé)

> Référence exhaustive des formules, seuils et règles Coach actuellement implémentés.
> Chaque entrée porte : fonction, fichier, formule, citation, statut (`OK` / `MANQUE`).

---

## 1. SPORT (musculation, volume, intensité, progression)

### 1.1 — Estimation 1RM (moyenne pondérée 3 formules)
- **Fonction :** `oneRmEstimate()` — `src/services/workoutAnalysisService.ts:7`
- **Formule :** `1RM = 0.4·Brzycki + 0.35·Epley + 0.25·O'Conner`
  - Brzycki : `w / (1.0278 − 0.0278·reps)`
  - Epley : `w · (1 + reps/30)`
  - O'Conner : `w · (1 + 0.025·reps)`
- **Réfs :** Brzycki 1993, Epley 1985, O'Conner 1989
- **Statut :** OK

### 1.2 — Densité de séance (kg·reps/min)
- **Fonction :** `sessionDensity()` — `workoutAnalysisService.ts:24`
- **Formule :** `density = totalWorkingVolume / activeMinutes`
  - `activeMinutes = (endTime − startTime − ΣrestSec) / 60`
- **Statut :** OK

### 1.3 — Volume hebdo par muscle (avec coefficient 0.5 pour secondaires)
- **Fonction :** `WorkoutService.getWeeklyVolumeByMuscle()`
- **Formule :** `volume[m] = card(primaryMuscle == m) + 0.5 · card(secondaryMuscle == m)`
- **Statut :** OK

### 1.4 — Adhérence planifié / réel
- **Fonction :** `sessionAdherence()` — `workoutAnalysisService.ts:67`
- **Formule :** `adherence = min(1.0, realVolume / plannedVolume)`
- **Statut :** OK (depuis ExerciseSetV2 avec `plannedWeightKg`/`plannedReps`)

### 1.5 — Note de séance 0–100
- **Fonction :** `sessionScoreService.scoreSession()` — `sessionScoreService.ts:12`
- **Formule (somme bornée 100) :**
  - Adhérence volume : 30 pts (ratio 0–1)
  - Intensité RPE (6–8 = optimal) : 25 pts max
  - Feeling (1–5 normé) : 20 pts
  - Complétude (exos ≥ 1 set fait) : 15 pts
  - Flag PR (`weight > plannedWeight · 1.025`) : 10 pts
- **Statut :** OK

### 1.6 — Note de cycle 0–100 (fenêtre 4 semaines glissantes)
- **Fonction :** `cycleScoreService.computeCycleScore()` — `cycleScoreService.ts:30`
- **Formule :**
  - Adhérence (≥0.85 optimal) : 20 pts
  - Fréquence (4–5×/sem = 20, 3 = 16, 2 = 12, 1 = 6) : 20 pts max
  - Progression (ratio vol last/first sem) : 20 pts max
  - Pénalité plateau (3 sem consécutives Δvol < 3%) : 0–15 pts
  - Récupération (feeling moyen ≥ 4) : 15 pts max
  - Consistance (semaines vides) : 10 pts max
- **Réfs :** Helms 2018, Schoenfeld 2016 (`10.1519/JSC.0000000000001272`), Halson 2014 (`10.1007/s40279-014-0253-z`)
- **Statut :** OK

### 1.7 — Auto-progression (suggestion de charge)
- **Fonction :** `autoProgressionService.suggestProgression()` — `autoProgressionService.ts:47`
- **Formule :**
  - RIR ≥ 2 → `+2.5%` (compound) ou `+1%` (isolation)
  - RIR ≤ 1 & reps non atteintes → `−2.5%`
  - Plateau (3+ sessions ±1kg) → `×0.70` (deload)
- **Réf :** Helms 2016 (`10.1519/SSC.0000000000000218`)
- **Statut :** OK

### 1.8 — Allocation MEV / MAV / MRV par muscle
- **Fonction :** `volumeAllocator.allocateSetsPerMuscle()` — `modules/coach/routine-generator/volumeAllocator.ts:4`
- **Constantes :** `src/constants/volumeLandmarks.ts`
- **Formule :**
  - Hypertrophie → `MAV[1]` (haut de fourchette)
  - Force → `MEV + 0.5·(MAV[0] − MEV)`
  - Endurance → `MAV[0]`
  - Recomp → `(MEV + MAV[1]) / 2`
- **Réf :** Renaissance Periodization « Volume Bible 2020 »
- **Statut :** OK

### 1.9 — ACWR (Acute:Chronic Workload Ratio)
- **Règle :** `sport.acwr_danger.json`
- **Formule :** `ACWR = RPE_moyen_7j / RPE_moyen_28j` — alerte si > 1.5
- **Réf :** Gabbett 2015 (`10.1136/bjsports-2015-095788`)
- **Statut :** OK (règle)

### 1.10 — Détection plateau de charge
- **Règle :** `sport.stagnation_charge.json`
- **Formule :** `weight_trend_21d ≤ 0`
- **Statut :** OK (règle)

### 1.11 — FFMI velocity (ΔFFMI/mois sur 3 mois)
- **Formule :** `FFMI_velocity = (FFMI[t] − FFMI[t−90j]) / 3`
- **Statut :** **MANQUE** (spec'd, pas codé)

### 1.12 — Heatmap volume + jumeau numérique 12 sem
- **Composant prévu :** `BodySvg` mode `heatmap` / `twin`
- **Statut :** **MANQUE** (component extrait, intégration UI absente)

---

## 2. NUTRITION (TDEE, macros, micros, score, hydratation)

### 2.1 — BMR (Mifflin-St Jeor)
- **Fonction :** `NutritionService.calculateBMR()` — `nutritionService.ts:37`
- **Formule :**
  - H : `10·kg + 6.25·cm − 5·age + 5`
  - F : `10·kg + 6.25·cm − 5·age − 161`
- **Statut :** OK

### 2.2 — TDEE (multiplicateur d'activité)
- **Fonction :** `NutritionService.calculateTDEE()`
- **Formule :** `TDEE = BMR · k`
  - Sédentaire 1.2 / Léger 1.375 / Modéré 1.55 / Actif 1.725 / Très actif 1.9
- **Statut :** OK

### 2.3 — TDEE adaptatif hebdomadaire (recalibration data-driven)
- **Fonction :** `estimateAdaptiveTDEE()` — `tdeeAdaptiveService.ts:47`
- **Formule :**
  - `slope_g/jour = régression(date, poids_g) sur 14j`
  - `TDEE_estimé = intake_moyen − (slope · 7.7 kcal/g)`
  - Clamp ±40 % autour du baseTDEE
  - Confiance : low (< 10 j) / med (10–13 j) / high (≥ 14 j)
- **Réf :** Thomas 2014 (`10.1016/j.jand.2014.02.003`)
- **Statut :** OK

### 2.4 — Macros cibles (cut / maintain / bulk)
- **Fonction :** `NutritionService.calculateTargetMacros()` — `nutritionService.ts:49`
- **Formule :**
  - kcal : `TDEE − 500` / `TDEE` / `TDEE + 300`
  - P (g) : `kg · {2.4 cut / 2.0 main / 1.8 bulk}`
  - F (g) : `kcal · 0.25 / 9`
  - C (g) : `(kcal − 4·P − 9·F) / 4` (min 50 g)
- **Statut :** OK

### 2.5 — Cible hydratation
- **Fonction :** `WaterService.targetMl()` — `waterService.ts:51`
- **Formule :** `target_mL = poids_kg · 35`
- **Statut :** OK

### 2.6 — Nutrition score par repas 0–100
- **Fonction :** `nutritionScoreService.scoreMeal()` — `nutritionScoreService.ts:28`
- **Formule (somme bornée 100) :**
  - Adhérence quantité : 40 pts (kcal ±20 % cible → linéaire jusqu'à 0 à ±50 %)
  - Densité protéique : 20 pts (g/100 kcal, opt = 10)
  - Densité fibres : 20 pts (g/100 kcal, opt = 4)
  - Qualité lipides : 10 pts (% kcal lipides optimal 20–35 %)
  - Qualité source : 10 pts (db = 10, custom = 8, quick = 5)
  - Capage protéique : si P < 70 % cible → bonus quantité réduit
- **Statut :** OK

### 2.7 — Bilan hebdo nutrition (moyennes glissantes)
- **Fonction :** `buildWeeklyNutritionReport()` — `weeklyNutritionReport.ts:44`
- **Formule :**
  - `avg = Σ(field) / jours_loggés`
  - Adhérence : `avgKcal / targetKcal`, `avgP / targetP`
  - Diagnostic verbal selon seuils (< 85 % kcal, < 80 % P, < 20 g fibre, < 5 j logged)
- **Statut :** OK

### 2.8 — Seuils RDA Coach (règles)
| Règle | Seuil | Réf |
|---|---|---|
| `nutrition.protein_low` | P/j ≥ 131 g (≈ 1.8 g/kg) | WHO RDA |
| `nutrition.fiber_low` | Fibres/j ≥ 25 g | EFSA 2010 |
| `nutrition.fat_low` | Lipides/j ≥ 74 g | `10.1007/BF01068325` |
| `nutrition.deficit_agressif` | kcal_7j < 1200 | risque perte muscle |
| `nutrition.tdee_surplus` | kcal_7j > 2800 | surplus excessif |
| `nutrition.meal_regularity` | kcal_moy_repas < 500 | repas trop petits |
| `nutrition.periworkout_protein` | P séance ≥ 30 g | `10.3945/jn.108.103382` |
- **Statut :** OK (règles seuils chargées par le moteur Coach)

### 2.9 — Micronutriments RDA priorité 1 (Vit D, B12, B9, C, Fe, Mg, Zn, Ca, Na, K)
- **Statut :** **MANQUE** (schéma placeholder, pas de calcul ni catalogue enrichi)

### 2.10 — Custom recipes (calcul auto macros depuis ingrédients)
- **Statut :** **MANQUE** (schéma `CustomRecipeV1` prévu, UI `RecipeEditorView` absente)

### 2.11 — Détection déficiences micros (moyenne 14j < 70 % RDA)
- **Statut :** **MANQUE** (dépend de 2.9)

---

## 3. ANTHROPOMÉTRIE (BF%, FFMI, indices, symétrie)

### 3.1 — IMC
- **Fonction :** `BiometricsService.imc()` — `biometricsService.ts:145`
- **Formule :** `IMC = kg / m²`
- **Statut :** OK

### 3.2 — WHtR (Waist-to-Height Ratio)
- **Fonction :** `BiometricsService.whtr()` — `biometricsService.ts:169`
- **Formule :** `WHtR = taille_taille_cm / taille_cm`
- **Seuil santé :** `≥ 0.50` = risque cardiométabolique
- **Réf :** `10.1079/PNS2012/00099`
- **Statut :** OK

### 3.3 — Body Fat % Jackson-Pollock 3 sites (H)
- **Fonction :** `jacksonPollock3Men()` — `biometricsService.ts:35`
- **Formule :**
  - `density = 1.10938 − 0.0008267·Σ3 + 0.0000016·Σ3² − 0.0002574·age`
  - `BF% = 495/density − 450` (Siri)
- **Sites :** poitrine, abdomen, cuisse
- **Réf :** Jackson & Pollock 1978 (`10.1079/bjn19780078`)
- **Statut :** OK

### 3.4 — Body Fat % Jackson-Pollock 3 sites (F)
- **Fonction :** `jacksonPollock3Women()` — `biometricsService.ts:41`
- **Formule :** `density = 1.0994921 − 0.0009929·Σ3 + 0.0000023·Σ3² − 0.0001392·age` → Siri
- **Sites :** triceps, supra-iliaque, cuisse
- **Statut :** OK

### 3.5 — Body Fat % Jackson-Pollock 7 sites (H/F)
- **Fonction :** `jacksonPollock7()` — `biometricsService.ts:52`
- **Formule (H) :** `density = 1.112 − 0.00043499·Σ7 + 0.00000055·Σ7² − 0.00028826·age`
- **Formule (F) :** `density = 1.097 − 0.00046971·Σ7 + 0.00000056·Σ7² − 0.00012828·age`
- **Sites :** poitrine, axillaire, triceps, sous-scap, abdo, supra-iliaque, cuisse
- **Statut :** OK

### 3.6 — Body Fat % Durnin-Womersley 4 sites (stratifié par âge)
- **Fonction :** `durninWomersley4()` — `biometricsService.ts:78`
- **Formule :** régression log10 par tranche d'âge (7 brackets H, 7 F) → Siri
- **Sites :** biceps, triceps, sous-scap, supra-iliaque
- **Réf :** Durnin & Womersley 1974 (`10.1079/bjn19740060`)
- **Statut :** OK

### 3.7 — Body Fat % US Navy (Hodgdon-Beckett)
- **Fonction :** `navyBFPct()` — `biometricsService.ts:111`
- **Formule (H) :** `BF% = 495/(1.0324 − 0.19077·log₁₀(taille_cou) + 0.15456·log₁₀(taille)) − 450`
- **Formule (F) :** `BF% = 495/(1.29579 − 0.35004·log₁₀(taille+hanche−cou) + 0.22100·log₁₀(taille)) − 450`
- **Réf :** Hodgdon & Beckett 1984
- **Statut :** OK

### 3.8 — FFMI normalisé (Kouri)
- **Fonction :** `ffmiNormalized()` — `biometricsService.ts:156`
- **Formule :**
  - `LBM = poids · (1 − BF%/100)`
  - `rawFFMI = LBM / m²`
  - H : `FFMI = rawFFMI + 6.1·(1.80 − m)`
  - F : `FFMI = rawFFMI + 6.1·0.81·(1.80 − m)`
- **Réf :** Kouri 1995 (`10.1097/00042752-199510000-00009`)
- **Statut :** OK

### 3.9 — Fourchette de confiance BF% (multi-méthodes)
- **Statut :** **MANQUE** (spec : `bfPctFork.ts` retourne min–max entre Navy/JP3/JP7/Durnin)

### 3.10 — Symétrie L/R
- **Fonction :** `measureSymmetry()` / `analyzeSymmetry()` — `symmetryService.ts:14`
- **Formule :** `asym% = |L − R| / max(L, R) · 100` — alerte si > 5 %
- **Réf :** Bishop 2018 (`10.1519/JSC.0000000000002578`)
- **Statut :** OK (calcul) — **MANQUE** : double inputs L/R dans `MensurationScreen`

### 3.11 — Heatmap normalisation asymétrie
- **Fonction :** `asymmetryToHeatmapValue()` — `symmetryService.ts:47`
- **Formule :** `heatmap = min(1, diff% / 10)` (0 % → 0.0, 5 % → 0.5, ≥10 % → 1.0)
- **Statut :** OK (calcul) — **MANQUE** : intégration `BodySvg`

### 3.12 — Tendances poids (alertes Coach)
| Règle | Seuil |
|---|---|
| `anthropo.weight_gain_rapid` | trend_14j > +1 kg/sem |
| `anthropo.weight_gain_trend` | trend_14j > +0.15 kg/sem |
| `anthropo.perte_rapide` | trend_7j < −1 kg/sem |
| `anthropo.no_measurement_21d` | aucune mesure depuis 21 j |
- **Statut :** OK (règles)

### 3.13 — ISAK Skinfolds 8 sites (UI réelle)
- **Fonction :** `updateSkinfold()` mentionnée mais non câblée
- **Statut :** **MANQUE** (anti-pattern à corriger)

### 3.14 — FFMI velocity 3 mois (détection plateau)
- **Formule :** `ΔFFMI / mois` sur fenêtre 90 j
- **Statut :** **MANQUE**

---

## 4. SANTÉ / RÉCUPÉRATION (sommeil, RPE, fatigue)

### 4.1 — Sommeil moyen (alerte courte durée)
- **Règle :** `sleep.short_avg.json`
- **Formule :** `sleep_moyen_7j < 6h`
- **Statut :** OK (règle)

### 4.2 — Interaction sommeil × charge entraînement
- **Règle :** `cross.sleep_workout.json`
- **Formule :** `sleep_moyen_14j < 7h ET densité_entraînement_haute`
- **Statut :** OK (règle)

### 4.3 — Score récupération depuis feeling
- **Embed :** `cycleScoreService.ts:97`
- **Formule :** `recovery_pts = 15 · min(1, feeling_moy / 4)`
- **Statut :** OK

### 4.4 — Alerte faible récupération
- **Règle :** `sport.low_recovery.json`
- **Formule :** `recoveryScore < 6` sur les 3 derniers jours
- **Statut :** OK (règle)

### 4.5 — Accumulation fatigue (RPE)
- **Règle :** `sport.fatigue_rpe.json`
- **Formule :** `RPE_moyen_14j > 8`
- **Statut :** OK (règle)

### 4.6 — Deload due (volume cumulé 6 sem)
- **Règle :** `sport.deload_due.json`
- **Formule :** `sessions_42j ≥ 18`
- **Réf :** `10.1519/SSC.0000000000000247`
- **Statut :** OK (règle)

### 4.7 — Déconditionnement (pause prolongée)
- **Règle :** `sport.deconditioning.json`
- **Formule :** `sessions_14j < 1`
- **Statut :** OK (règle)

### 4.8 — Repos insuffisant entre séances
- **Règle :** `sport.insufficient_rest_48h.json`
- **Formule :** `sessions_2j > 2`
- **Réf :** `10.1007/s00421-003-0879-y`
- **Statut :** OK (règle)

### 4.9 — Jours consécutifs (alerte NSCA)
- **Règle :** `sport.consecutive_days.json`
- **Formule :** `workouts_5j ≥ 5`
- **Statut :** OK (règle)

### 4.10 — Fréquence insuffisante OMS
- **Règle :** `sport.insufficient_frequency.json`
- **Formule :** `sessions_21j < 6` (< 2/sem)
- **Statut :** OK (règle)

### 4.11 — Aucun entraînement 7 jours
- **Règle :** `sport.no_workout_7d.json`
- **Statut :** OK (règle)

### 4.12 — Cross : entraînement sous-alimenté
- **Règle :** `cross.underfueled_training.json`
- **Formule :** `kcal_7j < 1500 ET sessions_7j ≥ 2`
- **Réf :** Trexler 2014
- **Statut :** OK (règle)

---

## 5. RÉSUMÉ COUVERTURE

| Module | Calculs codés | Règles Coach | Manques principaux |
|---|---|---|---|
| Sport | 8 | 12 | FFMI velocity, heatmap UI, knowledge JSON 8 fichiers |
| Nutrition | 7 | 8 | Micros RDA, custom recipes, déficiences |
| Anthropo | 11 | 5 | BF% fork, ISAK UI réelle, L/R inputs, FFMI velocity |
| Santé/Récup | 1 | 11 | — (couverture quasi complète) |
| **TOTAL** | **27 fonctions** | **36 règles** | ~9 chantiers UI/calcul |

**Couverture estimée vs spec :** ~80 %.

---

## 6. CITATIONS PRINCIPALES (auditables)

### Sport / Physiologie
- Jackson & Pollock 1978 — `10.1079/bjn19780078`
- Durnin & Womersley 1974 — `10.1079/bjn19740060`
- Hodgdon & Beckett 1984 — US Navy BF
- Kouri 1995 — `10.1097/00042752-199510000-00009` (FFMI)
- Schoenfeld 2016 — `10.1519/JSC.0000000000001272` (volume/fréquence)
- Helms 2016 — `10.1519/SSC.0000000000000218` (progression)
- Halson 2014 — `10.1007/s40279-014-0253-z` (overtraining)
- Bishop 2018 — `10.1519/JSC.0000000000002578` (asymétrie 5 %)
- Gabbett 2015 — `10.1136/bjsports-2015-095788` (ACWR)

### Nutrition
- Mifflin-St Jeor 1990 — BMR
- Thomas 2014 — `10.1016/j.jand.2014.02.003` (TDEE adaptatif)
- Cribb & Hayes 2006 — `10.3945/jn.108.103382` (péri-séance)
- EFSA 2010 — fibres 25 g (`efsa.2010.1462`)

### Anthropométrie
- Grant 2012 — `10.1079/PNS2012/00099` (WHtR)
- Siri 1961 — conversion densité ↔ BF%

---

> **Mise à jour :** 2026-05-23. Régénérer ce doc après chaque sprint ajoutant règles ou calculs.
