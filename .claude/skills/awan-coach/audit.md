# Audit AWAN — Données & Features manquantes

Référence scientifique dans `science.md`. Format des règles Coach dans `src/modules/coach/rules/*.json`.

---

## 🔴 CRITIQUE — Bloquent des règles Coach essentielles

### 1. Log poids quotidien
**Manque :** Aucun écran ni service pour saisir le poids corporel au quotidien.
**Impact :** Impossible de calculer la moyenne 7j (seul indicateur fiable de tendance composition corporelle — Israetel 2019), d'estimer le BF% via formule Navy, de détecter une perte/prise trop rapide.
**Règles Coach bloquées :** `anthropo.perte_rapide`, `anthropo.weight_gain_rapid` (existent mais sans signal fiable), toute règle de recomposition.
**Implémentation :**
```
Pattern  : src/services/sleepService.ts (CRUD simple par date)
Schéma   : src/data/schemas/body/weightEntry.ts
  { v:1, id, date, weightKg, note? }
Service  : src/services/weightService.ts
Hook     : src/hooks/useWeightStore.ts
Écran    : Intégrer dans src/screens/MensurationScreen.tsx (section "POIDS")
Règle    : sport.deconditioning lit déjà workoutLog — weight peut même logique
```

### 2. Tour de cou (mensuration manquante)
**Manque :** `MensurationScreen` n'inclut pas le tour de cou.
**Impact :** Formule Navy BF% impossible sans cette mesure (requiert taille + cou + hauteur).
**Implémentation :**
```
Fichier  : src/screens/MensurationScreen.tsx + schéma mensurations
Ajout    : champ `neckCm` dans MeasurementEntry
Calcul   : BF% Navy auto-calculé si taille + cou + hauteur présents
Affichage: carte BF% dans MensurationScreen avec jalon visuel (23% → couleur)
```

### 3. Volume par groupe musculaire / semaine
**Manque :** Les séances sont loguées mais le volume par groupe musculaire n'est pas calculé ni comparé aux landmarks MEV/MAV/MRV.
**Impact :** Coach ne peut pas détecter sous-stimulation (< MEV) ou surmenage (> MRV).
**Règles Coach bloquées :** Aucune règle volume-groupe n'existe → gap majeur.
**Implémentation :**
```
Service  : src/services/workoutService.ts — ajouter getWeeklyVolumeByMuscle(week)
  → lire workoutSession.exercises[].muscleGroups + sets
Règles à créer :
  sport.volume_below_mev.json  → signal volume groupe < MEV → severity warn
  sport.volume_above_mrv.json  → signal volume groupe > MRV → severity alert
Affichage: barres MEV/MAV dans SportScreen (cf. tableau science.md § 4)
```

### 4. Score de récupération subjectif
**Manque :** Aucun champ récupération dans les séances ni en standalone.
**Impact :** Règle `cross.sleep_workout` partiellement aveugle — elle lit le sommeil mais pas la fatigue perçue. Impossible d'appliquer le protocole Halson (score < 6 → réduire volume).
**Implémentation :**
```
Intégrer dans : src/screens/SportScreen.tsx
  → widget "RÉCUPÉRATION" 1–10 au lancement de séance (avant les exercices)
  → persisté dans workoutSession.recoveryScore
Règle à créer :
  sport.low_recovery.json
  { signal: workoutSession.recoveryScore, condition: lt 6, severity: alert }
```

---

## 🟡 IMPORTANT — Limitent la pertinence moyen terme

### 5. Moyenne poids 7 jours
**Manque :** Même si le log poids est créé (gap #1), la moyenne glissante 7j n'est pas calculée ni affichée.
**Impact :** Poids quotidien seul = signal bruité (eau, glycogène). La tendance 7j est le seul indicateur fiable de direction composition.
**Implémentation :**
```
Service  : weightService.getAvg7d(date) → moyenne des 7 derniers jours
Affichage: MensurationScreen + DashboardScreen (widget POIDS avec ↑↓→)
Format   : "Poids 7j : 82,4 kg → (↓0,3 kg vs sem précédente)"
```

### 6. Tracking 1RM par mouvement
**Manque :** La formule Epley existe dans `src/constants/app.ts` mais aucun historique de 1RM estimé par exercice n'est stocké ni affiché.
**Impact :** Impossible de détecter stagnation de force (`sport.stagnation_charge` existe mais sans données historiques 1RM par exercice).
**Implémentation :**
```
Service  : workoutService.get1RMHistory(exerciseId) → [{date, estimated1RM}]
Affichage: courbe 1RM dans SportScreen → vue exercice
Règle    : sport.stagnation_charge.json → améliorer avec signal 1RM
```

### 7. Adhérence nutrition (%)
**Manque :** NutritionScreen log les repas mais ne calcule pas le % d'adhérence aux objectifs hebdomadaires.
**Impact :** Coach ne peut pas distinguer un jour de dépassement ponctuel d'une mauvaise adhérence chronique.
**Règle à créer :**
```
nutrition.adherence_low.json
  signal : moyenne 7j protéines < 80% objectif
  condition : lt 0,80
  severity : warn
```

### 8. Phase mésocycle persistée
**Manque :** Aucun concept de phase/mésocycle dans le storage AWAN.
**Impact :** Le Coach ne sait pas en quelle semaine de mésocycle on est → impossible de déclencher la règle décharge au bon moment.
**Implémentation :**
```
Storage  : awan.periodization.current → { phase: 0|1|2, mesoWeek: 1–6, startDate }
Service  : src/services/periodizationService.ts
  getCurrentPhase() · getCurrentMesoWeek() · triggerDeload()
Règle à créer :
  sport.deload_due.json
  signal : periodization.mesoWeek ≥ 6, severity : warn
```

### 9. Macros complets (lipides + glucides)
**Manque :** NutritionScreen track calories + protéines mais pas lipides + glucides + fibres.
**Impact :** Impossible de vérifier ratio hormonal (lipides min 0,7 g/kg) ni timing glucides autour entraînement.
**Règle à créer :**
```
nutrition.fat_low.json
  signal : sum lipides jour < 0,5 g/kg (41 g pour 82 kg)
  condition : lt 41
  severity : warn
  source : Hamalainen 1984 (testostérone + lipides)
```

---

## 🟢 OPTIMISATION — Valeur long terme

### 10. FFMI calculé & affiché
**Manque :** Non calculé dans MensurationScreen malgré formule simple (LBM / hauteur²).
**Valeur :** Indicateur de progression long terme + plafond naturel (25,0 — Kouri 1995).
**Implémentation :**
```
Ajouter dans : src/screens/MensurationScreen.tsx
  FFMI = LBM / (hauteur_m)²
  Afficher avec jalon : "19,7 → plafond naturel 25,0 (+5,3 points = ~17 kg LBM possible)"
```

### 11. WHR & WHtR automatiques
**Manque :** Tour de taille et hanches sont loggés mais les ratios santé ne sont pas calculés.
**Valeur :** WHtR < 0,50 = meilleur prédicteur mortalité cardiovasculaire (supérieur au BMI).
**Implémentation :**
```
Calculs directs depuis mensurations existantes :
  WHR  = waistCm / hipCm        → cible < 0,90
  WHtR = waistCm / heightCm     → cible < 0,50
Afficher dans MensurationScreen avec code couleur vert/ambre/rouge
```

### 12. Projection composition corporelle
**Manque :** Aucune projection "dans X mois à ce rythme".
**Valeur :** Motivation + détection précoce de stagnation.
**Implémentation :**
```
Calcul : (BF% actuel − BF% cible) / rythme_mensuel = mois restants
Afficher dans MensurationScreen ou AnalyseScreen
```

### 13. Timing nutriments autour entraînement
**Manque :** NutritionScreen ne relie pas les repas aux séances du jour.
**Valeur :** Vérifier fenêtre pré/post 2h (Aragon & Schoenfeld 2013).
**Règle à créer :**
```
nutrition.no_postworkout_protein.json
  signal  : séance loguée + protéines ingérées dans les 2h post = 0
  severity: warn
  message : "Aucun apport protéique dans les 2h post-séance"
```

---

## Règles Coach manquantes — à créer en priorité

| Priorité | ID règle | Signal requis | Seuil | Severity |
|---|---|---|---|---|
| 🔴 | `sport.volume_below_mev` | Volume groupe/sem | < MEV par groupe | warn |
| 🔴 | `sport.volume_above_mrv` | Volume groupe/sem | > MRV par groupe | alert |
| 🔴 | `sport.low_recovery` | recoveryScore séance | < 6 | alert |
| 🟡 | `sport.deload_due` | mesoWeek | ≥ 6 | warn |
| 🟡 | `nutrition.fat_low` | sum lipides/j | < 41 g (0,5 g/kg) | warn |
| 🟡 | `nutrition.adherence_low` | avg 7j protéines | < 80% objectif | warn |
| 🟡 | `nutrition.no_postworkout_protein` | post-séance 2h | 0 g protéines | warn |
| 🟢 | `anthropo.ffmi_stagnation` | FFMI mensuel | Δ < 0,1 sur 3 mois | info |
| 🟢 | `anthropo.wht_elevated` | WHtR | ≥ 0,50 | warn |

---

## Règles existantes à corriger

### `nutrition.protein_low` — seuil trop bas
```json
Actuel  : "condition": { "op": "lt", "value": 90 }
Problème: 90 g/j = 1,1 g/kg pour 82 kg — en dessous du minimum absolu JISSN (1,4 g/kg)
Correction : value → 131  (1,6 g/kg × 82 kg)
Source  : JISSN Position Stand 2017 (PMC5477153)
```

### `sport.deconditioning` — fenêtre trop courte pour retourneur
```json
Actuel  : window 14 jours sans séance → déconditionnement
Contexte: après 1 an d'arrêt, la règle devrait aussi adapter les conseils au profil retourneur
Ajout   : adviceKey spécifique si lastWorkout > 90 jours ("muscle memory protocol")
```
